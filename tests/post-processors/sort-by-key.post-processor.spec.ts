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

	it('should perform case insensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			h: { value: 'letter h', sourceFiles: [] },
			B: { value: 'letter B', sourceFiles: [] },
			H: { value: 'letter H', sourceFiles: [] },
			i: { value: 'letter i', sourceFiles: [] },
			C: { value: 'letter C', sourceFiles: [] },
			e: { value: 'letter e', sourceFiles: [] },
			f: { value: 'letter f', sourceFiles: [] },
			d: { value: 'letter d', sourceFiles: [] },
			A: { value: 'letter A', sourceFiles: [] },
			g: { value: 'letter g', sourceFiles: [] }
		});

		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			A: { value: 'letter A', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			B: { value: 'letter B', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			c: { value: 'letter c', sourceFiles: [] },
			C: { value: 'letter C', sourceFiles: [] },
			d: { value: 'letter d', sourceFiles: [] },
			e: { value: 'letter e', sourceFiles: [] },
			f: { value: 'letter f', sourceFiles: [] },
			g: { value: 'letter g', sourceFiles: [] },
			H: { value: 'letter H', sourceFiles: [] },
			h: { value: 'letter h', sourceFiles: [] },
			i: { value: 'letter i', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] }
		});
	});
});
