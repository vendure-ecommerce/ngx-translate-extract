import { expect } from 'chai';

import { FunctionParser } from '../../src/parsers/function.parser.js';

describe('FunctionParser', () => {
	const componentFilename: string = 'test.component.ts';

	let parser: FunctionParser;

	beforeEach(() => {
		parser = new FunctionParser('MK');
	});

	it('should extract strings using marker function', () => {
		const contents = `
			MK('Hello world');
			MK(['I', 'am', 'extracted']);
			otherFunction('But I am not');
			MK(message || 'binary expression');
			MK(message ? message : 'conditional operator');
			MK('FOO.bar');
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'I', 'am', 'extracted', 'binary expression', 'conditional operator', 'FOO.bar']);
	});

	it('should extract split strings', () => {
		const contents = `
			MK('Hello ' + 'world');
			MK('This is a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			MK('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'This is a very very very very long line.', 'Mix of different types']);
	});

	it('should extract split strings while keeping html tags', () => {
		const contents = `
			MK('Hello ' + 'world');
			MK('This <em>is</em> a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			MK('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'This <em>is</em> a very very very very long line.', 'Mix of different types']);
	});

	it('should extract the strings', () => {
		const contents = `

		export class AppModule {
			constructor() {
				MK('DYNAMIC_TRAD.val1');
				MK('DYNAMIC_TRAD.val2');
			}
		}
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['DYNAMIC_TRAD.val1', 'DYNAMIC_TRAD.val2']);
	});

});
