import { CompilerInterface, CompilerOptions } from './compiler.interface.js';
import {TranslationCollection, TranslationInterface, TranslationType} from '../utils/translation.collection.js';

import pkg from 'gettext-parser';
const { po } = pkg;

export class PoCompiler implements CompilerInterface {
	public extension: string = 'po';

	/**
	 * Translation domain
	 */
	public domain: string = '';

	/** Whether to include file location comments. **/
	private readonly includeSources: boolean = true;

	constructor(options?: CompilerOptions) {
		this.includeSources = options?.poSourceLocation ?? true;
	}

	public compile(collection: TranslationCollection): string {
		const data = {
			charset: 'utf-8',
			headers: {
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8',
				'content-transfer-encoding': '8bit'
			},
			translations: {
				[this.domain]: Object.keys(collection.values)
					.reduce(
						(translations, key) => {
							const entry: TranslationInterface = collection.get(key);
							const comments = this.includeSources ? {reference: entry.sourceFiles?.join('\n')} : undefined;
							return {
								...translations,
								[key]: {
									msgid: key,
									msgstr: entry.value,
									comments: comments
								}
							};
						},
						{}
					)
			}
		};

		return po.compile(data).toString('utf8');
	}

	public parse(contents: string): TranslationCollection {
		const collection = new TranslationCollection();

		const parsedPo = po.parse(contents, 'utf8');

		if (!Object.hasOwn(parsedPo.translations, this.domain)) {
			return collection;
		}

		const values = Object.keys(parsedPo.translations[this.domain])
			.filter((key) => key.length > 0)
			.reduce((result, key) => ({
				...result,
				[key]: {value: parsedPo.translations[this.domain][key].msgstr.pop(), sourceFiles: parsedPo.translations[this.domain][key].comments?.reference?.split('\n') || []}
			}), {} as TranslationType);

		return new TranslationCollection(values);
	}
}
