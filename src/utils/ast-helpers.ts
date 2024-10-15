import { extname } from 'node:path';
import { ScriptKind, tsquery } from '@phenomnomnominal/tsquery';
import pkg, {
	Node,
	Identifier,
	ClassDeclaration,
	ConstructorDeclaration,
	CallExpression,
	Expression,
	StringLiteral,
	SourceFile,
	PropertyDeclaration,
	PropertyAccessExpression,
	isPropertyAccessExpression,
	isCallExpression
} from 'typescript';
const { SyntaxKind, isStringLiteralLike, isArrayLiteralExpression, isBinaryExpression, isConditionalExpression } = pkg;

export function getAST(source: string, fileName = ''): SourceFile {
	const supportedScriptTypes: Record<string, ScriptKind> = {
		'.js': ScriptKind.JS,
		'.jsx': ScriptKind.JSX,
		'.ts': ScriptKind.TS,
		'.tsx': ScriptKind.TSX
	};

	const scriptKind = supportedScriptTypes[extname(fileName)] ?? ScriptKind.TS;

	return tsquery.ast(source, fileName, scriptKind);
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

export function findClassDeclarations(node: Node, name: string = null): ClassDeclaration[] {
	let query = 'ClassDeclaration';
	if (name) {
		query += `:has(Identifier[name="${name}"])`;
	}
	return tsquery<ClassDeclaration>(node, query);
}

export function findFunctionExpressions(node: Node) {
	return tsquery(node, 'VariableDeclaration > ArrowFunction, VariableDeclaration > FunctionExpression');
}

export function getSuperClassName(node: Node): string | null {
	const query = 'ClassDeclaration > HeritageClause Identifier';
	const [result] = tsquery<Identifier>(node, query);
	return result?.text;
}

export function getImportPath(node: Node, className: string): string | null {
	const query = `ImportDeclaration:has(Identifier[name="${className}"]) StringLiteral`;
	const [result] = tsquery<StringLiteral>(node, query);
	return result?.text;
}

export function findClassPropertiesByType(node: ClassDeclaration, type: string): string[] {
	return [
		...findClassPropertiesConstructorParameterByType(node, type),
		...findClassPropertiesDeclarationByType(node, type),
		...findClassPropertiesDeclarationByInject(node, type),
		...findClassPropertiesGetterByType(node, type)
	];
}

export function findConstructorDeclaration(node: ClassDeclaration): ConstructorDeclaration {
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

	return tsquery(node, query)
		.filter((n) => functionNames.includes(n.getLastToken().getText()))
		.map((n) => n.parent as CallExpression);
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

		if (identifier?.getText() === prop && isCallExpression(callExpression)) {
			nodes.push(callExpression);
		}
	});

	return nodes;
}

export function getStringsFromExpression(expression: Expression): string[] {
	if (isStringLiteralLike(expression)) {
		return [expression.text];
	}

	if (isArrayLiteralExpression(expression)) {
		return expression.elements.reduce((result: string[], element: Expression) => {
			const strings = getStringsFromExpression(element);
			return [...result, ...strings];
		}, []);
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
