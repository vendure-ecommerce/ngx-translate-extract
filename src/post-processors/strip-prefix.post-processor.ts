import { TranslationCollection } from '../utils/translation.collection.js';
import { PostProcessorInterface } from './post-processor.interface.js';

interface Options {
	prefix: string;
}

export class StripPrefixPostProcessor implements PostProcessorInterface {
	public name: string = 'StripPrefix';

	constructor(private options: Options) {}

	public process(draft: TranslationCollection): TranslationCollection {
		return draft.stripKeyPrefix(this.options.prefix);
	}
}
