import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { LanguageVariant } from 'typescript';

import { getAST, getNamedImport, getNamedImportAlias } from '../../src/utils/ast-helpers';

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

describe('getNamedImport()', () => {
	describe('with a normal import', () => {
		const node = tsquery.ast(`
			import { Base } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given exact import path', () => {
			expect(getNamedImport(node, 'CoreBase', './src/base')).to.equal(null);
			expect(getNamedImport(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given a regex pattern for the import path', () => {
			expect(getNamedImport(node, 'CoreBase', new RegExp('base'))).to.equal(null);
			expect(getNamedImport(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});

	describe('with an aliased import', () => {
		const node = tsquery.ast(`
			import { Base as CoreBase } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given an alias and exact import path', () => {
			expect(getNamedImport(node, 'CoreBase', './src/base')).to.equal('Base');
			expect(getNamedImport(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given an alias and a regex pattern for the import path', () => {
			expect(getNamedImport(node, 'CoreBase', new RegExp('base'))).to.equal('Base');
			expect(getNamedImport(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});
});

describe('getNamedImportAlias()', () => {
	describe('with a normal import', () => {
		const node = tsquery.ast(`
			import { Base } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given exact import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', './src/base')).to.equal(null);
			expect(getNamedImportAlias(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given a regex pattern for the import', () => {
			expect(getNamedImportAlias(node, 'CoreBase', new RegExp('base'))).to.equal(null);
			expect(getNamedImportAlias(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});

	describe('with an aliased import', () => {
		const node = tsquery.ast(`
			import { Base as CoreBase } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the aliased class name when given an alias and exact import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', './src/base')).to.equal('CoreBase');
			expect(getNamedImportAlias(node, 'Base', './src/base')).to.equal('CoreBase');
		});

		it('should return the aliased class name when given an alias and a regex pattern for the import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', new RegExp('base'))).to.equal('CoreBase');
			expect(getNamedImportAlias(node, 'Base', new RegExp('base'))).to.equal('CoreBase');
		});
	});
});
