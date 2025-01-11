import { CompilerInterface, CompilerOptions } from './compiler.interface.js';
import {TranslationCollection, TranslationInterface, TranslationType} from '../utils/translation.collection.js';
import { stripBOM } from '../utils/utils.js';

import { flatten } from 'flat';

export class JsonCompiler implements CompilerInterface {
	public indentation: string = '\t';

	public extension: string = 'json';

	constructor(options?: CompilerOptions) {
		if (options && typeof options.indentation !== 'undefined') {
			this.indentation = options.indentation;
		}
	}

	public compile(collection: TranslationCollection): string {
		return JSON.stringify(collection.toKeyValueObject(), null, this.indentation);
	}

	public parse(contents: string): TranslationCollection {
		let values = JSON.parse(stripBOM(contents));
		if (this.isNamespacedJsonFormat(values)) {
			values = flatten(values);
		}
		const newValues: TranslationType = {};
		Object.entries(values).forEach(([key, value]: [string, string]) => newValues[key] = <TranslationInterface>{value: value, sourceFiles: []});
		return new TranslationCollection(newValues);
	}

	protected isNamespacedJsonFormat(values: unknown): boolean {
		if (!isObject(values)) {
			return false;
		}

		return Object.keys(values).some((key) => typeof values[key] === 'object');
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
