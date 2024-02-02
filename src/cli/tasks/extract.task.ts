import { cyan, green, bold, dim, red } from 'colorette';
import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

import { TranslationCollection, TranslationType } from '../../utils/translation.collection.js';
import { TaskInterface } from './task.interface.js';
import { ParserInterface } from '../../parsers/parser.interface.js';
import { PostProcessorInterface } from '../../post-processors/post-processor.interface.js';
import { CompilerInterface } from '../../compilers/compiler.interface.js';
import type { CacheInterface } from '../../cache/cache-interface.js';
import { NullCache } from '../../cache/null-cache.js';

export interface ExtractTaskOptionsInterface {
	replace?: boolean;
}

export class ExtractTask implements TaskInterface {
	protected options: ExtractTaskOptionsInterface = {
		replace: false
	};

	protected parsers: ParserInterface[] = [];
	protected postProcessors: PostProcessorInterface[] = [];
	protected compiler: CompilerInterface;
	protected cache: CacheInterface<TranslationType[]> = new NullCache<TranslationType[]>();

	public constructor(protected inputs: string[], protected outputs: string[], options?: ExtractTaskOptionsInterface) {
		this.inputs = inputs.map((input) => path.resolve(input));
		this.outputs = outputs.map((output) => path.resolve(output));
		this.options = { ...this.options, ...options };
	}

	public execute(): void {
		if (!this.compiler) {
			throw new Error('No compiler configured');
		}

		this.printEnabledParsers();
		this.printEnabledPostProcessors();
		this.printEnabledCompiler();

		this.out(bold('Extracting:'));
		const extracted = this.extract();
		this.out(green('\nFound %d strings.\n'), extracted.count());

		this.out(bold('Saving:'));

		this.outputs.forEach((output) => {
			let dir: string = output;
			let filename: string = `strings.${this.compiler.extension}`;
			if (!fs.existsSync(output) || !fs.statSync(output).isDirectory()) {
				dir = path.dirname(output);
				filename = path.basename(output);
			}

			const outputPath: string = path.join(dir, filename);

			let existing: TranslationCollection = new TranslationCollection();
			if (!this.options.replace && fs.existsSync(outputPath)) {
				try {
					existing = this.compiler.parse(fs.readFileSync(outputPath, 'utf-8'));
				} catch (e) {
					this.out('%s %s', dim(`- ${outputPath}`), red('[ERROR]'));
					throw e;
				}
			}

			// merge extracted strings with existing
			const draft = extracted.union(existing);

			// Run collection through post processors
			const final = this.process(draft, extracted, existing);

			// Save
			try {
				let event = 'CREATED';
				if (fs.existsSync(outputPath)) {
					// eslint-disable-next-line @typescript-eslint/no-unused-expressions
					this.options.replace ? (event = 'REPLACED') : (event = 'MERGED');
				}
				this.save(outputPath, final);
				this.out('%s %s', dim(`- ${outputPath}`), green(`[${event}]`));
			} catch (e) {
				this.out('%s %s', dim(`- ${outputPath}`), red('[ERROR]'));
				throw e;
			}
		});

		this.cache.persist();
	}

	public setParsers(parsers: ParserInterface[]): this {
		this.parsers = parsers;
		return this;
	}

	public setCache(cache: CacheInterface<TranslationType[]>): this {
		this.cache = cache;
		return this;
	}

	public setPostProcessors(postProcessors: PostProcessorInterface[]): this {
		this.postProcessors = postProcessors;
		return this;
	}

	public setCompiler(compiler: CompilerInterface): this {
		this.compiler = compiler;
		return this;
	}

	/**
	 * Extract strings from specified input dirs using configured parsers
	 */
	protected extract(): TranslationCollection {
		const collectionTypes: TranslationType[] = [];
		let skipped = 0;
		this.inputs.forEach((pattern) => {
			this.getFiles(pattern).forEach((filePath) => {
				const contents: string = fs.readFileSync(filePath, 'utf-8');
				skipped += 1;
				const cachedCollectionValues = this.cache.get(`${pattern}:${filePath}:${contents}`, () => {
					skipped -= 1;
					this.out(dim('- %s'), filePath);
					return this.parsers
						.map((parser) => {
							const extracted = parser.extract(contents, filePath);
							return extracted instanceof TranslationCollection ? extracted.values : undefined;
						})
						.filter((result): result is TranslationType => result && !!Object.keys(result).length);
				});

				collectionTypes.push(...cachedCollectionValues);
			});
		});

		if (skipped) {
			this.out(dim('- %s unchanged files skipped via cache'), skipped);
		}

		const values: TranslationType = {};
		for (const collectionType of collectionTypes) {
			Object.assign(values, collectionType);
		}

		return new TranslationCollection(values);
	}

	/**
	 * Run strings through configured post processors
	 */
	protected process(draft: TranslationCollection, extracted: TranslationCollection, existing: TranslationCollection): TranslationCollection {
		this.postProcessors.forEach((postProcessor) => {
			draft = postProcessor.process(draft, extracted, existing);
		});
		return draft;
	}

	/**
	 * Compile and save translations
	 * @param output
	 * @param collection
	 */
	protected save(output: string, collection: TranslationCollection): void {
		const dir = path.dirname(output);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(output, this.compiler.compile(collection));
	}

	/**
	 * Get all files matching pattern
	 */
	protected getFiles(pattern: string): string[] {
		// Ensure that the pattern consistently uses forward slashes ("/")
		// for cross-platform compatibility, as Glob patterns should always use "/"
		const sanitizedPattern = pattern.split(path.sep).join(path.posix.sep);
		return globSync(sanitizedPattern).filter((filePath) => fs.statSync(filePath).isFile());
	}

	protected out(...args: any[]): void {
		console.log.apply(this, arguments);
	}

	protected printEnabledParsers(): void {
		this.out(cyan('Enabled parsers:'));
		if (this.parsers.length) {
			this.out(cyan(dim(this.parsers.map((parser) => `- ${parser.constructor.name}`).join('\n'))));
		} else {
			this.out(cyan(dim('(none)')));
		}
		this.out();
	}

	protected printEnabledPostProcessors(): void {
		this.out(cyan('Enabled post processors:'));
		if (this.postProcessors.length) {
			this.out(cyan(dim(this.postProcessors.map((postProcessor) => `- ${postProcessor.constructor.name}`).join('\n'))));
		} else {
			this.out(cyan(dim('(none)')));
		}
		this.out();
	}

	protected printEnabledCompiler(): void {
		this.out(cyan('Compiler:'));
		this.out(cyan(dim(`- ${this.compiler.constructor.name}`)));
		this.out();
	}
}
