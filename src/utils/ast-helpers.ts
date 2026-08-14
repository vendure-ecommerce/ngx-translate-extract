import { extname } from 'node:path';

import { ParsedTemplate, parseTemplate, type TmplAstNode, TmplAstSwitchBlock } from '@angular/compiler';
import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import pkg, {
	type CallExpression,
	type ClassDeclaration,
	type ConstructorDeclaration,
	type Expression,
	type HeritageClause,
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
	isTypeReferenceNode,
	isGetAccessorDeclaration,
	isVariableDeclaration,
	isParenthesizedExpression,
	SyntaxKind,
	forEachChild,
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
let TSQUERY_CACHE = new WeakMap<Node, Map<string, unknown[]>>();

/**
 * Cache wrapper for tsquery to prevent redundant full-AST traversals
 * on the same node for the same query.
 */
function runQuery<T extends Node = Node>(node: Node, query: string): T[] {
	let nodeCache = TSQUERY_CACHE.get(node);
	if (!nodeCache) {
		nodeCache = new Map();
		TSQUERY_CACHE.set(node, nodeCache);
	}
	let result = nodeCache.get(query);
	if (!result) {
		result = tsquery<T>(node, query);
		nodeCache.set(query, result);
	}
	return result as T[];
}

export function clearAstCache(): void {
	AST_CACHE.clear();
	TSQUERY_CACHE = new WeakMap();
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
	const query = 'Decorator PropertyAssignment';
	const assignments = runQuery<PropertyAssignment>(node, query);

	return assignments.filter((prop) => {
		if (prop.name.getText() !== 'template') {
			return false;
		}

		const objectLiteral = prop.parent;
		const callExpression = objectLiteral?.parent;

		return isCallExpression(callExpression) && callExpression.expression.getText() === 'Component';
	});
}

/**
 * Retrieves the identifiers for the given module name from import statements within the provided AST node.
 */
export function getNamedImportIdentifiers(node: Node, moduleName: string, importPath: string | RegExp): Identifier[] {
	const importStringLiteralValue = importPath instanceof RegExp ? `value=${importPath.toString()}` : `value="${importPath}"`;

	const query = `ImportDeclaration:has(StringLiteral[${importStringLiteralValue}]) ImportSpecifier:has(Identifier[name="${moduleName}"]) > Identifier`;
	return runQuery<Identifier>(node, query);
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
	const query = 'ClassDeclaration';
	const classes = runQuery<ClassDeclaration>(node, query);
	if (name) {
		return classes.filter((c) => c.name && c.name.text === name);
	}
	return classes;
}

export function findFunctionExpressions(node: Node) {
	return runQuery(node, 'VariableDeclaration ArrowFunction, VariableDeclaration FunctionExpression');
}

export function getSuperClassName(node: Node): string | null {
	const query = 'ClassDeclaration > HeritageClause';
	const clauses = runQuery<HeritageClause>(node, query);

	const extendsClause = clauses.find((c) => c.token === SyntaxKind.ExtendsKeyword);
	if (!extendsClause) {
		return null;
	}

	// 3. Grab the Identifier representing the class name being extended
	const [identifier] = runQuery<Identifier>(extendsClause, 'Identifier');
	return identifier?.text ?? null;
}

export function getImportPath(node: Node, className: string): string | null {
	const query = `ImportDeclaration StringLiteral`;
	const literals = runQuery<StringLiteral>(node, query);
	const match = literals.find((l) => hasIdentifierNamed(l.parent, className));
	return match?.text ?? null;
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
	const [result] = runQuery<ConstructorDeclaration>(node, query);
	return result;
}

export function findMethodParameterByType(node: Node, type: string): string | null {
	const query = `Parameter:has(TypeReference) > Identifier`;
	const params = runQuery<Identifier>(node, query);
	const match = params.find((p) => hasTypeReferenceNamed(p.parent, type));
	return match ? match.text : null;
}

export function findVariableNameByInjectType(node: Node, type: string): string | null {
	const query = `VariableDeclaration:has(Identifier[name="inject"]) > Identifier`;
	const allInjects = runQuery<Identifier>(node, query);
	const match = allInjects.find((identifier) => {
		const varDecl = identifier.parent;

		if (!isVariableDeclaration(varDecl)) {
			return false;
		}

		// Only search the initializer (the `inject(...)` part), ignoring the variable name
		return varDecl.initializer && hasIdentifierNamed(varDecl.initializer, type);
	});
	return match?.text ?? null;
}

export function findMethodCallExpressions(node: Node, propName: string, fnName: string | string[]): CallExpression[] {
	const functionNames = typeof fnName === 'string' ? [fnName] : fnName;

	const fnNameRegex = functionNames.join('|');

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnNameRegex})$/]):not(:has(ThisKeyword))`;
	const possibleNodes = runQuery(node, query);

	const matchedNodes = possibleNodes.filter((n) => hasIdentifierNamed(n, propName));

	return unwrapMatchedCallExpressions(matchedNodes, functionNames);
}

export function findInlineInjectCallExpressions(node: Node, injectType: string, fnName: string | string[]): CallExpression[] {
	const functionNames = typeof fnName === 'string' ? [fnName] : fnName;

	const fnNameRegex = functionNames.join('|');

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnNameRegex})$/]):has(CallExpression:has(Identifier[name="inject"]))`;
	const possibleNodes = runQuery(node, query);

	const matchedNodes = possibleNodes.filter((n) => hasIdentifierNamed(n, injectType));

	return unwrapMatchedCallExpressions(matchedNodes, functionNames);
}

export function findClassPropertiesConstructorParameterByType(node: ClassDeclaration, type: string): string[] {
	const broadQuery = `Constructor Parameter:has(PublicKeyword,ProtectedKeyword,PrivateKeyword,ReadonlyKeyword) > Identifier`;
	const params = runQuery<Identifier>(node, broadQuery);
	return params.filter((p) => hasTypeReferenceNamed(p.parent, type)).map((n) => n.text);
}

export function findClassPropertiesDeclarationByType(node: ClassDeclaration, type: string): string[] {
	const query = `PropertyDeclaration:has(TypeReference)`;
	const props = runQuery<PropertyDeclaration>(node, query);
	return props.filter((p) => p.type && hasTypeReferenceNamed(p.type, type)).map((n) => n.name.getText());
}

export function findClassPropertiesDeclarationByInject(node: ClassDeclaration, type: string): string[] {
	const query = `PropertyDeclaration:has(CallExpression > Identifier[name="inject"])`;
	const allInjects = runQuery<PropertyDeclaration>(node, query);
	return (
		allInjects
			// Restrict search to the initializer (the `inject(...)` call itself), ignoring the property name
			.filter((p) => p.initializer && hasIdentifierNamed(p.initializer, type))
			.map((n) => n.name.getText())
	);
}

export function findClassPropertiesGetterByType(node: ClassDeclaration, type: string): string[] {
	const query = `GetAccessor:has(TypeReference) > Identifier`;
	const getters = runQuery<Identifier>(node, query);
	return getters
		.filter((g) => {
			const getAccessor = g.parent;

			if (!isGetAccessorDeclaration(getAccessor)) {
				return false;
			}

			return getAccessor.type && hasTypeReferenceNamed(getAccessor.type, type);
		})
		.map((n) => n.text);
}

export function findFunctionCallExpressions(node: Node, fnName: string | string[]): CallExpression[] {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}
	const query = `CallExpression:has(Identifier[name=/^(${fnName})$/]):not(:has(PropertyAccessExpression))`;
	return runQuery<CallExpression>(node, query);
}

export function findSimpleCallExpressions(node: Node, fnName: string | string[]) {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}
	const query = `CallExpression:has(Identifier[name=/^(${fnName})$/])`;
	return runQuery<CallExpression>(node, query);
}

export function findPropertyCallExpressions(node: Node, prop: string, fnName: string | string[]): CallExpression[] {
	if (Array.isArray(fnName)) {
		fnName = fnName.join('|');
	}

	const query = `CallExpression > PropertyAccessExpression:has(Identifier[name=/^(${fnName})$/]):has(PropertyAccessExpression:has(ThisKeyword))`;
	const result = runQuery<PropertyAccessExpression>(node, query);

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
	return collectStringsFromExpression(expression).filter((s) => s.trim() !== '');
}

/**
 * Internal recursive helper that preserves empty and whitespace-only strings
 * so that binary concatenations (e.g., 'hello' + ' ' + 'world') evaluate correctly.
 */
function collectStringsFromExpression(expression: Expression): string[] {
	if (isParenthesizedExpression(expression)) {
		return collectStringsFromExpression(expression.expression);
	}

	if (isStringLiteralLike(expression)) {
		return [expression.text];
	}

	if (isArrayLiteralExpression(expression)) {
		return expression.elements.flatMap(collectStringsFromExpression);
	}

	if (isBinaryExpression(expression)) {
		const leftStrings = collectStringsFromExpression(expression.left);
		const rightStrings = collectStringsFromExpression(expression.right);

		if (expression.operatorToken.kind === SyntaxKind.PlusToken) {
			// An empty array means a "dynamic side" was encountered.
			// If either side is dynamic, invalidate the whole string.
			if (leftStrings.length === 0 || rightStrings.length === 0) {
				return [];
			}

			const combinations: string[] = [];
			for (const l of leftStrings) {
				for (const r of rightStrings) {
					combinations.push(l + r);
				}
			}
			return combinations;
		}

		if (expression.operatorToken.kind === SyntaxKind.BarBarToken) {
			return [...leftStrings, ...rightStrings];
		}
	}

	if (isConditionalExpression(expression)) {
		const whenTrue = collectStringsFromExpression(expression.whenTrue);
		const whenFalse = collectStringsFromExpression(expression.whenFalse);
		return [...whenTrue, ...whenFalse];
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

/**
 * AST visitor to search for an Identifier by name.
 */
function hasIdentifierNamed(n: Node, name: string): boolean {
	if (n.kind === SyntaxKind.Identifier && (n as Identifier).text === name) {
		return true;
	}

	return !!forEachChild(n, (child) => hasIdentifierNamed(child, name));
}

/**
 * AST visitor to search exclusively for a TypeReference
 * that contains a specific Identifier name.
 */
function hasTypeReferenceNamed(n: Node, name: string): boolean {
	if (n.kind === SyntaxKind.ArrayType) {
		return false;
	}

	if (isTypeReferenceNode(n)) {
		// Match standard identifiers (e.g. TranslateService)
		if (n.typeName && n.typeName.kind === SyntaxKind.Identifier && n.typeName.text === name) {
			return true;
		}

		// Match qualified names (e.g. Core.TranslateService)
		if (n.typeName && n.typeName.kind === SyntaxKind.QualifiedName && n.typeName.right.text === name) {
			return true;
		}

		// Prevents the walker from looking inside <typeArguments>.
		return false;
	}

	return !!forEachChild(n, (child) => hasTypeReferenceNamed(child, name));
}
