import { describe, beforeEach, expect, it } from 'vitest';

import { PostProcessorInterface } from '../../src/post-processors/post-processor.interface.js';
import { KeyAsInitialDefaultValuePostProcessor } from '../../src/post-processors/key-as-initial-default-value.post-processor.js';
import { TranslationCollection } from '../../src/utils/translation.collection.js';

describe('KeyAsInitialDefaultValuePostProcessor', () => {
	let processor: PostProcessorInterface;

	beforeEach(() => {
		processor = new KeyAsInitialDefaultValuePostProcessor();
	});

	it('should use key as default value', () => {
		const collection = new TranslationCollection({
			'I have no value': { value: '', sourceFiles: [] },
			'I have no value but I exist': { value: '', sourceFiles: [] },
			'I am already translated': { value: 'Jeg er allerede oversat', sourceFiles: [] },
			'Use this key as value as well': { value: '', sourceFiles: ['path/to/file.ts'] }
		});
		const extracted = new TranslationCollection();
		const existing = new TranslationCollection({
			'I have no value but I exist': { value: '', sourceFiles: [] }
		});

		expect(processor.process(collection, extracted, existing).values).to.deep.equal({
			'I have no value': { value: 'I have no value', sourceFiles: [] },
			'I have no value but I exist': { value: '', sourceFiles: [] },
			'I am already translated': { value: 'Jeg er allerede oversat', sourceFiles: [] },
			'Use this key as value as well': { value: 'Use this key as value as well', sourceFiles: ['path/to/file.ts'] }
		});
	});
});
