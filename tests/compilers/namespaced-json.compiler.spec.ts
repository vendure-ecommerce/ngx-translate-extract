import { expect } from 'chai';

import { TranslationCollection } from '../../src/utils/translation.collection.js';
import { NamespacedJsonCompiler } from '../../src/compilers/namespaced-json.compiler.js';

describe('NamespacedJsonCompiler', () => {
	let compiler: NamespacedJsonCompiler;

	beforeEach(() => {
		compiler = new NamespacedJsonCompiler();
	});

	it('should parse to a translation interface', () => {
		const contents = `
			{
				"key": "value",
				"secondKey": ""
			}
		`;
		const collection: TranslationCollection = compiler.parse(contents);
		expect(collection.values).to.deep.equal({
			'key': {value: 'value', sourceFiles: []},
			'secondKey': {value: '', sourceFiles: []}
		});
	});

	it('should flatten keys on parse', () => {
		const contents = `
			{
				"NAMESPACE": {
					"KEY": {
						"FIRST_KEY": "",
						"SECOND_KEY": "VALUE"
					}
				}
			}
		`;
		const collection: TranslationCollection = compiler.parse(contents);
		expect(collection.values).to.deep.equal({
			'NAMESPACE.KEY.FIRST_KEY': {value: '', sourceFiles: []},
			'NAMESPACE.KEY.SECOND_KEY': {value: 'VALUE', sourceFiles: []}
		});
	});

	it('should unflatten keys on compile', () => {
		const collection = new TranslationCollection({
			'NAMESPACE.KEY.FIRST_KEY': {value: '', sourceFiles: []},
			'NAMESPACE.KEY.SECOND_KEY': {value: 'VALUE', sourceFiles: ['path/to/file.ts']}
		});
		const result: string = compiler.compile(collection);
		expect(result).to.equal('{\n\t"NAMESPACE": {\n\t\t"KEY": {\n\t\t\t"FIRST_KEY": "",\n\t\t\t"SECOND_KEY": "VALUE"\n\t\t}\n\t}\n}');
	});

	it('should preserve numeric values on compile', () => {
		const collection = new TranslationCollection({
			'option.0': {value: '', sourceFiles: []},
			'option.1': {value: '', sourceFiles: []},
			'option.2': {value: '', sourceFiles: []}
		});
		const result: string = compiler.compile(collection);
		expect(result).to.equal('{\n\t"option": {\n\t\t"0": "",\n\t\t"1": "",\n\t\t"2": ""\n\t}\n}');
	});

	it('should use custom indentation chars', () => {
		const collection = new TranslationCollection({
			'NAMESPACE.KEY.FIRST_KEY': {value: '', sourceFiles: []},
			'NAMESPACE.KEY.SECOND_KEY': {value: 'VALUE', sourceFiles: ['path/to/file.ts']}
		});
		const customCompiler = new NamespacedJsonCompiler({
			indentation: '  '
		});
		const result: string = customCompiler.compile(collection);
		expect(result).to.equal('{\n  "NAMESPACE": {\n    "KEY": {\n      "FIRST_KEY": "",\n      "SECOND_KEY": "VALUE"\n    }\n  }\n}');
	});

	it('should not reorder keys when compiled', () => {
		const collection = new TranslationCollection({
			BROWSE: {value: '', sourceFiles: []},
			LOGIN: {value: '', sourceFiles: []}
		});
		const result: string = compiler.compile(collection);
		expect(result).to.equal('{\n\t"BROWSE": "",\n\t"LOGIN": ""\n}');
	});
});
