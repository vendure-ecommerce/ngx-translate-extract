import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { ParserInterface } from './parser.interface.js';

export class TranslateFunctionParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection {
		let collection = new TranslationCollection();
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return collection;
		}

		const translateFnImportName = getNamedImportAlias(sourceFile, 'translate', '@ngx-translate/core');
		if (!translateFnImportName) {
			return collection;
		}

		const callExpressions = findFunctionCallExpressions(sourceFile, translateFnImportName);

		callExpressions.forEach((callExpression) => {
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
