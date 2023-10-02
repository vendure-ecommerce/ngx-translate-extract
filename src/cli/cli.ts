import yargs from 'yargs';
import { green, red } from 'colorette';

import { ExtractTask } from './tasks/extract.task.js';
import { ParserInterface } from '../parsers/parser.interface.js';
import { PipeParser } from '../parsers/pipe.parser.js';
import { DirectiveParser } from '../parsers/directive.parser.js';
import { ServiceParser } from '../parsers/service.parser.js';
import { MarkerParser } from '../parsers/marker.parser.js';
import { FunctionParser } from '../parsers/function.parser.js';
import { PostProcessorInterface } from '../post-processors/post-processor.interface.js';
import { SortByKeyPostProcessor } from '../post-processors/sort-by-key.post-processor.js';
import { KeyAsDefaultValuePostProcessor } from '../post-processors/key-as-default-value.post-processor.js';
import { NullAsDefaultValuePostProcessor } from '../post-processors/null-as-default-value.post-processor.js';
import { StringAsDefaultValuePostProcessor } from '../post-processors/string-as-default-value.post-processor.js';
import { PurgeObsoleteKeysPostProcessor } from '../post-processors/purge-obsolete-keys.post-processor.js';
import { StripPrefixPostProcessor } from '../post-processors/strip-prefix.post-processor.js';
import { CompilerInterface } from '../compilers/compiler.interface.js';
import { CompilerFactory } from '../compilers/compiler.factory.js';
import { normalizePaths } from '../utils/fs-helpers.js';

// First parsing pass to be able to access pattern argument for use input/output arguments
const y = yargs().option('patterns', {
	alias: 'p',
	describe: 'Default patterns',
	type: 'array',
	default: ['/**/*.html', '/**/*.ts'],
	hidden: true
});

const parsed = y.parse() as any; // temporary any

export const cli: any = y // temporary any
	.usage('Extract strings from files for translation.\nUsage: $0 [options]')
	.version(process.env.npm_package_version)
	.alias('version', 'v')
	.help('help')
	.alias('help', 'h')
	.option('input', {
		alias: 'i',
		describe: 'Paths you would like to extract strings from. You can use path expansion, glob patterns and multiple paths',
		default: [process.env.PWD],
		type: 'array',
		normalize: true,
		required: true
	})
	.coerce('input', (input: string[]) => normalizePaths(input, parsed.patterns))
	.option('output', {
		alias: 'o',
		describe: 'Paths where you would like to save extracted strings. You can use path expansion, glob patterns and multiple paths',
		type: 'array',
		normalize: true,
		required: true
	})
	.coerce('output', (output: string[]) => normalizePaths(output, parsed.patterns))
	.option('format', {
		alias: 'f',
		describe: 'Format',
		default: 'json',
		type: 'string',
		choices: ['json', 'namespaced-json', 'pot']
	})
	.option('format-indentation', {
		alias: 'fi',
		describe: 'Format indentation (JSON/Namedspaced JSON)',
		default: '\t',
		type: 'string'
	})
	.option('replace', {
		alias: 'r',
		describe: 'Replace the contents of output file if it exists (Merges by default)',
		type: 'boolean'
	})
	.option('sort', {
		alias: 's',
		describe: 'Sort strings in alphabetical order',
		type: 'boolean'
	})
	.option('clean', {
		alias: 'c',
		describe: 'Remove obsolete strings after merge',
		type: 'boolean'
	})
	.option('marker', {
		alias: 'm',
		describe: 'Name of a custom marker function for extracting strings',
		type: 'string',
		default: undefined
	})
	.option('key-as-default-value', {
		alias: 'k',
		describe: 'Use key as default value',
		type: 'boolean',
		conflicts: ['null-as-default-value', 'string-as-default-value']
	})
	.option('null-as-default-value', {
		alias: 'n',
		describe: 'Use null as default value',
		type: 'boolean',
		conflicts: ['key-as-default-value', 'string-as-default-value']
	})
	.option('string-as-default-value', {
		alias: 'd',
		describe: 'Use string as default value',
		type: 'string',
		conflicts: ['null-as-default-value', 'key-as-default-value']
	})
	.option('strip-prefix', {
		alias: 'sp',
		describe: 'Strip a prefix from the extracted key',
		type: 'string'
	})
	.group(['format', 'format-indentation', 'sort', 'clean', 'replace', 'strip-prefix'], 'Output')
	.group(['key-as-default-value', 'null-as-default-value', 'string-as-default-value'], 'Extracted key value (defaults to empty string)')
	.conflicts('key-as-default-value', 'null-as-default-value')
	.example('$0 -i ./src-a/ -i ./src-b/ -o strings.json', 'Extract (ts, html) from multiple paths')
	.example("$0 -i './{src-a,src-b}/' -o strings.json", 'Extract (ts, html) from multiple paths using brace expansion')
	.example('$0 -i ./src/ -o ./i18n/da.json -o ./i18n/en.json', 'Extract (ts, html) and save to da.json and en.json')
	.example("$0 -i ./src/ -o './i18n/{en,da}.json'", 'Extract (ts, html) and save to da.json and en.json using brace expansion')
	.example("$0 -i './src/**/*.{ts,tsx,html}' -o strings.json", 'Extract from ts, tsx and html')
	.example("$0 -i './src/**/!(*.spec).{ts,html}' -o strings.json", 'Extract from ts, html, excluding files with ".spec" in filename')
	.example("$0 -i ./src/ -o strings.json -sp 'PREFIX.'", "Strip the prefix 'PREFIX.' from the json keys")
	.wrap(110)
	.exitProcess(true)
	.parse(process.argv);

const extractTask = new ExtractTask(cli.input, cli.output, {
	replace: cli.replace
});

// Parsers
const parsers: ParserInterface[] = [new PipeParser(), new DirectiveParser(), new ServiceParser()];
if (cli.marker) {
	parsers.push(new FunctionParser(cli.marker));
} else {
	parsers.push(new MarkerParser());
}
extractTask.setParsers(parsers);

// Post processors
const postProcessors: PostProcessorInterface[] = [];
if (cli.clean) {
	postProcessors.push(new PurgeObsoleteKeysPostProcessor());
}
if (cli.keyAsDefaultValue) {
	postProcessors.push(new KeyAsDefaultValuePostProcessor());
} else if (cli.nullAsDefaultValue) {
	postProcessors.push(new NullAsDefaultValuePostProcessor());
} else if (cli.stringAsDefaultValue) {
	postProcessors.push(new StringAsDefaultValuePostProcessor({ defaultValue: cli.stringAsDefaultValue as string }));
}

if (cli.stripPrefix) {
	postProcessors.push(new StripPrefixPostProcessor({ prefix: cli.stripPrefix as string }));
}

if (cli.sort) {
	postProcessors.push(new SortByKeyPostProcessor());
}
extractTask.setPostProcessors(postProcessors);

// Compiler
const compiler: CompilerInterface = CompilerFactory.create(cli.format, {
	indentation: cli.formatIndentation
});
extractTask.setCompiler(compiler);

// Run task
try {
	extractTask.execute();
	console.log(green('\nDone.\n'));
	process.exit(0);
} catch (e) {
	console.log(red(`\nAn error occurred: ${e}\n`));
	process.exit(1);
}
