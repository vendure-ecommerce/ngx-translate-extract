import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import { extname } from 'path';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression } from '../utils/ast-helpers.js';

const MARKER_MODULE_NAME = 'ngx-translate-extract-marker';
const MARKER_IMPORT_NAME = 'marker';

export class MarkerParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		const supportedScriptTypes: Record<string, ScriptKind> = {
			'.js': ScriptKind.JS,
			'.jsx': ScriptKind.JSX,
			'.ts': ScriptKind.TS,
			'.tsx': ScriptKind.TSX
		};

		const scriptKind = supportedScriptTypes[extname(filePath)] ?? ScriptKind.TS;

		const sourceFile = tsquery.ast(source, filePath, scriptKind);

		const markerImportName = getNamedImportAlias(sourceFile, MARKER_MODULE_NAME, MARKER_IMPORT_NAME);
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
