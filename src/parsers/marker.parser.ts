import { SourceFile } from 'typescript';

import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression, getAST } from '../utils/ast-helpers.js';
import { normalizeFilePath } from '../utils/fs-helpers.js';
import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { toTranslationType } from '../utils/utils.js';
import { ParserInterface } from './parser.interface.js';

const MARKER_MODULE_NAME = new RegExp('ngx-translate-extract-marker');
const MARKER_IMPORT_NAME = 'marker';
const NGX_TRANSLATE_MARKER_MODULE_NAME = '@ngx-translate/core';
const NGX_TRANSLATE_MARKER_IMPORT_NAME = '_';

export class MarkerParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection {
		const extracted: TranslationType = Object.create(null);
		const filePathNormalized = normalizeFilePath(filePath);
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return new TranslationCollection();
		}

		const markerImportName = this.getMarkerImportNameFromSource(sourceFile);
		if (!markerImportName) {
			return new TranslationCollection();
		}

		const callExpressions = findFunctionCallExpressions(sourceFile, markerImportName);
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

	private getMarkerImportNameFromSource(sourceFile: SourceFile): string {
		const markerImportName =
			getNamedImportAlias(sourceFile, MARKER_IMPORT_NAME, MARKER_MODULE_NAME) ||
			getNamedImportAlias(sourceFile, NGX_TRANSLATE_MARKER_IMPORT_NAME, NGX_TRANSLATE_MARKER_MODULE_NAME);

		return markerImportName ?? '';
	}
}
