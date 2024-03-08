import { describe, beforeEach, expect, it } from 'vitest';

import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('StringCollection', () => {
	let collection: TranslationCollection;

	beforeEach(() => {
		collection = new TranslationCollection();
	});

	it('should initialize with key/value pairs', () => {
		collection = new TranslationCollection({ key1: {value: 'val1', sourceFiles: []}, key2: {value: 'val2', sourceFiles: []} });
		expect(collection.values).to.deep.equal({ key1: {value: 'val1', sourceFiles: []}, key2: {value: 'val2', sourceFiles: []} });
	});

	it('should add key with value', () => {
		const newCollection = collection.add('theKey', 'theVal', 'path/to/file.ts');
		expect(newCollection.get('theKey')).to.deep.equal({value: 'theVal', sourceFiles: ['path/to/file.ts']});
	});

	it('should add second source file on duplicate key', () => {
		const newCollection = collection.add('theKey', 'theVal', 'path/to/file.ts');
		expect(newCollection.get('theKey')).to.deep.equal({value: 'theVal', sourceFiles: ['path/to/file.ts']});

		const updatedCollection = newCollection.add('theKey', 'theVal', 'path/to/another-file.ts');
		expect(updatedCollection.get('theKey')).to.deep.equal({value: 'theVal', sourceFiles: ['path/to/file.ts', 'path/to/another-file.ts']});
	});

	it('should add key with default value', () => {
		collection = collection.add('theKey', '', 'path/to/file.ts');
		expect(collection.get('theKey')).to.deep.equal({value: '', sourceFiles: ['path/to/file.ts']});
	});

	it('should not mutate collection when adding key', () => {
		collection.add('theKey', 'theVal', 'path/to/file.ts');
		expect(collection.has('theKey')).to.equal(false);
	});

	it('should add array of keys with default value', () => {
		collection = collection.addKeys(['key1', 'key2'], 'path/to/some-file.ts');
		expect(collection.values).to.deep.equal({ key1: {value: '', sourceFiles: ['path/to/some-file.ts']}, key2: {value: '', sourceFiles: ['path/to/some-file.ts']} });
	});

	it('should return true when collection has key', () => {
		collection = collection.add('key', '', '');
		expect(collection.has('key')).to.equal(true);
	});

	it('should return false when collection does not have key', () => {
		expect(collection.has('key')).to.equal(false);
	});

	it('should remove key', () => {
		collection = new TranslationCollection({ removeThisKey: {value: '', sourceFiles: []} });
		collection = collection.remove('removeThisKey');
		expect(collection.has('removeThisKey')).to.equal(false);
	});

	it('should not mutate collection when removing key', () => {
		collection = new TranslationCollection({ removeThisKey: {value: '', sourceFiles: []} });
		collection.remove('removeThisKey');
		expect(collection.has('removeThisKey')).to.equal(true);
	});

	it('should return number of keys', () => {
		collection = collection.addKeys(['key1', 'key2', 'key3'], 'some/path.html');
		expect(collection.count()).to.equal(3);
	});

	it('should merge with other collection', () => {
		collection = collection.add('oldKey', 'oldVal', '');
		const newCollection = new TranslationCollection({ newKey: {value: 'newVal', sourceFiles: ['']} });
		expect(collection.union(newCollection).values).to.deep.equal({
			oldKey: {value: 'oldVal', sourceFiles: ['']},
			newKey: {value: 'newVal', sourceFiles: ['']}
		});
	});

	it('should intersect with passed collection', () => {
		collection = collection.addKeys(['red', 'green', 'blue'], '');
		const newCollection = new TranslationCollection({ red: {value: '', sourceFiles: ['']}, blue: {value: '', sourceFiles: ['']} });
		expect(collection.intersect(newCollection).values).to.deep.equal({ red: {value: '', sourceFiles: ['']}, blue: {value: '', sourceFiles: ['']} });
	});

	it('should intersect with passed collection and keep original values', () => {
		collection = new TranslationCollection({ red: {value: 'rød', sourceFiles: []}, green: {value: 'grøn', sourceFiles: []}, blue: {value: 'blå', sourceFiles: []} });
		const newCollection = new TranslationCollection({ red: {value: 'no value', sourceFiles: []}, blue: {value: 'also no value', sourceFiles: []} });
		expect(collection.intersect(newCollection).values).to.deep.equal({ red: {value: 'rød', sourceFiles: []}, blue: {value: 'blå', sourceFiles: []} });
	});

	it('should sort keys alphabetically', () => {
		collection = new TranslationCollection({ red: {value: 'rød', sourceFiles: []}, green: {value: 'grøn', sourceFiles: []}, blue: {value: 'blå', sourceFiles: []} });
		collection = collection.sort();
		expect(collection.keys()).deep.equal(['blue', 'green', 'red']);
	});

	it('should map values', () => {
		collection = new TranslationCollection({ red: {value: 'rød', sourceFiles: []}, green: {value: 'grøn', sourceFiles: []}, blue: {value: 'blå', sourceFiles: []} });
		collection = collection.map((key, val) => ({value: 'mapped value', sourceFiles: []}));
		expect(collection.values).to.deep.equal({
			red: {value: 'mapped value', sourceFiles: []},
			green: {value: 'mapped value', sourceFiles: []},
			blue: {value: 'mapped value', sourceFiles: []}
		});
	});
});
