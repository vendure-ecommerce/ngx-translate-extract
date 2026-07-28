import pkg from 'typescript';

import { getStringsFromExpression, findSimpleCallExpressions, getAST } from '../utils/ast-helpers.js';
import { normalizeFilePath } from '../utils/fs-helpers.js';
import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { toTranslationType } from '../utils/utils.js';
import { ParserInterface } from './parser.interface.js';
const { isIdentifier } = pkg;

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class FunctionParser implements ParserInterface {
	private readonly fnNamePattern: RegExp;

	constructor(private fnName: string) {
		// Whole-identifier match, so a marker named `_` isn't triggered by every `snake_case` or `__dirname`.
		this.fnNamePattern = new RegExp(`(?<![\\w$])${escapeRegExp(fnName)}(?![\\w$])`);
	}

	public canMatch(source: string): boolean {
		return this.fnNamePattern.test(source);
	}

	public extract(source: string, filePath: string): TranslationCollection {
		const extracted: TranslationType = Object.create(null);
		const filePathNormalized = normalizeFilePath(filePath);
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return new TranslationCollection();
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
			getStringsFromExpression(firstArg).forEach((key) => {
				extracted[key] = toTranslationType('', filePathNormalized);
			});
		});
		return new TranslationCollection(extracted);
	}
}
