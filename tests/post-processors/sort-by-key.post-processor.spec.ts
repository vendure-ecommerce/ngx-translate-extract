import { expect } from 'chai';

import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { SortByKeyPostProcessor } from '../../src/post-processors/sort-by-key.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('SortByKeyPostProcessor', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor();
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: {value: 'last value', sourceFiles: []},
			a: {value: 'a value', sourceFiles: []},
			'9': {value: 'a numeric key', sourceFiles: []},
			b: {value: 'another value', sourceFiles: []}
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': {value: 'a numeric key', sourceFiles: []},
			a: {value: 'a value', sourceFiles: []},
			b: {value: 'another value', sourceFiles: []},
			z: {value: 'last value', sourceFiles: []}
		});
	});
});
