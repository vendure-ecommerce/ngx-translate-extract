type CallbackFn<T, U = void> = (value: T, key: string, obj: Record<string, T>) => U;

export function stripBOM(contents: string): string {
	return contents.trim();
}

/**
 * Maps an object's own enumerable properties to a new object (like Array.map()).
 */
export function objectMap<T, U>(obj: Record<string, T>, callback: CallbackFn<T, U>): Record<string, U> {
	const keys = Object.keys(obj);
	const len = keys.length;
	const result: Record<string, U> = Object.create(null);
	for (let i = 0; i < len; i++) {
		const key = keys[i];
		result[key] = callback(obj[key], key, obj);
	}
	return result;
}

/**
 * Tests whether at least one element in the object passes the test.
 * Short-circuits upon finding a truthy value (like Array.some()).
 */
export function objectSome<T>(obj: Record<string, T>, predicate: CallbackFn<T, boolean>): boolean {
	const keys = Object.keys(obj);
	const len = keys.length;
	for (let i = 0; i < len; i++) {
		const key = keys[i];
		if (predicate(obj[key], key, obj)) {
			return true;
		}
	}
	return false;
}
