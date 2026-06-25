import { describe, beforeEach, expect, it } from 'vitest';

import { JsonCompiler } from '../../src/compilers/json.compiler.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('JsonCompiler', () => {
	let compiler: JsonCompiler;

	beforeEach(() => {
		compiler = new JsonCompiler();
	});

	describe('parse()', () => {
		it('should parse to a translation interface', () => {
			const contents = `
				{
					"key": "value",
					"secondKey": ""
				}
			`;
			const collection: TranslationCollection = compiler.parse(contents);
			expect(collection.values).to.deep.equal({
				key: { value: 'value', sourceFiles: [] },
				secondKey: { value: '', sourceFiles: [] },
			});
		});

		it('should strip BOM and surrounding whitespace', () => {
			const contents = '\uFEFF  {"key": "value"}  \n';
			const collection = compiler.parse(contents);
			expect(collection.values).toEqual({
				key: { value: 'value', sourceFiles: [] },
			});
		});

		it('should flatten namespaced JSON into dotted keys', () => {
			const contents = `
				{
					"namespace": {
						"key": "value",
						"nested": {
							"deep": "deepValue"
						}
					},
					"flatKey": "flatValue"
				}
			`;
			const collection = compiler.parse(contents);
			expect(collection.values).toEqual({
				'namespace.key': { value: 'value', sourceFiles: [] },
				'namespace.nested.deep': { value: 'deepValue', sourceFiles: [] },
				flatKey: { value: 'flatValue', sourceFiles: [] },
			});
		});

		it('should preserve null values as null instead of the string "null"', () => {
			const contents = `
				{
					"key": null,
					"otherKey": "value"
				}
			`;
			const collection = compiler.parse(contents);
			expect(collection.values).toEqual({
				key: { value: null, sourceFiles: [] },
				otherKey: { value: 'value', sourceFiles: [] },
			});
		});

		it('should not treat a flat JSON containing null values as namespaced', () => {
			const contents = `
				{
					"key": null,
					"secondKey": "value"
				}
			`;
			const collection = compiler.parse(contents);
			// null must not trigger the flatten() code path or mangle keys
			expect(collection.keys()).toEqual(['key', 'secondKey']);
		});

		it('should coerce primitive non-string values to strings', () => {
			const contents = `
				{
					"count": 42,
					"enabled": true
				}
			`;
			const collection = compiler.parse(contents);
			expect(collection.values).toEqual({
				count: { value: '42', sourceFiles: [] },
				enabled: { value: 'true', sourceFiles: [] },
			});
		});

		it('should not treat array values as namespaced JSON', () => {
			const contents = `
				{
					"list": ["a", "b"],
					"key": "value"
				}
			`;
			const collection = compiler.parse(contents);
			// arrays must not trigger flatten(): no "list.0"/"list.1" keys
			expect(collection.keys()).toEqual(['list', 'key']);
		});

		it('should flatten when at least one value is a nested object', () => {
			const contents = `
				{
					"flat": "value",
					"nested": { "key": "value" }
				}
			`;
			const collection = compiler.parse(contents);
			expect(collection.keys()).toEqual(['flat', 'nested.key']);
		});

		it('should parse an empty object to an empty collection', () => {
			const collection = compiler.parse('{}');
			expect(collection.isEmpty()).toEqual(true);
		});

		it('should throw on invalid JSON', () => {
			expect(() => compiler.parse('{ not valid }')).toThrow(SyntaxError);
		});
	});

	describe('compile()', () => {
		it('should compile a collection to flat JSON with tab indentation by default', () => {
			const collection = new TranslationCollection({
				key: { value: 'value', sourceFiles: [] },
			});
			const result = compiler.compile(collection);
			expect(result).to.equal('{\n\t"key": "value"\n}');
		});

		it('should keep dotted keys flat instead of nesting them', () => {
			const collection = new TranslationCollection({
				'namespace.key': { value: 'value', sourceFiles: [] },
			});
			const result = compiler.compile(collection);
			expect(JSON.parse(result)).toEqual({ 'namespace.key': 'value' });
		});

		it('should serialize null values as JSON null', () => {
			const collection = new TranslationCollection({
				key: { value: null, sourceFiles: [] },
			});
			const result = compiler.compile(collection);
			expect(JSON.parse(result)).toEqual({ key: null });
		});

		it('should respect a custom indentation option', () => {
			compiler = new JsonCompiler({ indentation: '  ' });
			const collection = new TranslationCollection({
				key: { value: 'value', sourceFiles: [] },
			});
			expect(compiler.compile(collection)).to.equal('{\n  "key": "value"\n}');
		});

		it('should append a trailing newline when configured', () => {
			compiler = new JsonCompiler({ trailingNewline: true });
			const collection = new TranslationCollection({
				key: { value: 'value', sourceFiles: [] },
			});
			expect(compiler.compile(collection).endsWith('}\n')).to.equal(true);
		});

		it('should not append a trailing newline by default', () => {
			const collection = new TranslationCollection({
				key: { value: 'value', sourceFiles: [] },
			});
			expect(compiler.compile(collection).endsWith('}')).to.equal(true);
		});
	});

	describe('round-trip', () => {
		it('should survive a compile → parse round-trip without data loss', () => {
			const collection = new TranslationCollection({
				key: { value: 'value', sourceFiles: [] },
				'name.spaced': { value: 'other', sourceFiles: [] },
				empty: { value: '', sourceFiles: [] },
				missing: { value: null, sourceFiles: [] },
			});
			const reparsed = compiler.parse(compiler.compile(collection));
			expect(reparsed.values).toEqual(collection.values);
		});
	});
});
