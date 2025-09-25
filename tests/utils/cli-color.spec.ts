import { afterAll, beforeAll, describe, it, expect } from 'vitest';

import { cyan, green, bold, dim, red } from './../../src/utils/cli-color.js';

process.env.FORCE_COLOR = '1';

describe('cli-color', () => {
	const sampleText = 'Sample text';
	let originalForceColor: string | undefined;

	beforeAll(() => {
		originalForceColor = process.env.FORCE_COLOR;
		process.env.FORCE_COLOR = '1';
	});

	afterAll(() => {
		process.env.FORCE_COLOR = originalForceColor;
	});

	it('should wrap text in cyan', () => {
		const result = cyan(sampleText);
		const ANSICyan = `\u001b[36m${sampleText}\u001b[39m`;
		expect(result).toBe(ANSICyan);
	});

	it('should wrap text in green', () => {
		const result = green(sampleText);
		const ANSIGreen = `\u001b[32m${sampleText}\u001b[39m`;
		expect(result).toBe(ANSIGreen);
	});

	it('should wrap text in bold', () => {
		const result = bold(sampleText);
		const ANSIBold = `\u001b[1m${sampleText}\u001b[22m`;
		expect(result).toBe(ANSIBold);
	});

	it('should wrap text in dim', () => {
		const result = dim(sampleText);
		const ANSIDim = `\u001b[2m${sampleText}\u001b[22m`;
		expect(result).toBe(ANSIDim);
	});

	it('should wrap text in red', () => {
		const result = red(sampleText);
		const ANSIRed = `\u001b[31m${sampleText}\u001b[39m`;
		expect(result).toBe(ANSIRed);
	});
});
