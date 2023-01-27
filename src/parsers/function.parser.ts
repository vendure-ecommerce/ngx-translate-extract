import { tsquery } from '@phenomnomnominal/tsquery';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { getStringsFromExpression, findSimpleCallExpressions } from '../utils/ast-helpers.js';
import pkg from 'typescript';
const { isIdentifier } = pkg;

export class FunctionParser implements ParserInterface {
	constructor(private fnName: string) {}

	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = tsquery.ast(source, filePath);

		let collection: TranslationCollection = new TranslationCollection();

		const callExpressions = findSimpleCallExpressions(sourceFile, this.fnName);
		callExpressions.forEach((callExpression) => {
			if (!isIdentifier(callExpression.expression)
			    || callExpression.expression.escapedText != this.fnName) {
				return
			}

			const [firstArg] = callExpression.arguments;
			if (!firstArg) {
				return;
			}
			const strings = getStringsFromExpression(firstArg);
			collection = collection.addKeys(strings);
		});
		return collection;
	}
}
