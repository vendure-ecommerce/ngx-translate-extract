import { TranslationCollection } from '../utils/translation.collection.js';
import { PostProcessorInterface } from './post-processor.interface.js';

export class SortByKeyPostProcessor implements PostProcessorInterface {
	public name: string = 'SortByKey';

	public process(draft: TranslationCollection, extracted: TranslationCollection, existing: TranslationCollection): TranslationCollection {
		const compareFn = new Intl.Collator('en', {sensitivity: 'base'}).compare;
		return draft.sort(compareFn);
	}
}
