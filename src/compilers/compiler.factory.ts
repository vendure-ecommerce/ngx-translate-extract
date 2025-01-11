import { CompilerInterface, CompilerOptions, CompilerType } from './compiler.interface.js';
import { JsonCompiler } from './json.compiler.js';
import { NamespacedJsonCompiler } from './namespaced-json.compiler.js';
import { PoCompiler } from './po.compiler.js';

export class CompilerFactory {
	public static create(format: CompilerType, options?: CompilerOptions): CompilerInterface {
		switch (format) {
			case CompilerType.Pot:
				return new PoCompiler(options);
			case CompilerType.Json:
				return new JsonCompiler(options);
			case CompilerType.NamespacedJson:
				return new NamespacedJsonCompiler(options);
			default:
				throw new Error(`Unknown format: ${format}`);
		}
	}
}
