export interface CacheInterface<RESULT extends object = object> {
	persist(): void;
	get<KEY extends string>(uniqueContents: KEY, generator: () => RESULT): RESULT;

	/**
	 * Whether a value is already cached, so callers can batch the misses before generating them.
	 * Optional: treat a missing implementation as "always a miss".
	 */
	has?<KEY extends string>(uniqueContents: KEY): boolean;
}
