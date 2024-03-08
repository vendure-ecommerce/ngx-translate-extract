import { describe, beforeEach, expect, it } from 'vitest';
import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { StripPrefixPostProcessor } from '../../src/post-processors/strip-prefix.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('StripPrefixPostProcessor', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new StripPrefixPostProcessor({ prefix: 'TEST.' });
	});

	it('should remove prefix from key', () => {
		const draft = new TranslationCollection({ 'TEST.StringA': { value: '', sourceFiles: [] } });
		const extracted = new TranslationCollection({ 'TEST.StringA': { value: '', sourceFiles: [] } });
		const existing = new TranslationCollection();
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			StringA: { value: '', sourceFiles: [] }
		});
	});

	it('should only remove prefix if it is first', () => {
		const draft = new TranslationCollection({ 'DUMMY.TEST.StringA': { value: '', sourceFiles: [] } });
		const extracted = new TranslationCollection({ 'DUMMY.TEST.StringA': { value: '', sourceFiles: [] } });
		const existing = new TranslationCollection();
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			'DUMMY.TEST.StringA': { value: '', sourceFiles: [] }
		});
	});

	it('should ignore case when removing prefix', () => {
		const draft = new TranslationCollection({
			'test.StringA': { value: '', sourceFiles: [] },
			'teST.StringB': { value: '', sourceFiles: [] },
			'Test.StringC': { value: '', sourceFiles: [] }
		});
		const extracted = new TranslationCollection({
			'test.StringA': { value: '', sourceFiles: [] },
			'teST.StringB': { value: '', sourceFiles: [] },
			'Test.StringC': { value: '', sourceFiles: [] }
		});
		const existing = new TranslationCollection();
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			StringA: { value: '', sourceFiles: [] },
			StringB: { value: '', sourceFiles: [] },
			StringC: { value: '', sourceFiles: [] }
		});
	});
});
