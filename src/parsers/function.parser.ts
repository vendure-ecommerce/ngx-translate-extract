import pkg from 'typescript';

import { getStringsFromExpression, findSimpleCallExpressions, getAST } from '../utils/ast-helpers.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { ParserInterface } from './parser.interface.js';
const { isIdentifier } = pkg;

export class FunctionParser implements ParserInterface {
	constructor(private fnName: string) {}

	public extract(source: string, filePath: string): TranslationCollection {
		let collection: TranslationCollection = new TranslationCollection();
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return collection;
		}

		const callExpressions = findSimpleCallExpressions(sourceFile, this.fnName);
		callExpressions.forEach((callExpression) => {
			if (!isIdentifier(callExpression.expression) || callExpression.expression.escapedText !== this.fnName) {
				return;
			}

			const [firstArg] = callExpression.arguments;
			if (!firstArg) {
				return;
			}
			const strings = getStringsFromExpression(firstArg);
			collection = collection.addKeys(strings, filePath);
		});
		return collection;
	}
}
