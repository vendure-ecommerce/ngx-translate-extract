import {TranslationCollection, TranslationInterface} from '../utils/translation.collection.js';
import { PostProcessorInterface } from './post-processor.interface.js';

export class KeyAsInitialDefaultValuePostProcessor implements PostProcessorInterface {
	public name: string = 'KeyAsInitialDefaultValue';

	public process(draft: TranslationCollection, extracted: TranslationCollection, existing: TranslationCollection): TranslationCollection {
		return draft.map((key: string, val: TranslationInterface): TranslationInterface => val.value === '' && !existing.has(key) ? {value: key, sourceFiles: (val?.sourceFiles || [])} : val);
	}
}
