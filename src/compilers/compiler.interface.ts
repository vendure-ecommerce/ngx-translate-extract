import { TranslationCollection } from '../utils/translation.collection.js';

export enum CompilerType {
	Pot = 'pot',
	Json = 'json',
	NamespacedJson = 'namespaced-json',
}

export interface CompilerOptions {
	indentation?: string;
	poSourceLocation?: boolean;
}

export interface CompilerInterface {
	extension: string;

	compile(collection: TranslationCollection): string;

	parse(contents: string): TranslationCollection;
}
