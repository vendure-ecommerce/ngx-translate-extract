import { exec } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, rmSync } from 'node:fs';

import { afterEach, describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const CLI_PATH = resolve(REPOSITORY_ROOT, 'src/cli/cli.ts');
const FIXTURES_PATH = resolve(REPOSITORY_ROOT, 'tests/cli/fixtures/');
const OUTPUT_PATH = resolve(REPOSITORY_ROOT, 'tests/cli/fixtures/tmp');
const OUTPUT_FILE = resolve(OUTPUT_PATH, 'strings.json');

describe('CLI Integration Tests', () => {
	afterEach(() => {
		rmSync(OUTPUT_PATH, { recursive: true, force: true });
	});

	test('extracts translation keys from a component', () =>
		new Promise<void>((done) => {
			exec(`npx tsx ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_FILE}`, (error, stdout) => {
				expect(error).toBeNull();
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('Extracting:'));
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('simple.component.fixture.ts'));
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('Found 2 strings.'));
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('Saving:'));
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('strings.json'));
				expect(stdout.trim()).toStrictEqual(expect.stringContaining('Done.'));

				const extracted = JSON.parse(readFileSync(OUTPUT_FILE, { encoding: 'utf8' }));
				const extractedKeys = Object.keys(extracted);

				expect(Object.keys(extracted).length).toBe(2);
				expect(extractedKeys[0]).toBe('home.welcome');
				expect(extractedKeys[1]).toBe('home.description');

				done();
			});
		}));
});
