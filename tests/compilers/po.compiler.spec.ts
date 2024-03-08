import { describe, beforeEach, expect, it } from 'vitest';

import { TranslationCollection } from '../../src/utils/translation.collection.js';
import { PoCompiler } from '../../src/compilers/po.compiler.js';

describe('PoCompiler', () => {
	let compiler: PoCompiler;

	beforeEach(() => {
		compiler = new PoCompiler();
	});

	it('should still include html ', () => {
		const collection = new TranslationCollection({
			'A <strong>test</strong>': {value: 'Un <strong>test</strong>', sourceFiles: ['path/to/file.ts', 'path/to/other/file.ts']},
			'With a lot of <em>html</em> included': {value: 'Avec beaucoup d\'<em>html</em> inclus', sourceFiles: ['path/to/file.ts']}
		});
		const result: Buffer = Buffer.from(compiler.compile(collection));
		expect(result.toString('utf8')).to.equal(
			'msgid ""\n'
			+ 'msgstr ""\n"'
			+ 'mime-version: 1.0\\n"\n"'
			+ 'Content-Type: text/plain; charset=utf-8\\n"\n"'
			+ 'Content-Transfer-Encoding: 8bit\\n"\n\n'
			+ '#: path/to/file.ts\n'
			+ '#: path/to/other/file.ts\n'
			+ 'msgid "A <strong>test</strong>"\n'
			+ 'msgstr "Un <strong>test</strong>"\n\n'
			+ '#: path/to/file.ts\n'
			+ 'msgid "With a lot of <em>html</em> included"\n'
			+ 'msgstr "Avec beaucoup d\'<em>html</em> inclus"'
		);
	});
});
