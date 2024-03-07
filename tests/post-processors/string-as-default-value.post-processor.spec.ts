import { describe, beforeEach, expect, it } from 'vitest';

import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { StringAsDefaultValuePostProcessor } from '../../src/post-processors/string-as-default-value.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('StringAsDefaultValuePostProcessor', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new StringAsDefaultValuePostProcessor({ defaultValue: 'default' });
	});

	it('should use string as default value', () => {
		const draft = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const extracted = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const existing = new TranslationCollection();
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			'String A': {value: 'default', sourceFiles: []}
		});
	});

	it('should keep existing value even if it is an empty string', () => {
		const draft = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const extracted = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const existing = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			'String A': {value: '', sourceFiles: []}
		});
	});

	it('should keep existing value', () => {
		const draft = new TranslationCollection({ 'String A': {value: 'Streng A', sourceFiles: []} });
		const extracted = new TranslationCollection({ 'String A': {value: 'Streng A', sourceFiles: []} });
		const existing = new TranslationCollection({ 'String A': {value: 'Streng A', sourceFiles: []} });
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			'String A': {value: 'Streng A', sourceFiles: []}
		});
	});
});
