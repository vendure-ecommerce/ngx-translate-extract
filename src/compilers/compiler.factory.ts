import { CompilerInterface } from './compiler.interface';
import { JsonCompiler } from './json.compiler';
import { NamespacedJsonCompiler } from './namespaced-json.compiler';
import { PoCompiler } from './po.compiler';

export class CompilerFactory {
	public static create(format: string, options?: {}): CompilerInterface {
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
