import { extname } from 'node:path';

import { ParsedTemplate, parseTemplate, type TmplAstNode, TmplAstSwitchBlock } from '@angular/compiler';
import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import pkg, {
	type CallExpression,
	type ClassDeclaration,
	type ConstructorDeclaration,
	type Expression,
	type Identifier,
	type Node,
	type PropertyAccessExpression,
	type PropertyAssignment,
	type PropertyDeclaration,
	type SourceFile,
	type StringLiteral,
} from 'typescript';

interface ParsedScriptSource {
	source: string;
	parsedFile: SourceFile;
	parsedTemplates: ParsedTemplate[];
}

interface ParsedTemplateSource {
	source: string;
	parsedFile: null;
	parsedTemplates: [ParsedTemplate];
}

type ParsedSource = ParsedScriptSource | ParsedTemplateSource;

// Importing non-type members from 'typescript' this way to prevent runtime errors such as:
// `SyntaxError: Named export 'isCallExpression' not found. The requested module 'typescript' is a CommonJS module,
//  which may not support all module.exports as named exports.`
const {
	isArrayLiteralExpression,
	isBinaryExpression,
	isCallExpression,
	isConditionalExpression,
	isPropertyAccessExpression,
	isStringLiteralLike,
	SyntaxKind,
} = pkg;

const ANGULAR_TEMPLATE_KIND = ScriptKind.Unknown; // Unknown for ts

const SCRIPT_TYPES = new Map([
	['.js', ScriptKind.JS],
	['.mjs', ScriptKind.JS],
	['.jsx', ScriptKind.JSX],
	['.ts', ScriptKind.TS],
	['.mts', ScriptKind.TS],
	['.tsx', ScriptKind.TSX],
	['.html', ANGULAR_TEMPLATE_KIND],
]);

const AST_CACHE = new Map<string, ParsedSource>();

export function clearAstCache(): void {
	AST_CACHE.clear();
}

export function getAST(source: string, fileName = ''): ParsedSource {
	// Skip cache if no fileName is provided
	if (!fileName) {
		return parseSource(source, fileName);
	}

	const cached = AST_CACHE.get(fileName);
	if (cached && cached.source === source) {
		return cached;
	}

	const result = parseSource(source, fileName);
	AST_CACHE.set(fileName, result);

	return result;
}

export function parseSource(source: string, fileName = ''): ParsedSource {
	const scriptKind = SCRIPT_TYPES.get(extname(fileName)) ?? ScriptKind.TS;

	// Angular template, pass to Angular compiler.
	if (scriptKind === ANGULAR_TEMPLATE_KIND) {
		return {
			source,
			parsedFile: null,
			parsedTemplates: [parseTemplate(source, fileName, { collectCommentNodes: false })],
		};
	}

	const parsedFile = tsquery.ast(source, fileName, scriptKind);
	const parsedTemplates: ParsedTemplate[] = [];

	// Check for possible inline templates that need to be processed by the Angular compiler.
	if (source.includes('@Component(') && source.includes('template:')) {
		getComponentInlineTemplate(parsedFile).forEach((templateNode) => {
			const tpl = templateNode.initializer;
			if (isStringLiteralLike(tpl)) {
				parsedTemplates.push(parseTemplate(tpl.text, fileName, { collectCommentNodes: false }));
			}
		});
	}

	return { source, parsedFile, parsedTemplates };
}

/**
 * Retrieves inline `template` property assignments from Angular `@Component` decorators.
 */
export function getComponentInlineTemplate(node: Node): PropertyAssignment[] {
	const query =
		'Decorator > CallExpression:has(Identifier[name="Component"]) ObjectLiteralExpression > PropertyAssignment:has(Identifier[name="template"])';
	return tsquery<PropertyAssignment>(node, query);
}

/**
 * Retrieves the identifiers for the given module name from import statements within the provided AST node.
 */
export function getNamedImportIdentifiers(node: Node, moduleName: string, importPath: string | RegExp): Identifier[] {
	const importStringLiteralValue = importPath instanceof RegExp ? `value=${importPath.toString()}` : `value="${importPath}"`;

	const query = `ImportDeclaration:has(StringLiteral[${importStringLiteralValue}]) ImportSpecifier:has(Identifier[name="${moduleName}"]) > Identifier`;

	return tsquery<Identifier>(node, query);
}

/**
 * Retrieves the original named import from a given node, import name, and import path.
 *
 * @example
 * // Example import statement within a file
 * import { Base as CoreBase } from './src/base';
 *
 * getNamedImport(node, 'Base', './src/base')     -> 'Base'
 * getNamedImport(node, 'CoreBase', './src/base') -> 'Base'
 */
export function getNamedImport(node: Node, importName: string, importPath: string | RegExp): string | null {
	const identifiers = getNamedImportIdentifiers(node, importName, importPath);

	return identifiers.at(0)?.text ?? null;
}

/**
 * Retrieves the alias of the named import from a given node, import name, and import path.
 *
 * @example
 * // Example import statement within a file
 * import { Base as CoreBase } from './src/base';
 *
 * getNamedImport(node, 'Base', './src/base')     -> 'CoreBase'
 * getNamedImport(node, 'CoreBase', './src/base') -> 'CoreBase'
 */
export function getNamedImportAlias(node: Node, importName: string, importPath: string | RegExp): string | null {
	const identifiers = getNamedImportIdentifiers(node, importName, importPath);

	return identifiers.at(-1)?.text ?? null;
}

export function findClassDeclarations(node: Node, name?: string): ClassDeclaration[] {
	let query = 'ClassDeclaration';
	if (name) {
		query += `:has(Identifier[name="${name}"])`;
	}
	return tsquery<ClassDeclaration>(node, query);
}

export function findFunctionExpressions(node: Node) {
	return tsquery(node, 'VariableDeclaration ArrowFunction, VariableDeclaration FunctionExpression');
}

export function getSuperClassName(node: Node): string | null {
	const query = 'ClassDeclaration > HeritageClause Identifier';
	const [result] = tsquery<Identifier>(node, query);
	return result?.text ?? null;
}

export function getImportPath(node: Node, className: string): string | null {
	const query = `ImportDeclaration:has(Identifier[name="${className}"]) StringLiteral`;
	const [result] = tsquery<StringLiteral>(node, query);
	return result?.text ?? null;
}

export function findClassPropertiesByType(node: ClassDeclaration, type: string): string[] {
	return [
		...findClassPropertiesConstructorParameterByType(node, type),
		...findClassPropertiesDeclarationByType(node, type),
		...findClassPropertiesDeclarationByInject(node, type),
		...findClassPropertiesGetterByType(node, type),
	];
}

export function findConstructorDeclaration(node: ClassDeclaration): ConstructorDeclaration | undefined {
	const query = 'Constructor';
	const [result] = tsquery<ConstructorDeclaration>(node, query);
	return result;
}

export function findMethodParameterByType(node: Node, type: string): string | null {
	const query = `Parameter:has(TypeReference > Identifier[name="${type}"]) > Identifier`;
	const [result] = tsquery<Identifier>(node, query);
	if (result) {
		return result.text;
	}
	return null;
}

export function findVariableNameByInjectType(node: Node, type: string): string | null {
	const query = `VariableDeclaration:has(Identifier[name="inject"]):has(CallExpression > Identifier[name="${type}"]) > Identifier`;
	const [result] = tsquery<Identifier>(node, query);

	return result?.text ?? null;
}

export function findMethodCallExpressions(node: Node, propName: string, fnName: string | string[]): CallExpression[] {
	const functionNames = typeof fnName === 'string' ? [fnName] : fnName;

	const fnNameRegex = functionNames.join('|');

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnNameRegex})$/]):has(PropertyAccessExpression:has(Identifier[name="${propName}"]):not(:has(ThisKeyword)))`;

	return unwrapMatchedCallExpressions(tsquery(node, query), functionNames);
}

export function findInlineInjectCallExpressions(node: Node, injectType: string, fnName: string | string[]): CallExpression[] {
	const functionNames = typeof fnName === 'string' ? [fnName] : fnName;

	const fnNameRegex = functionNames.join('|');

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnNameRegex})$/]):has(CallExpression:has(Identifier[name="inject"]):has(Identifier[name="${injectType}"]))`;

	return unwrapMatchedCallExpressions(tsquery(node, query), functionNames);
}

export function findClassPropertiesConstructorParameterByType(node: ClassDeclaration, type: string): string[] {
	const query = `Constructor Parameter:has(TypeReference > Identifier[name="${type}"]):has(PublicKeyword,ProtectedKeyword,PrivateKeyword,ReadonlyKeyword) > Identifier`;
	const result = tsquery<Identifier>(node, query);
	return result.map((n) => n.text);
}

export function findClassPropertiesDeclarationByType(node: ClassDeclaration, type: string): string[] {
	const query = `PropertyDeclaration:has(TypeReference > Identifier[name="${type}"])`;
	const result = tsquery<PropertyDeclaration>(node, query);
	return result.map((n) => n.name.getText());
}

export function findClassPropertiesDeclarationByInject(node: ClassDeclaration, type: string): string[] {
	const query = `PropertyDeclaration:has(CallExpression > Identifier[name="inject"]):has(CallExpression > Identifier[name="${type}"])`;
	const result = tsquery<PropertyDeclaration>(node, query);
	return result.map((n) => n.name.getText());
}

export function findClassPropertiesGetterByType(node: ClassDeclaration, type: string): string[] {
	const query = `GetAccessor:has(TypeReference > Identifier[name="${type}"]) > Identifier`;
	const result = tsquery<Identifier>(node, query);
	return result.map((n) => n.text);
}

export function findFunctionCallExpressions(node: Node, fnName: string | string[]): CallExpression[] {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}
	const query = `CallExpression:has(Identifier[name="${fnName}"]):not(:has(PropertyAccessExpression))`;
	return tsquery<CallExpression>(node, query);
}

export function findSimpleCallExpressions(node: Node, fnName: string) {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}
	const query = `CallExpression:has(Identifier[name="${fnName}"])`;
	return tsquery<CallExpression>(node, query);
}

export function findPropertyCallExpressions(node: Node, prop: string, fnName: string | string[]): CallExpression[] {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnName})$/]):has(PropertyAccessExpression:has(ThisKeyword))`;
	const result = tsquery<PropertyAccessExpression>(node, query);

	const nodes: CallExpression[] = [];
	result.forEach((n) => {
		const identifier = isPropertyAccessExpression(n.expression) ? n.expression.name : null;
		const property = identifier?.parent;
		const method = property?.parent;
		const callExpression = method?.parent;

		if (identifier?.getText() === prop && callExpression && isCallExpression(callExpression)) {
			nodes.push(callExpression);
		}
	});

	return nodes;
}

export function getStringsFromExpression(expression: Expression): string[] {
	if (isStringLiteralLike(expression) && expression.text.trim() !== '') {
		return [expression.text];
	}

	if (isArrayLiteralExpression(expression)) {
		return expression.elements.flatMap(getStringsFromExpression);
	}

	if (isBinaryExpression(expression)) {
		const [left] = getStringsFromExpression(expression.left);
		const [right] = getStringsFromExpression(expression.right);

		if (expression.operatorToken.kind === SyntaxKind.PlusToken) {
			if (typeof left === 'string' && typeof right === 'string') {
				return [left + right];
			}
		}

		if (expression.operatorToken.kind === SyntaxKind.BarBarToken) {
			const result = [];
			if (typeof left === 'string') {
				result.push(left);
			}
			if (typeof right === 'string') {
				result.push(right);
			}
			return result;
		}
	}

	if (isConditionalExpression(expression)) {
		const [whenTrue] = getStringsFromExpression(expression.whenTrue);
		const [whenFalse] = getStringsFromExpression(expression.whenFalse);

		const result = [];
		if (typeof whenTrue === 'string') {
			result.push(whenTrue);
		}
		if (typeof whenFalse === 'string') {
			result.push(whenFalse);
		}
		return result;
	}
	return [];
}

/**
 * Extracts nodes from a switch block template.
 *
 * Note: Starting from Angular 21.1.0, switch blocks use the 'groups' property instead of `cases`.
 * This function checks for both to ensure compatibility with templates generated by different
 * versions of the Angular compiler.
 */
export function getNodesFromSwitchBlockTmpl(node: TmplAstSwitchBlock): TmplAstNode[] {
	const groups = node.groups ?? ('cases' in node && node.cases);

	if (!Array.isArray(groups)) {
		return [];
	}

	return groups.flatMap((group) => {
		if (!Array.isArray(group.children)) {
			return [];
		}
		return group.children;
	});
}

/**
 * Filters nodes whose last token matches one of the given function
 * names, then returns the parent of each match if it is a CallExpression.
 */
export function unwrapMatchedCallExpressions(nodes: Node[], fnNames: string[]): CallExpression[] {
	const fnNameSet = new Set(fnNames);
	const results: CallExpression[] = [];

	for (const n of nodes) {
		const lastToken = n.getLastToken();
		if (lastToken && fnNameSet.has(lastToken.getText()) && isCallExpression(n.parent)) {
			results.push(n.parent);
		}
	}

	return results;
}
