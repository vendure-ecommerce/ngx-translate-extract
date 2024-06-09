import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { LanguageVariant } from 'typescript';

import { getAST } from '../../src/utils/ast-helpers';

describe('getAST()', () => {
	const tsqueryAstSpy = vi.spyOn(tsquery, 'ast');

	beforeEach(() => {
		tsqueryAstSpy.mockClear();
	});

	it('should return the AST for a TypeScript source with a .ts file extension', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.ts';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TS);
		expect(result.languageVariant).toBe(LanguageVariant.Standard);
	});

	it('should return the AST for a TypeScript source with a .tsx file extension', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.tsx';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TSX);
		expect(result.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should return the AST for a JavaScript source with a .js file extension', () => {
		const source = 'const x = 42;';
		const fileName = 'example.js';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.JS);
		// JS files also return JSX language variant.
		expect(result.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should return the AST for a JavaScript source with a .jsx file extension', () => {
		const source = 'const x = 42;';
		const fileName = 'example.jsx';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.JSX);
		expect(result.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should use ScriptKind.TS if the file extension is unsupported', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.unknown';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TS);
		expect(result.languageVariant).toBe(LanguageVariant.Standard);
	});

	it('should use ScriptKind.TS if no file name is provided', () => {
		const source = 'const x: number = 42;';

		const result = getAST(source);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, '', ScriptKind.TS);
		expect(result.languageVariant).toBe(LanguageVariant.Standard);
	});
});
