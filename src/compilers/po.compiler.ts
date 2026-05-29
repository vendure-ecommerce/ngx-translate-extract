import { type GetTextTranslation, type GetTextTranslations, po } from 'gettext-parser';

import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { type CompilerInterface, type CompilerOptions } from './compiler.interface.js';

const GETTEXT_HEADER_ENTRY_MSGID = '';

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
		const translations: Record<string, GetTextTranslation> = Object.create(null);

		for (const [key, entry] of Object.entries(collection.values)) {
			const translation: GetTextTranslation = {
				msgid: key,
				msgstr: entry.value !== null ? [entry.value] : [''], // PO format does not support null values, empty string is used instead
			};

			if (this.includeSources) {
				translation.comments = { reference: entry.sourceFiles.join('\n') };
			}

			translations[key] = translation;
		}

		const data: GetTextTranslations = {
			charset: 'utf-8',
			headers: {
				'mime-version': '1.0',
				'content-type': 'text/plain; charset=utf-8',
				'content-transfer-encoding': '8bit',
			},
			translations: {
				[this.domain]: translations,
			},
		};

		return po.compile(data, {}).toString('utf8');
	}

	public parse(contents: string): TranslationCollection {
		const parsedPo = po.parse(contents, { defaultCharset: 'utf8' });
		const poTranslations = parsedPo.translations?.[this.domain];

		if (!poTranslations) {
			return new TranslationCollection();
		}

		const translationEntries = Object.entries(poTranslations);
		const convertedTranslations: TranslationType = {};
		for (const [msgid, message] of translationEntries) {
			if (msgid === GETTEXT_HEADER_ENTRY_MSGID) {
				continue;
			}

			convertedTranslations[msgid] = {
				value: message.msgstr.at(-1) ?? '',
				sourceFiles: message.comments?.reference?.split('\n') || [],
			};
		}

		return new TranslationCollection(convertedTranslations);
	}
}
