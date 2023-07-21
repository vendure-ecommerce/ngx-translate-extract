import { expect } from 'chai';

import { TranslationCollection } from '../../src/utils/translation.collection.js';
import { JsonCompiler } from '../../src/compilers/json.compiler.js';

describe('JsonCompiler', () => {
	let compiler: JsonCompiler;

	beforeEach(() => {
		compiler = new JsonCompiler();
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
});
