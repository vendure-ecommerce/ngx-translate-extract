import * as path from 'node:path';

import { afterEach, beforeEach, describe, it, expect, vi, MockInstance } from 'vitest';

import { expandPattern, normalizeFilePath } from '../../src/utils/fs-helpers';

vi.mock('node:path', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:path')>()),
	sep: '/'
}));

describe('normalizeFilePath', () => {
	let processCwdMock: MockInstance<() => string>;

	beforeEach(() => {
		processCwdMock = vi.spyOn(process, 'cwd').mockReturnValue('/home/user/project');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should replace the cwd with its base name and convert to POSIX separators', () => {
		expect(normalizeFilePath('/home/user/project/src/file.ts')).toBe('project/src/file.ts');
	});

	it('should handle paths without the cwd correctly', () => {
		expect(normalizeFilePath('/another/path/src/file.ts')).toBe('/another/path/src/file.ts');
	});

	it('should handle Windows-style paths correctly', () => {
		processCwdMock.mockReturnValue('C:\\Users\\User\\project');
		// The path.basename method in Node.js is platform-aware which means that when it's called on
		// Linux, path.basename may interpret C:\\Users\\User\\project as a full path rather than just
		// a directory.
		vi.spyOn(path, 'basename').mockImplementation((path: string) => path.split('\\').pop() ?? '');
		vi.spyOn(path, 'sep', 'get').mockReturnValue('\\');
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
		expect(result).toEqual([
			'C:\\Users\\User\\dir\\en.json',
			'C:\\Users\\User\\dir\\fr.json',
			'C:\\Users\\User\\dir\\de.json',
		]);
	});
});
