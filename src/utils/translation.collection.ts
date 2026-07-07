import { normalizeFilePath } from './fs-helpers.js';
import { objectMap } from './utils.js';

export interface TranslationType {
	[key: string]: TranslationInterface;
}

export interface TranslationInterface {
	value: string | null;
	sourceFiles: string[];
}

export class TranslationCollection {
	public values: TranslationType = {};

	public constructor(values: TranslationType = {}) {
		this.values = values;
	}

	public add(key: string, val: string, sourceFile: string): TranslationCollection {
		const translation = this.values[key] ? { ...this.values[key] } : { value: val, sourceFiles: [] };
		translation.sourceFiles.push(normalizeFilePath(sourceFile));
		return new TranslationCollection({ ...this.values, [key]: translation });
	}

	public addKeys(keys: string[], sourceFile: string): TranslationCollection {
		const normalizedSourceFile = normalizeFilePath(sourceFile);
		const values: TranslationType = { ...this.values };
		for (const key of keys) {
			values[key] = { value: '', sourceFiles: [normalizedSourceFile] };
		}
		return new TranslationCollection(values);
	}

	public remove(key: string): TranslationCollection {
		return this.filter((k) => key !== k);
	}

	public forEach(callback: (key: string, val: TranslationInterface) => void): TranslationCollection {
		Object.keys(this.values).forEach((key) => callback.call(this, key, this.values[key]));
		return this;
	}

	public filter(callback: (key: string, val: TranslationInterface) => boolean): TranslationCollection {
		const values: TranslationType = {};
		this.forEach((key, val) => {
			if (callback.call(this, key, val)) {
				values[key] = val;
			}
		});
		return new TranslationCollection(values);
	}

	public map(callback: (key: string, val: TranslationInterface) => TranslationInterface): TranslationCollection {
		const values: TranslationType = {};
		this.forEach((key, val) => {
			values[key] = callback.call(this, key, val);
		});
		return new TranslationCollection(values);
	}

	public union(collection: TranslationCollection): TranslationCollection {
		return new TranslationCollection({ ...this.values, ...collection.values });
	}

	public intersect(collection: TranslationCollection): TranslationCollection {
		const values: TranslationType = {};
		this.filter((key) => collection.has(key)).forEach((key, val) => {
			values[key] = val;
		});

		return new TranslationCollection(values);
	}

	public has(key: string): boolean {
		return Object.hasOwn(this.values, key);
	}

	public get(key: string): TranslationInterface {
		return this.values[key];
	}

	public keys(): string[] {
		return Object.keys(this.values);
	}

	public count(): number {
		return Object.keys(this.values).length;
	}

	public isEmpty(): boolean {
		return Object.keys(this.values).length === 0;
	}

	public sort(compareFn?: (a: string, b: string) => number): TranslationCollection {
		const values: TranslationType = {};
		this.keys()
			.sort(compareFn)
			.forEach((key) => {
				values[key] = this.get(key);
			});

		return new TranslationCollection(values);
	}

	public toKeyValueObject(): { [key: string]: string | null } {
		return objectMap(this.values, (value) => value.value);
	}

	public stripKeyPrefix(prefix: string): TranslationCollection {
		const cleanedValues: TranslationType = {};
		const lowercasePrefix = prefix.toLowerCase();
		for (const key in this.values) {
			if (this.has(key)) {
				const lowercaseKey = key.toLowerCase();
				if (lowercaseKey.startsWith(lowercasePrefix)) {
					const cleanedKey = key.substring(prefix.length);
					cleanedValues[cleanedKey] = this.values[key];
				} else {
					cleanedValues[key] = this.values[key];
				}
			}
		}

		return new TranslationCollection(cleanedValues);
	}
}
