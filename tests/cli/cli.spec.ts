import { exec } from 'node:child_process';
import { access, readdir, readFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, test } from 'vitest';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const FIXTURES_PATH = resolve(REPOSITORY_ROOT, 'tests/cli/fixtures/');
const TMP_PATH = resolve(REPOSITORY_ROOT, 'tests/cli/tmp');
const CLI_PATH = resolve(TMP_PATH, 'dist/cli/cli.js');

let nextFileId = 0;
const createUniqueFileName = (fileName: string) => resolve(TMP_PATH, `${nextFileId++}-${fileName}`);

describe.concurrent('CLI Integration Tests', () => {
	beforeAll(async () => {
		try {
			await execAsync(`npm run build -- --outDir ${TMP_PATH}/dist`);
		} catch (err) {
			console.error('Error during build in beforeAll:', err);
			throw err;
		}
	});

	afterAll(async () => {
		await rm(TMP_PATH, { recursive: true });
	});

	test('shows the expected output when extracting', async ({expect}) => {
		const OUTPUT_FILE = createUniqueFileName('strings.json');
		const fixtureFiles = await readdir(FIXTURES_PATH);
		const { stdout } = await execAsync(`node ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_FILE} --format=json`);

		expect(stdout).toContain('Extracting:');
		fixtureFiles.forEach(file => expect(stdout).toContain(file));

		expect(stdout).toContain('Found 15 strings.');
		expect(stdout).toContain('Saving:');

		expect(stdout).toContain(OUTPUT_FILE);
		expect(stdout).toContain('Done.');
	})

	test('extracts translation keys to a .json file', async ({ expect }) => {
		const OUTPUT_FILE = createUniqueFileName('strings.json');
		await execAsync(`node ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_FILE} --format=json`);

		const extracted = await readFile(OUTPUT_FILE, { encoding: 'utf8' });

		expect(extracted).toMatchSnapshot();
	});

	test('extracts translation keys to multiple files', async ({ expect, task }) => {
		const OUTPUT_PATH = resolve(TMP_PATH, task.id);
		const OUTPUT_PATTERN = resolve(OUTPUT_PATH, '{en,fr}.json');
		const EXPECTED_EN_FILE = resolve(OUTPUT_PATH, 'en.json');
		const EXPECTED_FR_FILE = resolve(OUTPUT_PATH, 'fr.json');

		await execAsync(`node ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_PATTERN} --format=json`);

		await expect(Promise.all([access(EXPECTED_EN_FILE), access(EXPECTED_FR_FILE)])).resolves.not.toThrow();
	});

	test('extracts translation keys to a .po file', async ({ expect }) => {
		const OUTPUT_FILE = createUniqueFileName('strings.po');
		await execAsync(`node ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_FILE} --format=pot`);

		const extracted = await readFile(OUTPUT_FILE, { encoding: 'utf8' });

		expect(extracted).toMatchSnapshot();
	});

	test('extracts translation keys to a .po file without file location comments', async ({ expect }) => {
		const OUTPUT_FILE = createUniqueFileName('strings.po');
		await execAsync(`node ${CLI_PATH} --input ${FIXTURES_PATH} --output ${OUTPUT_FILE} --format=pot --no-po-source-locations`);

		const extracted = await readFile(OUTPUT_FILE, { encoding: 'utf8' });

		expect(extracted).toMatchSnapshot();
	});
});
