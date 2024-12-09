import { CompilerInterface, CompilerOptions } from './compiler.interface.js';
import { JsonCompiler } from './json.compiler.js';
import { NamespacedJsonCompiler } from './namespaced-json.compiler.js';
import { PoCompiler } from './po.compiler.js';

export class CompilerFactory {
	public static create(format: string, options?: CompilerOptions): CompilerInterface {
		switch (format) {
			case 'pot':
				return new PoCompiler(options);
			case 'json':
				return new JsonCompiler(options);
			case 'namespaced-json':
				return new NamespacedJsonCompiler(options);
			default:
				throw new Error(`Unknown format: ${format}`);
		}
	}
}
