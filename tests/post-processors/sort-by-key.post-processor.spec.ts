import { describe, beforeEach, expect, it } from 'vitest';

import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { SortByKeyPostProcessor } from '../../src/post-processors/sort-by-key.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('SortByKeyPostProcessor - should throw error if sort sensitivity is not known', () => {
	it('should throw error', () => {
		expect(() => new SortByKeyPostProcessor('invalidSortSensitivityOption')).throw('Unknown sortSensitivity: invalidSortSensitivityOption');
	});
});

describe('SortByKeyPostProcessor - undefined sort sensitivity should sort as variant sort sensitivity', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor(undefined);
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: { value: 'last value', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			'9': { value: 'a numeric key', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		// Assert all values are processed correctly
		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': { value: 'a numeric key', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] },
			z: { value: 'last value', sourceFiles: [] }
		});

		// Assert all keys are in the correct order
		expect(processor.process(collection, extracted, existing).keys()).toStrictEqual(['9', 'a', 'b', 'z']);
	});

	it('should perform variant sensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all values are processed correctly
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			A: { value: 'letter A', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all keys are in the correct order
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).keys()).toStrictEqual([
			'A',
			'B',
			'C',
			'H',
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
			'g',
			'h',
			'i',
			'j',
			'à'
		]);
	});
});

describe('SortByKeyPostProcessor - base sensitivity should treat all base characters as equal', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor('base');
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: { value: 'last value', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			'9': { value: 'a numeric key', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		// Assert all values are processed correctly
		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': { value: 'a numeric key', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] },
			z: { value: 'last value', sourceFiles: [] }
		});

		// Assert all keys are in the correct order
		expect(processor.process(collection, extracted, existing).keys()).toStrictEqual(['9', 'a', 'b', 'z']);
	});

	it('should perform base sensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all values are processed correctly
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all keys are in the correct order
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).keys()).toStrictEqual([
			'a',
			'à',
			'A',
			'b',
			'B',
			'c',
			'C',
			'd',
			'e',
			'f',
			'g',
			'h',
			'H',
			'i',
			'j'
		]);
	});
});

describe('SortByKeyPostProcessor - accent sensitivity should sort treat lowercase and uppercase as equal but accents and diacretics as not equal', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor('accent');
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: { value: 'last value', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			'9': { value: 'a numeric key', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		// Assert all values are processed correctly
		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': { value: 'a numeric key', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] },
			z: { value: 'last value', sourceFiles: [] }
		});

		// Assert all keys are in the correct order
		expect(processor.process(collection, extracted, existing).keys()).toStrictEqual(['9', 'a', 'b', 'z']);
	});

	it('should perform accent sensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all values are processed correctly
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all keys are in the correct order
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).keys()).toStrictEqual([
			'a',
			'A',
			'à',
			'b',
			'B',
			'c',
			'C',
			'd',
			'e',
			'f',
			'g',
			'h',
			'H',
			'i',
			'j'
		]);
	});
});

describe('SortByKeyPostProcessor - case sensitivity should treat lowercase and uppercase as not equal but accents and diacretics as equal', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor('case');
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: { value: 'last value', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			'9': { value: 'a numeric key', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		// Assert all values are processed correctly
		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': { value: 'a numeric key', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] },
			z: { value: 'last value', sourceFiles: [] }
		});

		// Assert all keys are in the correct order
		expect(processor.process(collection, extracted, existing).keys()).toStrictEqual(['9', 'a', 'b', 'z']);
	});

	it('should perform case sensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all values are processed correctly
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all keys are in the correct order
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).keys()).toStrictEqual([
			'a',
			'à',
			'A',
			'b',
			'B',
			'c',
			'C',
			'd',
			'e',
			'f',
			'g',
			'h',
			'H',
			'i',
			'j'
		]);
	});
});

describe('SortByKeyPostProcessor - variant sensitivity should treat lowercase, uppercase, accents and diacretics as not equal', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new SortByKeyPostProcessor('variant');
	});

	it('should sort keys alphanumerically', () => {
		const collection = new TranslationCollection({
			z: { value: 'last value', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			'9': { value: 'a numeric key', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection();

		// Assert all values are processed correctly
		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'9': { value: 'a numeric key', sourceFiles: [] },
			a: { value: 'a value', sourceFiles: [] },
			b: { value: 'another value', sourceFiles: [] },
			z: { value: 'last value', sourceFiles: [] }
		});

		// Assert all keys are in the correct order
		expect(processor.process(collection, extracted, existing).keys()).toStrictEqual(['9', 'a', 'b', 'z']);
	});

	it('should perform variant sensitive sorting', () => {
		const collection = new TranslationCollection({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all values are processed correctly
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).values).to.deep.equal({
			c: { value: 'letter c', sourceFiles: [] },
			j: { value: 'letter j', sourceFiles: [] },
			b: { value: 'letter b', sourceFiles: [] },
			a: { value: 'letter a', sourceFiles: [] },
			à: { value: 'letter à', sourceFiles: [] },
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

		// Assert all keys are in the correct order
		expect(processor.process(collection, new TranslationCollection(), new TranslationCollection()).keys()).toStrictEqual([
			'a',
			'A',
			'à',
			'b',
			'B',
			'c',
			'C',
			'd',
			'e',
			'f',
			'g',
			'h',
			'H',
			'i',
			'j'
		]);
	});
});
