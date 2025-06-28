import { basename, sep, posix } from 'node:path';

import * as os from 'node:os';
import * as fs from 'node:fs';
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

/**
 * Expands a pattern with braces, handling Windows-style separators.
 */
export function expandPattern(pattern: string): string[] {
	const isWindows = sep === '\\';

	// Windows escaped separators can cause the brace "{" in the pattern to be also escaped and ignored by braces lib.
	// For that reason we convert separators to posix for braces and then back to the original.
	// For example, without replacing the separators the first case below is not parsed correctly:
	// 'dir\\{en,fr}.json'        => ['dir\\{en,fr}.json'] // Pattern is ignored
	// 'dir\\locale.{en,fr}.json' => ['dir\\locale.en.json', 'dir\\locale.fr.json'] // Pattern is recognised
	const bracesCompatiblePattern = isWindows ? pattern.replaceAll(sep, posix.sep) : pattern;

	const output = braces(bracesCompatiblePattern, { expand: true, keepEscaping: true });

	return isWindows ? output.map((path) => path.replaceAll(posix.sep, sep)) : output;
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
