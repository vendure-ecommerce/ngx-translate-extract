import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';
import { SourceFile } from 'typescript';

const MARKER_MODULE_NAME = new RegExp('ngx-translate-extract-marker');
const MARKER_IMPORT_NAME = 'marker';
const NGX_TRANSLATE_MARKER_MODULE_NAME = '@ngx-translate/core';
const NGX_TRANSLATE_MARKER_IMPORT_NAME = '_';

export class MarkerParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = getAST(source, filePath);

		const markerImportName = this.getMarkerImportNameFromSource(sourceFile);
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

	private getMarkerImportNameFromSource(sourceFile: SourceFile): string {
		const markerImportName =
			getNamedImportAlias(sourceFile, MARKER_IMPORT_NAME, MARKER_MODULE_NAME) ||
			getNamedImportAlias(sourceFile, NGX_TRANSLATE_MARKER_IMPORT_NAME, NGX_TRANSLATE_MARKER_MODULE_NAME);

		return markerImportName ?? '';
	}
}
