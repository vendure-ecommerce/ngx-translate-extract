import { CompilerInterface, CompilerOptions } from './compiler.interface.js';
import {TranslationCollection, TranslationInterface, TranslationType} from '../utils/translation.collection.js';
import { stripBOM } from '../utils/utils.js';

import { flatten, unflatten } from 'flat';

export class NamespacedJsonCompiler implements CompilerInterface {
	public indentation: string = '\t';
	public trailingNewline: boolean = false;

	public extension = 'json';

	constructor(options?: CompilerOptions) {
		if (options && typeof options.indentation !== 'undefined') {
			this.indentation = options.indentation;
		}
		if (options && typeof options.trailingNewline !== 'undefined') {
			this.trailingNewline = options.trailingNewline;
		}
	}

	public compile(collection: TranslationCollection): string {
		const values = unflatten(
			collection.toKeyValueObject(),
			{object: true, overwrite: true}
		);
		return JSON.stringify(values, null, this.indentation) + (this.trailingNewline ? '\n' : '');
	}

	public parse(contents: string): TranslationCollection {
		const values: Record<string, string> = flatten(JSON.parse(stripBOM(contents)));
		const newValues: TranslationType = {};
		Object.entries(values).forEach(([key, value]: [string, string]) => newValues[key] = <TranslationInterface>{value: value, sourceFiles: []});
		return new TranslationCollection(newValues);
	}
}
