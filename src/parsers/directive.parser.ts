import {
	AST,
	ASTWithSource,
	Binary,
	BindingPipe,
	Conditional,
	Interpolation,
	LiteralArray,
	LiteralMap,
	LiteralPrimitive,
	parseTemplate,
	TmplAstBoundAttribute as BoundAttribute,
	TmplAstElement as Element,
	TmplAstNode as Node,
	TmplAstTemplate as Template,
	TmplAstText as Text,
	TmplAstTextAttribute as TextAttribute
} from '@angular/compiler';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { extractComponentInlineTemplate, isPathAngularComponent } from '../utils/utils.js';

export const TRANSLATE_ATTR_NAMES = ['translate', 'marker'];
type ElementLike = Element | Template;

export class DirectiveParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		let collection: TranslationCollection = new TranslationCollection();

		if (filePath && isPathAngularComponent(filePath)) {
			source = extractComponentInlineTemplate(source);
		}
		const nodes: Node[] = this.parseTemplate(source, filePath);
		const elements: ElementLike[] = this.getElementsWithTranslateAttribute(nodes);

		elements.forEach((element) => {
			const attribute = this.getAttribute(element, TRANSLATE_ATTR_NAMES);
			if (attribute?.value) {
				collection = collection.add(attribute.value);
				return;
			}

			const boundAttribute = this.getBoundAttribute(element, TRANSLATE_ATTR_NAMES);
			if (boundAttribute?.value) {
				this.getLiteralPrimitives(boundAttribute.value).forEach((literalPrimitive) => {
					collection = collection.add(literalPrimitive.value);
				});
				return;
			}

			const textNodes = this.getTextNodes(element);
			textNodes.forEach((textNode) => {
				collection = collection.add(textNode.value.trim());
			});
		});
		return collection;
	}

	/**
	 * Find all ElementLike nodes with a translate attribute
	 * @param nodes
	 */
	protected getElementsWithTranslateAttribute(nodes: Node[]): ElementLike[] {
		let elements: ElementLike[] = [];

		nodes.filter(this.isElementLike).forEach((element) => {
			if (this.hasAttributes(element, TRANSLATE_ATTR_NAMES)) {
				elements = [...elements, element];
			}
			if (this.hasBoundAttribute(element, TRANSLATE_ATTR_NAMES)) {
				elements = [...elements, element];
			}
			const childElements = this.getElementsWithTranslateAttribute(element.children);
			if (childElements.length) {
				elements = [...elements, ...childElements];
			}
		});
		return elements;
	}

	/**
	 * Get direct child nodes of type Text
	 * @param element
	 */
	protected getTextNodes(element: ElementLike): Text[] {
		return element.children.filter(this.isText);
	}

	/**
	 * Check if attribute is present on element
	 * @param element
	 * @param name
	 */
	protected hasAttributes(element: ElementLike, name: string[]): boolean {
		return this.getAttribute(element, name) !== undefined;
	}

	/**
	 * Get attribute value if present on element
	 * @param element
	 * @param names
	 */
	protected getAttribute(element: ElementLike, names: string[]): TextAttribute {
		return element.attributes.find((attribute) => names.includes(attribute.name));
	}

	/**
	 * Check if bound attribute is present on element
	 * @param element
	 * @param names
	 */
	protected hasBoundAttribute(element: ElementLike, names: string[]): boolean {
		return this.getBoundAttribute(element, names) !== undefined;
	}

	/**
	 * Get bound attribute if present on element
	 * @param element
	 * @param names
	 */
	protected getBoundAttribute(element: ElementLike, names: string[]): BoundAttribute {
		return element.inputs.find((input) => names.includes(input.name));
	}

	/**
	 * Get literal primitives from expression
	 * @param exp
	 */
	protected getLiteralPrimitives(exp: AST): LiteralPrimitive[] {
		if (exp instanceof LiteralPrimitive) {
			return [exp];
		}

		let visit: AST[] = [];
		if (exp instanceof Interpolation) {
			visit = exp.expressions;
		} else if (exp instanceof LiteralArray) {
			visit = exp.expressions;
		} else if (exp instanceof LiteralMap) {
			visit = exp.values;
		} else if (exp instanceof BindingPipe) {
			visit = [exp.exp];
		} else if (exp instanceof Conditional) {
			visit = [exp.trueExp, exp.falseExp];
		} else if (exp instanceof Binary) {
			visit = [exp.left, exp.right];
		} else if (exp instanceof ASTWithSource) {
			visit = [exp.ast];
		}

		let results: LiteralPrimitive[] = [];
		visit.forEach((child) => {
			results = [...results, ...this.getLiteralPrimitives(child)];
		});
		return results;
	}

	/**
	 * Check if node type is ElementLike
	 * @param node
	 */
	protected isElementLike(node: Node): node is ElementLike {
		return node instanceof Element || node instanceof Template;
	}

	/**
	 * Check if node type is Text
	 * @param node
	 */
	protected isText(node: Node): node is Text {
		return node instanceof Text;
	}

	/**
	 * Parse a template into nodes
	 * @param template
	 * @param path
	 */
	protected parseTemplate(template: string, path: string): Node[] {
		return parseTemplate(template, path).nodes;
	}
}
