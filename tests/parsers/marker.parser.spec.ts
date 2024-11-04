import { describe, beforeEach, expect, it } from 'vitest';

import { MarkerParser } from '../../src/parsers/marker.parser.js';

describe('MarkerParser', () => {
	const componentFilename: string = 'test.component.ts';

	let parser: MarkerParser;

	beforeEach(() => {
		parser = new MarkerParser();
	});

	it('should extract strings using marker function', () => {
		const contents = `
			import { marker } from '@biesbjerg/ngx-translate-extract-marker';
			marker('Hello world');
			marker(['I', 'am', 'extracted']);
			otherFunction('But I am not');
			marker(message || 'binary expression');
			marker(message ? message : 'conditional operator');
			marker('FOO.bar');
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'I', 'am', 'extracted', 'binary expression', 'conditional operator', 'FOO.bar']);
	});

	it('should extract split strings', () => {
		const contents = `
			import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
			_('Hello ' + 'world');
			_('This is a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			_('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'This is a very very very very long line.', 'Mix of different types']);
	});

	it('should extract split strings while keeping html tags', () => {
		const contents = `
			import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
			_('Hello ' + 'world');
			_('This <em>is</em> a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			_('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world', 'This <em>is</em> a very very very very long line.', 'Mix of different types']);
	});

	it('should extract the strings', () => {
		const contents = `
		import { marker } from '@biesbjerg/ngx-translate-extract-marker';

		export class AppModule {
			constructor() {
				marker('DYNAMIC_TRAD.val1');
				marker('DYNAMIC_TRAD.val2');
			}
		}
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['DYNAMIC_TRAD.val1', 'DYNAMIC_TRAD.val2']);
	});

	it('should handle forks of the original @biesbjerg/ngx-translate-extract-marker', () => {
		const contents = `
		import { marker } from '@colsen1991/ngx-translate-extract-marker';

		marker('Hello world')
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['Hello world']);
	});

	it('should not break after bracket syntax casting', () => {
		const contents = `
		import { marker } from '@colsen1991/ngx-translate-extract-marker';

		marker('hello');
		const input: unknown = 'hello';
		const myNiceVar1 = input as string;
		marker('hello.after.as.syntax');

		const myNiceVar2 = <string>input;
		marker('hello.after.bracket.syntax');
		`;
		const keys = parser.extract(contents, componentFilename).keys();
		expect(keys).to.deep.equal(['hello', 'hello.after.as.syntax', 'hello.after.bracket.syntax']);
	});

	describe('marker from @ngx-translate/core', () => {
		it('should extract strings using marker (_) function', () => {
			const contents = `
			import {_} from '@ngx-translate/core';
			_('Hello world');
			_(['I', 'am', 'extracted']);
			otherFunction('But I am not');
			_(message || 'binary expression');
			_(message ? message : 'conditional operator');
			_('FOO.bar');
		`;
			const keys = parser.extract(contents, componentFilename)?.keys();
			expect(keys).to.deep.equal(['Hello world', 'I', 'am', 'extracted', 'binary expression', 'conditional operator', 'FOO.bar']);
		});

		it('should extract strings using an alias function', () => {
			const contents = `
			import {_ as marker} from '@ngx-translate/core';
			marker('Hello world');
			marker(['I', 'am', 'extracted']);
			otherFunction('But I am not');
			marker(message || 'binary expression');
			marker(message ? message : 'conditional operator');
			marker('FOO.bar');
		`;
			const keys = parser.extract(contents, componentFilename)?.keys();
			expect(keys).to.deep.equal(['Hello world', 'I', 'am', 'extracted', 'binary expression', 'conditional operator', 'FOO.bar']);
		});

		it('should extract split strings', () => {
			const contents = `
			import {_} from '@ngx-translate/core';
			_('Hello ' + 'world');
			_('This is a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			_('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
			const keys = parser.extract(contents, componentFilename).keys();
			expect(keys).to.deep.equal(['Hello world', 'This is a very very very very long line.', 'Mix of different types']);
		});

		it('should extract split strings while keeping html tags', () => {
			const contents = `
			import {_} from '@ngx-translate/core';
			_('Hello ' + 'world');
			_('This <em>is</em> a ' + 'very ' + 'very ' + 'very ' + 'very ' + 'long line.');
			_('Mix ' + \`of \` + 'different ' + \`types\`);
		`;
			const keys = parser.extract(contents, componentFilename).keys();
			expect(keys).to.deep.equal(['Hello world', 'This <em>is</em> a very very very very long line.', 'Mix of different types']);
		});
	})
});
