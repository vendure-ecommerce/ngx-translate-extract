import { statSync } from 'node:fs';
import * as os from 'node:os';
import { basename, sep, posix } from 'node:path';
import { cwd } from 'node:process';

import braces from 'braces';

const CWD = cwd();
const CWD_BASENAME = CWD ? basename(CWD) : '';

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
	if (!CWD || !filePath.startsWith(CWD)) {
		return filePath;
	}

	return filePath.replace(CWD, CWD_BASENAME).replaceAll(sep, posix.sep);
}

/**
 * Expands a pattern with braces, handling Windows-style separators.
 */
export function expandPattern(pattern: string): string[] {
	if (!pattern.includes('{') || !pattern.includes('}')) {
		return [pattern];
	}

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
	return patterns.flatMap((pattern) =>
		expandPattern(pattern).flatMap((path) => {
			const normalizedPath = normalizeHomeDir(path);
			if (isDirectorySync(normalizedPath)) {
				return defaultPatterns.map((defaultPattern) => normalizedPath + defaultPattern);
			}
			return normalizedPath;
		}),
	);
}

/** Checks if a path exists and is a directory in a single syscall. */
export function isDirectorySync(path: string): boolean {
	try {
		return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
	} catch (error) {
		// `throwIfNoEntry` only suppresses ENOENT. If an intermediate segment is a file
		// (e.g. a glob pattern like `dist/bundle.js/*.map`), stat throws ENOTDIR.
		// This definitively means "not a directory", so we return false and let the
		// pattern fall through to glob (which yields no matches) matching the previous
		// existsSync-based behavior. Unresolvable errors propagate.
		if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOTDIR') {
			return false;
		}

		throw error;
	}
}
