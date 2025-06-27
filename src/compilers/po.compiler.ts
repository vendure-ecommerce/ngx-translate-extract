import { po } from 'gettext-parser';

import { CompilerInterface, CompilerOptions } from './compiler.interface.js';
import { TranslationCollection, TranslationInterface, TranslationType } from '../utils/translation.collection.js';

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

		return po.compile(data, {}).toString('utf8');
	}

	public parse(contents: string): TranslationCollection {
		const parsedPo = po.parse(contents, { defaultCharset: 'utf8' });
		const poTranslations = parsedPo.translations?.[this.domain];

		if (!poTranslations) {
			return new TranslationCollection();
		}

		const translationEntries = Object.entries(poTranslations)
		const convertedTranslations: TranslationType = {};
		for (const [msgid, message] of translationEntries) {
			if (msgid === this.domain) {
				continue;
			}

			convertedTranslations[msgid] = {
				value: message.msgstr.at(-1),
				sourceFiles: message.comments?.reference?.split('\n') || []
			};
		}

		return new TranslationCollection(convertedTranslations);
	}
}
