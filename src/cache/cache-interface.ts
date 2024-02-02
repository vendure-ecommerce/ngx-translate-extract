export interface CacheInterface<RESULT extends object = object> {
	persist(): void;
	get<KEY extends string>(uniqueContents: KEY, generator: () => RESULT): RESULT;
}
