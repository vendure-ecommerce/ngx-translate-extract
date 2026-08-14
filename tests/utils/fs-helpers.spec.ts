import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import { afterEach, beforeEach, describe, it, expect, vi, MockInstance } from 'vitest';

import { expandPattern, isDirectorySync, normalizeFilePath, normalizePaths } from '../../src/utils/fs-helpers.js';

vi.mock('node:path', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:path')>()),
	sep: '/',
}));

vi.mock('node:fs', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:fs')>()),
	statSync: vi.fn<(path: string) => Partial<fs.Stats>>(),
}));

vi.mock('node:os', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:os')>()),
	homedir: vi.fn<() => string>(() => '/home/user'),
}));

vi.mock('node:process', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:process')>()),
	cwd: vi.fn<() => string>(() => '/home/user/project'),
}));

describe('normalizeFilePath', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should replace the cwd with its base name and convert to POSIX separators', () => {
		expect(normalizeFilePath('/home/user/project/src/file.ts')).toBe('project/src/file.ts');
	});

	it('should handle paths without the cwd correctly', () => {
		expect(normalizeFilePath('/another/path/src/file.ts')).toBe('/another/path/src/file.ts');
	});

	it('should handle Windows-style paths correctly', async () => {
		vi.resetModules();
		// The path.basename method in Node.js is platform-aware which means that when it's called on
		// Linux, path.basename may interpret C:\\Users\\User\\project as a full path rather than just
		// a directory.
		vi.spyOn(path, 'basename').mockImplementation((path: string) => path.split('\\').pop() ?? '');
		vi.spyOn(path, 'sep', 'get').mockReturnValue('\\');
		vi.spyOn(process, 'cwd').mockReturnValue('C:\\Users\\User\\project');
		// Dynamically import module so top-level constants evaluate against the spies
		const { normalizeFilePath } = await import('../../src/utils/fs-helpers.js');

		expect(normalizeFilePath('C:\\Users\\User\\project\\src\\file.ts')).toBe('project/src/file.ts');
	});

	it('should return the base name of the cwd for cwd itself', () => {
		expect(normalizeFilePath('/home/user/project')).toBe('project');
	});
});

describe('expandPattern', () => {
	it('should expand a simple pattern with default separator', () => {
		const result = expandPattern('dir/{en,fr,de}.json');
		expect(result).toEqual(['dir/en.json', 'dir/fr.json', 'dir/de.json']);
	});

	it('should expand a pattern with Windows-style separator', () => {
		vi.spyOn(path, 'sep', 'get').mockReturnValue('\\');
		const result = expandPattern('C:\\Users\\User\\dir\\{en,fr,de}.json');
		expect(result).toEqual(['C:\\Users\\User\\dir\\en.json', 'C:\\Users\\User\\dir\\fr.json', 'C:\\Users\\User\\dir\\de.json']);
		vi.restoreAllMocks();
	});
});

describe('normalizePaths', () => {
	let statSyncMock: MockInstance<typeof fs.statSync>;

	beforeEach(() => {
		statSyncMock = vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as fs.Stats);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return file paths unchanged', () => {
		expect(normalizePaths(['/some/file.json'])).toEqual(['/some/file.json']);
	});

	it('should expand brace patterns', () => {
		expect(normalizePaths(['/some/{en,fr}.json'])).toEqual(['/some/en.json', '/some/fr.json']);
	});

	it('should append each default pattern when path is a directory', () => {
		statSyncMock.mockReturnValue({ isDirectory: () => true } as fs.Stats);
		expect(normalizePaths(['/some/dir'], ['/*.json', '/*.ts'])).toEqual(['/some/dir/*.json', '/some/dir/*.ts']);
	});

	it('should return no entries for a directory when defaultPatterns is empty', () => {
		statSyncMock.mockReturnValue({ isDirectory: () => true } as fs.Stats);
		expect(normalizePaths(['/some/dir'])).toEqual([]);
	});

	it('should handle a mix of files and directories across multiple patterns', () => {
		statSyncMock
			.mockReturnValueOnce({ isDirectory: () => true } as fs.Stats)
			.mockReturnValueOnce({ isDirectory: () => false } as fs.Stats);
		expect(normalizePaths(['/some/dir', '/some/file.json'], ['/*.json'])).toEqual(['/some/dir/*.json', '/some/file.json']);
	});

	it('should re-throw errors that are not ENOENT', () => {
		const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
		statSyncMock.mockImplementation(() => {
			throw error;
		});
		expect(() => normalizePaths(['/restricted/file.json'])).toThrow(error);
	});
});

describe('isDirectorySync', () => {
	let statSyncMock: MockInstance<typeof fs.statSync>;

	beforeEach(() => {
		statSyncMock = vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as fs.Stats);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return true when the path is a directory', () => {
		statSyncMock.mockReturnValue({ isDirectory: () => true } as fs.Stats);

		expect(isDirectorySync('src/components')).toBe(true);
	});

	it('should return false when the path is a file (not a directory)', () => {
		statSyncMock.mockReturnValue({ isDirectory: () => false } as fs.Stats);

		expect(isDirectorySync('src/index.ts')).toBe(false);
	});

	it('should return false when the path does not exist', () => {
		// When `throwIfNoEntry: false` is used, Node.js returns undefined for ENOENT.
		statSyncMock.mockReturnValue(undefined);

		expect(isDirectorySync('missing/folder')).toBe(false);
	});

	it('should return false when statSync throws ENOTDIR (path segment is a file)', () => {
		const error = Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' });
		statSyncMock.mockImplementation(() => {
			throw error;
		});

		const testPath = 'dist/bundle.js/*.map';
		expect(isDirectorySync(testPath)).toBe(false);
	});

	it('should re-throw errors that are not ENOTDIR (e.g., EACCES)', () => {
		const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
		statSyncMock.mockImplementation(() => {
			throw error;
		});

		const testPath = '/restricted/secret-folder';
		expect(() => isDirectorySync(testPath)).toThrow(error);
	});
});
