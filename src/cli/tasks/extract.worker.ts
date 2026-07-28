import { parentPort, workerData } from 'node:worker_threads';

import { clearAstCache } from '../../utils/ast-helpers.js';
import { TranslationType } from '../../utils/translation.collection.js';
import { buildParsers, ParserDescriptor } from './parser-descriptor.js';

export interface ExtractWorkItem {
	cacheKey: string;
	filePath: string;
	contents: string;
}

export interface ExtractWorkerData {
	descriptors: ParserDescriptor[];
	items: ExtractWorkItem[];
}

export interface ExtractWorkResult {
	cacheKey: string;
	filePath: string;
	values: TranslationType[];
}

const { descriptors, items } = workerData as ExtractWorkerData;
const parsers = buildParsers(descriptors);

const results: ExtractWorkResult[] = items.map(({ cacheKey, filePath, contents }) => {
	const values = parsers.map((parser) => parser.extract(contents, filePath).values).filter((result) => Object.keys(result).length > 0);
	clearAstCache();
	return { cacheKey, filePath, values };
});

parentPort?.postMessage(results);
