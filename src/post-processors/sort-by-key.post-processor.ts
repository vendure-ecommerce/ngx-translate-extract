import { TranslationCollection } from '../utils/translation.collection.js';
import { PostProcessorInterface } from './post-processor.interface.js';

export class SortByKeyPostProcessor implements PostProcessorInterface {
	public name: string = 'SortByKey';

	// More information on sort sensitivity: https://tc39.es/ecma402/#sec-collator-comparestrings
	// Passing undefined will be treated as 'variant' by default: https://tc39.es/ecma402/#sec-intl.collator
	public sortSensitivity: 'base' | 'accent' | 'case' | 'variant' | undefined = undefined;

	constructor(sortSensitivity: string | undefined) {
		if (isOfTypeSortSensitivity(sortSensitivity)) {
			this.sortSensitivity = sortSensitivity;
		} else {
			throw new Error(`Unknown sortSensitivity: ${sortSensitivity}`);
		}
	}

	public process(draft: TranslationCollection): TranslationCollection {
		const compareFn = this.sortSensitivity ? new Intl.Collator('en', { sensitivity: this.sortSensitivity }).compare : undefined;
		return draft.sort(compareFn);
	}
}

function isOfTypeSortSensitivity(keyInput: string | undefined): keyInput is 'base' | 'accent' | 'case' | 'variant' | undefined {
	return ['base', 'accent', 'case', 'variant'].includes(keyInput) || keyInput === undefined;
}
