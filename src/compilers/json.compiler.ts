import { flatten } from 'flat';

import { TranslationCollection } from '../utils/translation.collection.js';
import { objectMap, objectSome, stripBOM } from '../utils/utils.js';
import { type CompilerInterface, type CompilerOptions } from './compiler.interface.js';

export class JsonCompiler implements CompilerInterface {
	public indentation: string = '\t';
	public trailingNewline: boolean = false;

	public extension: string = 'json';

	constructor(options?: CompilerOptions) {
		if (options && typeof options.indentation !== 'undefined') {
			this.indentation = options.indentation;
		}
		if (options && typeof options.trailingNewline !== 'undefined') {
			this.trailingNewline = options.trailingNewline;
		}
	}

	public compile(collection: TranslationCollection): string {
		return JSON.stringify(collection.toKeyValueObject(), null, this.indentation) + (this.trailingNewline ? '\n' : '');
	}

	public parse(contents: string): TranslationCollection {
		let values = JSON.parse(stripBOM(contents));
		if (this.isNamespacedJsonFormat(values)) {
			values = flatten(values);
		}
		const newValues = objectMap(values, (value) => ({ value: value === null ? null : `${value}`, sourceFiles: [] }));
		return new TranslationCollection(newValues);
	}

	protected isNamespacedJsonFormat(values: unknown): boolean {
		if (!isObject(values)) {
			return false;
		}

		return objectSome(values, (value) => isObject(value));
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
