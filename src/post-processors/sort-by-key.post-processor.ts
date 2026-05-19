import { TranslationCollection } from '../utils/translation.collection.js';
import { PostProcessorInterface } from './post-processor.interface.js';

type SortSensitivity = Intl.CollatorOptions['sensitivity'];

const SORT_SENSITIVITY_SET = new Set(['base', 'accent', 'case', 'variant']);

export class SortByKeyPostProcessor implements PostProcessorInterface {
	public name: string = 'SortByKey';

	// More information on sort sensitivity: https://tc39.es/ecma402/#sec-collator-comparestrings
	// Passing undefined will be treated as 'variant' by default: https://tc39.es/ecma402/#sec-intl.collator
	public sortSensitivity: SortSensitivity | undefined;

	constructor(sortSensitivity: string | undefined) {
		if (isSortSensitivityType(sortSensitivity)) {
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

function isSortSensitivityType(keyInput: string | undefined): keyInput is SortSensitivity | undefined {
	return keyInput === undefined || SORT_SENSITIVITY_SET.has(keyInput);
}
