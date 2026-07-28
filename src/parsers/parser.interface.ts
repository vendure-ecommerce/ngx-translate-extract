import { ParserDescriptor } from '../cli/tasks/parser-descriptor.js';
import { TranslationCollection } from '../utils/translation.collection.js';

export interface ParserInterface {
	extract(source: string, filePath: string): TranslationCollection;

	/**
	 * Recipe for rebuilding this parser inside a worker thread. Parsers that can't describe
	 * themselves keep extraction single-threaded rather than being silently left out.
	 */
	describe?(): ParserDescriptor;
}
