import { expect } from 'chai';

import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { NullAsDefaultValuePostProcessor } from '../../src/post-processors/null-as-default-value.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('NullAsDefaultValuePostProcessor', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new NullAsDefaultValuePostProcessor();
	});

	it('should use null as default value', () => {
		const draft = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const extracted = new TranslationCollection({ 'String A': {value: '', sourceFiles: []} });
		const existing = new TranslationCollection();
		expect(processor.process(draft, extracted, existing).values).to.deep.equal({
			'String A': {value: null, sourceFiles: []}
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
