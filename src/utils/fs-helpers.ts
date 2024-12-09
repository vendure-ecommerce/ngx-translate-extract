import { basename, sep, posix } from 'node:path';

import * as os from 'os';
import * as fs from 'fs';
import braces from 'braces';

export function normalizeHomeDir(path: string): string {
	if (path.substring(0, 1) === '~') {
		return `${os.homedir()}/${path.substring(1)}`;
	}
	return path;
}

/**
 * Normalizes a file path by replacing the current working directory (`cwd`)
 * with its base name and converting path separators to POSIX style.
 */
export function normalizeFilePath(filePath: string): string {
	const cwd = 'process' in globalThis ? process.cwd() : '';
	const cwdBaseName = basename(cwd);

	if (!filePath.startsWith(cwd)) {
		return filePath;
	}

	return filePath.replace(cwd, cwdBaseName).replaceAll(sep, posix.sep);
}

export function expandPattern(pattern: string): string[] {
	return braces(pattern, { expand: true, keepEscaping: true });
}

export function normalizePaths(patterns: string[], defaultPatterns: string[] = []): string[] {
	return patterns
		.map((pattern) =>
			expandPattern(pattern)
				.map((path) => {
					path = normalizeHomeDir(path);
					if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
						return defaultPatterns.map((defaultPattern) => path + defaultPattern);
					}
					return path;
				})
				.flat()
		)
		.flat();
}
