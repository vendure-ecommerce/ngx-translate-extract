import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';
import { normalizeFilePath } from '../utils/fs-helpers.js';
import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { toTranslationType } from '../utils/utils.js';
import { ParserInterface } from './parser.interface.js';

const TRANSLATE_FN_MODULE_NAME = '@ngx-translate/core';
const TRANSLATE_FN_IMPORT_NAME = 'translate';

export class TranslateFunctionParser implements ParserInterface {
	public canMatch(source: string): boolean {
		return source.includes(TRANSLATE_FN_MODULE_NAME);
	}

	public extract(source: string, filePath: string): TranslationCollection {
		const extracted: TranslationType = Object.create(null);
		const filePathNormalized = normalizeFilePath(filePath);
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return new TranslationCollection();
		}

		const translateFnImportName = getNamedImportAlias(sourceFile, TRANSLATE_FN_IMPORT_NAME, TRANSLATE_FN_MODULE_NAME);
		if (!translateFnImportName) {
			return new TranslationCollection();
		}

		const callExpressions = findFunctionCallExpressions(sourceFile, translateFnImportName);

		callExpressions.forEach((callExpression) => {
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
