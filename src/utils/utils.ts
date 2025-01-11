/**
 * Assumes file is an Angular component if type is javascript/typescript
 */
export function isPathAngularComponent(path: string): boolean {
	return /\.ts|js$/i.test(path);
}

/**
 * Extract inline template from a component
 */
export function extractComponentInlineTemplate(contents: string): string {
	const regExp = /template\s*:\s*(["'`])([\s\S]*?)\1/;

	const match = regExp.exec(contents);
	if (match !== null) {
		return match[2];
	}
	return '';
}

export function stripBOM(contents: string): string {
	return contents.trim();
}
