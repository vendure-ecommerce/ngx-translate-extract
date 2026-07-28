import { DirectiveParser } from '../../parsers/directive.parser.js';
import { FunctionParser } from '../../parsers/function.parser.js';
import { MarkerParser } from '../../parsers/marker.parser.js';
import { ParserInterface } from '../../parsers/parser.interface.js';
import { PipeParser } from '../../parsers/pipe.parser.js';
import { ServiceParser } from '../../parsers/service.parser.js';
import { TranslateFunctionParser } from '../../parsers/translate-function.parser.js';

/**
 * Parser instances can't cross a worker boundary, so the task hands workers this recipe
 * and each one builds its own set.
 */
export type ParserDescriptor =
	| { name: 'pipe' }
	| { name: 'directive' }
	| { name: 'service' }
	| { name: 'translate-function' }
	| { name: 'marker' }
	| { name: 'function'; fnName: string };

export function buildParsers(descriptors: ParserDescriptor[]): ParserInterface[] {
	return descriptors.map((descriptor) => {
		switch (descriptor.name) {
			case 'pipe':
				return new PipeParser();
			case 'directive':
				return new DirectiveParser();
			case 'service':
				return new ServiceParser();
			case 'translate-function':
				return new TranslateFunctionParser();
			case 'marker':
				return new MarkerParser();
			case 'function':
				return new FunctionParser(descriptor.fnName);
		}
	});
}
