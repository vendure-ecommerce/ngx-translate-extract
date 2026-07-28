import { TranslationCollection } from '../utils/translation.collection.js';

export interface ParserInterface {
	extract(source: string, filePath: string): TranslationCollection;

	/**
	 * Cheap text check so files this parser cannot possibly extract from are never parsed.
	 * Must stay conservative: returning false for a file `extract` would have found keys in
	 * drops those keys silently. When unsure, return true.
	 */
	canMatch?(source: string): boolean;
}
