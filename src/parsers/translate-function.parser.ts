import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';
import { normalizeFilePath } from '../utils/fs-helpers.js';
import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { toTranslationType } from '../utils/utils.js';
import { ParserInterface } from './parser.interface.js';

export class TranslateFunctionParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection {
		const extracted: TranslationType = Object.create(null);
		const filePathNormalized = normalizeFilePath(filePath);
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return new TranslationCollection();
		}

		const translateFnImportName = getNamedImportAlias(sourceFile, 'translate', '@ngx-translate/core');
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
