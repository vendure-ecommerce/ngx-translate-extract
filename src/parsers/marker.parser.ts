import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';

const MARKER_MODULE_NAME = 'ngx-translate-extract-marker';
const MARKER_IMPORT_NAME = 'marker';

export class MarkerParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = getAST(source, filePath);

		const markerImportName = getNamedImportAlias(sourceFile, MARKER_IMPORT_NAME, new RegExp(MARKER_MODULE_NAME));
		if (!markerImportName) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		const callExpressions = findFunctionCallExpressions(sourceFile, markerImportName);
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
