import type { CacheInterface } from './cache-interface.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const getHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export class FileCache<RESULT extends object = object> implements CacheInterface<RESULT> {
	private tapped: Record<string, RESULT> = {};
	private cached?: Readonly<Record<string, RESULT>> = undefined;
	private originalCache?: string;
	private versionHash?: string;

	constructor(private cacheFile: string) {}

	public get<KEY extends string>(uniqueContents: KEY, generator: () => RESULT): RESULT {
		if (!this.cached) {
			this.readCache();
			this.versionHash = this.getVersionHash();
		}

		const key = getHash(`${this.versionHash}${uniqueContents}`);

		if (key in this.cached) {
			this.tapped[key] = this.cached[key];

			return this.cached[key];
		}

		return (this.tapped[key] = generator());
	}

	public persist(): void {
		const newCache = JSON.stringify(this.sortByKey(this.tapped), null, 2);
		if (newCache === this.originalCache) {
			return;
		}

		const file = this.getCacheFile();
		const dir = path.dirname(file);

		const stats = fs.statSync(dir, { throwIfNoEntry: false });
		if (!stats) {
			fs.mkdirSync(dir);
		}

		const tmpFile = `${file}~${getHash(newCache)}`;

		fs.writeFileSync(tmpFile, newCache, { encoding: 'utf-8' });
		fs.rmSync(file, { force: true, recursive: false });
		fs.renameSync(tmpFile, file);
	}

	private sortByKey(unordered: Record<string, RESULT>): Record<string, RESULT> {
		return Object.keys(unordered)
			.sort()
			.reduce((obj, key) => {
				obj[key] = unordered[key];
				return obj;
			}, {} as Record<string, RESULT>);
	}

	private readCache(): void {
		try {
			this.originalCache = fs.readFileSync(this.getCacheFile(), { encoding: 'utf-8' });
			this.cached = JSON.parse(this.originalCache) ?? {};
		} catch {
			this.originalCache = undefined;
			this.cached = {};
		}
	}

	private getVersionHash(): string {
		const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
		const packageJson = fs.readFileSync(path.join(projectRoot, 'package.json'), { encoding: 'utf-8' });

		return getHash(packageJson);
	}

	private getCacheFile(): string {
		return `${this.cacheFile}-ngx-translate-extract-cache.json`;
	}
}
