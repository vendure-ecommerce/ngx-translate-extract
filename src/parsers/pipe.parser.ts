import {
	AST,
	TmplAstNode,
	parseTemplate,
	BindingPipe,
	LiteralPrimitive,
	Conditional,
	TmplAstTextAttribute,
	Binary,
	LiteralMap,
	LiteralArray,
	Interpolation,
	Call,
	TmplAstIfBlockBranch,
	TmplAstSwitchBlockCase
} from '@angular/compiler';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { isPathAngularComponent, extractComponentInlineTemplate } from '../utils/utils.js';

export const TRANSLATE_PIPE_NAMES = ['translate', 'marker'];

export class PipeParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection {
		if (filePath && isPathAngularComponent(filePath)) {
			source = extractComponentInlineTemplate(source);
		}

		let collection: TranslationCollection = new TranslationCollection();
		const nodes: TmplAstNode[] = this.parseTemplate(source, filePath);
		const pipes: BindingPipe[] = nodes.map((node) => this.findPipesInNode(node)).flat();
		pipes.forEach((pipe) => {
			this.parseTranslationKeysFromPipe(pipe).forEach((key: string) => {
				collection = collection.add(key, '', filePath);
			});
		});
		return collection;
	}

	protected findPipesInNode(node: any): BindingPipe[] {
		const ret: BindingPipe[] = [];

		const nodeChildren = node?.children ?? [];

		// @if and @switch blocks
		const nodeBranchesOrCases: TmplAstIfBlockBranch[] | TmplAstSwitchBlockCase[] = node?.branches ?? node?.cases ?? [];

		// @for blocks
		const emptyBlockChildren = node?.empty?.children ?? [];

		// @deferred blocks
		const errorBlockChildren = node?.error?.children ?? [];
		const loadingBlockChildren = node?.loading?.children ?? [];
		const placeholderBlockChildren = node?.placeholder?.children ?? [];

		nodeChildren.push(...emptyBlockChildren, ...errorBlockChildren, ...loadingBlockChildren, ...placeholderBlockChildren);

		if (nodeChildren.length > 0) {
			ret.push(...this.extractPipesFromChildNodes(nodeChildren));
		}

		nodeBranchesOrCases.forEach((branch) => {
			ret.push(...this.extractPipesFromChildNodes(branch.children));
		});

		if (node?.value?.ast) {
			ret.push(...this.getTranslatablesFromAst(node.value.ast));
		}

		if (node?.attributes) {
			const translateableAttributes = node.attributes.filter((attr: TmplAstTextAttribute) => TRANSLATE_PIPE_NAMES.includes(attr.name));
			ret.push(...ret, ...translateableAttributes);
		}

		if (node?.inputs) {
			node.inputs.forEach((input: any) => {
				// <element [attrib]="'identifier' | translate">
				if (input?.value?.ast) {
					ret.push(...this.getTranslatablesFromAst(input.value.ast));
				}
			});
		}
		if (node?.templateAttrs) {
			node.templateAttrs.forEach((attr: any) => {
				// <element *directive="'identifier' | translate">
				if (attr?.value?.ast) {
					ret.push(...this.getTranslatablesFromAst(attr.value.ast));
				}
			});
		}

		return ret;
	}

	protected extractPipesFromChildNodes(nodeChildren: TmplAstNode[]) {
		return nodeChildren.map((childNode) => this.findPipesInNode(childNode)).flat();
	}

	protected parseTranslationKeysFromPipe(pipeContent: BindingPipe | LiteralPrimitive | Conditional): string[] {
		const ret: string[] = [];
		if (pipeContent instanceof LiteralPrimitive) {
			ret.push(pipeContent.value);
		} else if (pipeContent instanceof Conditional) {
			const trueExp: LiteralPrimitive | Conditional = pipeContent.trueExp as any;
			ret.push(...this.parseTranslationKeysFromPipe(trueExp));
			const falseExp: LiteralPrimitive | Conditional = pipeContent.falseExp as any;
			ret.push(...this.parseTranslationKeysFromPipe(falseExp));
		} else if (pipeContent instanceof BindingPipe) {
			ret.push(...this.parseTranslationKeysFromPipe(pipeContent.exp as any));
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
