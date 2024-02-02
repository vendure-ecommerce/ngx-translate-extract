import { CacheInterface } from './cache-interface.js';

export class NullCache<RESULT extends object = object> implements CacheInterface<RESULT> {
	persist() {}
	get<KEY extends string>(_uniqueContents: KEY, generator: () => RESULT): RESULT {
		return generator();
	}
}
