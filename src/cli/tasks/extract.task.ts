import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

import { globSync } from 'glob';

import type { CacheInterface } from '../../cache/cache-interface.js';
import { NullCache } from '../../cache/null-cache.js';
import { CompilerInterface } from '../../compilers/compiler.interface.js';
import { JsonCompiler } from '../../compilers/json.compiler.js';
import { ParserInterface } from '../../parsers/parser.interface.js';
import { PostProcessorInterface } from '../../post-processors/post-processor.interface.js';
import { clearAstCache } from '../../utils/ast-helpers.js';
import { cyan, green, bold, dim, red } from '../../utils/cli-color.js';
import { TranslationCollection, TranslationType } from '../../utils/translation.collection.js';
import type { ExtractWorkerData, ExtractWorkItem, ExtractWorkResult } from './extract.worker.js';
import { ParserDescriptor } from './parser-descriptor.js';
import { TaskInterface } from './task.interface.js';

interface PendingExtraction {
	cached: TranslationType[];
	items: ExtractWorkItem[];
	skipped: number;
}

const PARALLEL_FILE_THRESHOLD = 200;
const MAX_WORKERS = 8;

export interface ExtractTaskOptionsInterface {
	replace?: boolean;
}

export class ExtractTask implements TaskInterface {
	protected options: ExtractTaskOptionsInterface = {
		replace: false,
	};

	protected parsers: ParserInterface[] = [];
	protected postProcessors: PostProcessorInterface[] = [];
	protected compiler: CompilerInterface = new JsonCompiler();
	protected cache: CacheInterface<TranslationType[]> = new NullCache<TranslationType[]>();

	public constructor(
		protected inputs: string[],
		protected outputs: string[],
		options?: ExtractTaskOptionsInterface,
	) {
		this.inputs = inputs.map((input) => path.resolve(input));
		this.outputs = outputs.map((output) => path.resolve(output));
		this.options = { ...this.options, ...options };
	}

	public execute(): void {
		this.printEnabledParsers();
		this.printEnabledPostProcessors();
		this.printEnabledCompiler();

		this.out(bold('Extracting:'));
		const pending = this.collectPending();
		this.write(this.collect(pending, this.extractInline(pending.items)));
	}

	/**
	 * Same output as `execute`, but spreads parsing across worker threads when there are enough
	 * files to be worth it. Separate from `execute` so the synchronous signature keeps working.
	 */
	public async executeAsync(): Promise<void> {
		this.printEnabledParsers();
		this.printEnabledPostProcessors();
		this.printEnabledCompiler();

		this.out(bold('Extracting:'));
		const pending = this.collectPending();
		const descriptors = this.describeParsers();
		const workerCount = this.resolveWorkerCount(pending.items.length, descriptors);

		const results =
			workerCount > 1 && descriptors
				? await this.extractInWorkers(pending.items, workerCount, descriptors)
				: this.extractInline(pending.items);

		this.write(this.collect(pending, results));
	}

	protected write(extracted: TranslationCollection): void {
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
	 * Reads every input file, answering the cache up front so only misses need parsing.
	 */
	protected collectPending(): PendingExtraction {
		const cached: TranslationType[] = [];
		const items: ExtractWorkItem[] = [];
		let skipped = 0;

		this.inputs.forEach((pattern) => {
			this.getFiles(pattern).forEach((filePath) => {
				const contents: string = fs.readFileSync(filePath, 'utf-8');
				const cacheKey = `${pattern}:${filePath}:${contents}`;

				if (this.cache.has?.(cacheKey)) {
					skipped += 1;
					cached.push(...this.cache.get(cacheKey, () => []));
					return;
				}

				items.push({ cacheKey, filePath, contents });
			});
		});

		return { cached, items, skipped };
	}

	protected collect(pending: PendingExtraction, results: ExtractWorkResult[]): TranslationCollection {
		const collectionTypes = [...pending.cached];
		results.forEach(({ cacheKey, filePath, values }) => {
			this.out(dim('- %s'), filePath);
			collectionTypes.push(...this.cache.get(cacheKey, () => values));
		});

		if (pending.skipped) {
			this.out(dim('- %s unchanged files skipped via cache'), pending.skipped);
		}

		const values: TranslationType = {};
		for (const collectionType of collectionTypes) {
			Object.assign(values, collectionType);
		}

		return new TranslationCollection(values);
	}

	/**
	 * Parsers that can't describe themselves (custom implementations) keep extraction on one thread,
	 * since a worker has no way to rebuild them.
	 */
	protected describeParsers(): ParserDescriptor[] | undefined {
		const descriptors = this.parsers.map((parser) => parser.describe?.());
		return descriptors.every((descriptor) => !!descriptor) ? (descriptors as ParserDescriptor[]) : undefined;
	}

	/**
	 * Workers only pay off once their startup cost is amortised over enough files, and they can
	 * only be used when the caller supplied a recipe for rebuilding the parsers inside them.
	 */
	protected resolveWorkerCount(pendingCount: number, descriptors: ParserDescriptor[] | undefined): number {
		if (!descriptors || pendingCount < PARALLEL_FILE_THRESHOLD) {
			return 1;
		}

		const available = Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
		return Math.max(1, Math.min(available, MAX_WORKERS, Math.floor(pendingCount / PARALLEL_FILE_THRESHOLD)));
	}

	protected extractInline(items: ExtractWorkItem[]): ExtractWorkResult[] {
		return items.map(({ cacheKey, filePath, contents }) => {
			const values = this.parsers
				.map((parser) => parser.extract(contents, filePath).values)
				.filter((result) => Object.keys(result).length > 0);
			clearAstCache();
			return { cacheKey, filePath, values };
		});
	}

	protected extractInWorkers(
		items: ExtractWorkItem[],
		workerCount: number,
		descriptors: ParserDescriptor[],
	): Promise<ExtractWorkResult[]> {
		const workerUrl = new URL('./extract.worker.js', import.meta.url);
		const chunkSize = Math.ceil(items.length / workerCount);
		const chunks: ExtractWorkItem[][] = [];
		for (let i = 0; i < items.length; i += chunkSize) {
			chunks.push(items.slice(i, i + chunkSize));
		}

		return Promise.all(
			chunks.map(
				(chunk) =>
					new Promise<ExtractWorkResult[]>((resolve, reject) => {
						const worker = new Worker(workerUrl, {
							workerData: { descriptors, items: chunk } satisfies ExtractWorkerData,
						});
						worker.once('message', resolve);
						worker.once('error', reject);
						worker.once('exit', (code) => {
							if (code !== 0) {
								reject(new Error(`Extraction worker stopped with exit code ${code}`));
							}
						});
					}),
			),
		).then((results) => results.flat());
	}

	/**
	 * Run strings through configured post processors
	 */
	protected process(
		draft: TranslationCollection,
		extracted: TranslationCollection,
		existing: TranslationCollection,
	): TranslationCollection {
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
		return globSync(sanitizedPattern, { nodir: true });
	}

	protected out(...args: unknown[]): void {
		console.log.apply(this, args);
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
