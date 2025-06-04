import {
	AST,
	TmplAstNode,
	parseTemplate,
	BindingPipe,
	LiteralPrimitive,
	Conditional,
	Binary,
	LiteralMap,
	LiteralArray,
	Interpolation,
	Call,
	TmplAstIfBlock,
	TmplAstSwitchBlock,
	TmplAstDeferredBlock,
	TmplAstForLoopBlock,
	TmplAstElement,
	KeyedRead,
	ASTWithSource,
	ParenthesizedExpression,
} from '@angular/compiler';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { isPathAngularComponent, extractComponentInlineTemplate } from '../utils/utils.js';

export const TRANSLATE_PIPE_NAMES = ['translate', 'marker'];

function traverseAstNodes<RESULT, NODE extends TmplAstNode | TmplAstElement>(
	nodes: (NODE | null)[],
	visitor: (node: NODE) => RESULT[],
	accumulator: RESULT[] = []
): RESULT[] {
	for (const node of nodes) {
		if (node) {
			traverseAstNode(node, visitor, accumulator);
		}
	}

	return accumulator;
}

function traverseAstNode<RESULT, NODE extends TmplAstNode | TmplAstElement>(
	node: NODE,
	visitor: (node: NODE) => RESULT[],
	accumulator: RESULT[] = []
): RESULT[] {
	accumulator.push(...visitor(node));

	const children: TmplAstNode[] = [];
	// children of templates, html elements or blocks
	if ('children' in node && node.children) {
		children.push(...node.children);
	}

	// contents of @for extra sibling block @empty
	if (node instanceof TmplAstForLoopBlock) {
		children.push(node.empty);
	}

	// contents of @defer extra sibling blocks @error, @placeholder and @loading
	if (node instanceof TmplAstDeferredBlock) {
		children.push(node.error);
		children.push(node.loading);
		children.push(node.placeholder);
	}

	// contents of @if and @else (ignoring the @if(...) condition statement though)
	if (node instanceof TmplAstIfBlock) {
		children.push(...node.branches.flatMap((inner) => inner.children));
	}

	// contents of @case blocks (ignoring the @switch(...) statement though)
	if (node instanceof TmplAstSwitchBlock) {
		children.push(...node.cases.flatMap((inner) => inner.children));
	}

	return traverseAstNodes(children, visitor, accumulator);
}

export class PipeParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection {
		if (filePath && isPathAngularComponent(filePath)) {
			source = extractComponentInlineTemplate(source);
		}

		let collection: TranslationCollection = new TranslationCollection();
		const nodes: TmplAstNode[] = this.parseTemplate(source, filePath);

		const pipes = traverseAstNodes(nodes, (node) => this.findPipesInNode(node));

		pipes.forEach((pipe) => {
			this.parseTranslationKeysFromPipe(pipe).forEach((key) => {
				collection = collection.add(key, '', filePath);
			});
		});
		return collection;
	}

	protected findPipesInNode(node: TmplAstNode): BindingPipe[] {
		const ret: BindingPipe[] = [];

		if ('value' in node && node.value instanceof ASTWithSource) {
			ret.push(...this.getTranslatablesFromAst(node.value.ast));
		}

		if ('attributes' in node && Array.isArray(node.attributes)) {
			const translatableAttributes = node.attributes.filter((attr) => TRANSLATE_PIPE_NAMES.includes(attr.name));
			ret.push(...ret, ...translatableAttributes);
		}

		if ('inputs' in node && Array.isArray(node.inputs)) {
			node.inputs.forEach((input) => {
				// <element [attrib]="'identifier' | translate">
				if (input.value instanceof ASTWithSource) {
					ret.push(...this.getTranslatablesFromAst(input.value.ast));
				}
			});
		}

		if ('templateAttrs' in node && Array.isArray(node.templateAttrs)) {
			node.templateAttrs.forEach((attr) => {
				// <element *directive="'identifier' | translate">
				if (attr.value instanceof ASTWithSource) {
					ret.push(...this.getTranslatablesFromAst(attr.value.ast));
				}
			});
		}

		return ret;
	}

	protected parseTranslationKeysFromPipe(pipeContent: AST): string[] {
		const ret: string[] = [];
		if (pipeContent instanceof LiteralPrimitive) {
			ret.push(`${pipeContent.value}`);
		} else if (pipeContent instanceof Conditional) {
			ret.push(...this.parseTranslationKeysFromPipe(pipeContent.trueExp));
			ret.push(...this.parseTranslationKeysFromPipe(pipeContent.falseExp));
		} else if (pipeContent instanceof BindingPipe) {
			ret.push(...this.parseTranslationKeysFromPipe(pipeContent.exp));
		} else if (pipeContent instanceof ParenthesizedExpression) {
			ret.push(...this.parseTranslationKeysFromPipe(pipeContent.expression));
		}
		return ret;
	}

	protected getTranslatablesFromAst(ast: AST): BindingPipe[] {
		if (ast instanceof BindingPipe) {
			// the entire expression is the translate pipe, e.g.:
			// - 'foo' | translate
			// - (condition ? 'foo' : 'bar') | translate
			if (TRANSLATE_PIPE_NAMES.includes(ast.name)) {
				// also visit the pipe arguments - interpolateParams object
				return [ast, ...this.getTranslatablesFromAsts(ast.args)];
			}

			// not the translate pipe - ignore the pipe, visit the expression and arguments, e.g.:
			// - { foo: 'Hello' | translate } | json
			// - value | date: ('mediumDate' | translate)
			return this.getTranslatablesFromAsts([ast.exp, ...ast.args]);
		}

		// angular double curly bracket interpolation, e.g.:
		// - {{ expressions }}
		if (ast instanceof Interpolation) {
			return this.getTranslatablesFromAsts(ast.expressions);
		}

		// ternary operator, e.g.:
		// - condition ? null : ('foo' | translate)
		// - condition ? ('foo' | translate) : null
		if (ast instanceof Conditional) {
			return this.getTranslatablesFromAsts([ast.trueExp, ast.falseExp]);
		}

		// string concatenation, e.g.:
		// - 'foo' + 'bar' + ('baz' | translate)
		if (ast instanceof Binary) {
			if (ast?.left && ast?.right) {
				return this.getTranslatablesFromAsts([ast.left, ast.right]);
			}
		}

		// object - ignore the keys, visit all values, e.g.:
		// - { key1: 'value1' | translate, key2: 'value2' | translate }
		if (ast instanceof LiteralMap) {
			return this.getTranslatablesFromAsts(ast.values);
		}

		// array - visit all its values, e.g.:
		// - [ 'value1' | translate, 'value2' | translate ]
		if (ast instanceof LiteralArray) {
			return this.getTranslatablesFromAsts(ast.expressions);
		}

		if (ast instanceof Call) {
			return this.getTranslatablesFromAsts(ast.args);
		}

		// immediately accessed static object or array - the angular parser bundles this as "KeyedRead", where:
		// { 'a': 1, 'b': 2 }[ 'a' ];
		//                     ^^^ <- keyedRead.key
		// ^^^^^^^^^^^^^^^^^^ <- keyedRead.receiver
		//
		// html examples:
		// - { key1: 'value1' | translate, key2: 'value2' | translate }[key]
		// - [ 'value1' | translate, 'value2' | translate ][key]
		// - [ 'foo', 'bar' ][ 'key' | translate ]
		if (ast instanceof KeyedRead) {
			return this.getTranslatablesFromAsts([ast.receiver, ast.key]);
		}

		if(ast instanceof ParenthesizedExpression) {
			return this.getTranslatablesFromAsts([ast.expression]);
		}

		return [];
	}

	protected getTranslatablesFromAsts(asts: AST[]): BindingPipe[] {
		return this.flatten(asts.map((ast) => this.getTranslatablesFromAst(ast)));
	}

	protected flatten<T extends AST>(array: T[][]): T[] {
		return [].concat(...array);
	}

	protected parseTemplate(template: string, path: string): TmplAstNode[] {
		return parseTemplate(template, path).nodes;
	}
}
