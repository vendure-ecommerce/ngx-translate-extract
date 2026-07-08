import fs from 'node:fs';
import path from 'node:path';

import {
	type ClassDeclaration,
	type CallExpression,
	type SourceFile,
	type CompilerOptions,
	findConfigFile,
	parseConfigFileTextToJson,
	parseJsonConfigFileContent,
	resolveModuleName,
	sys,
} from 'typescript';

import {
	findClassDeclarations,
	findClassPropertiesByType,
	findPropertyCallExpressions,
	findMethodCallExpressions,
	getStringsFromExpression,
	findMethodParameterByType,
	findConstructorDeclaration,
	getSuperClassName,
	getImportPath,
	findFunctionExpressions,
	findVariableNameByInjectType,
	findInlineInjectCallExpressions,
	getAST,
	getNamedImport,
} from '../utils/ast-helpers.js';
import { normalizeFilePath } from '../utils/fs-helpers.js';
import { TranslationCollection, type TranslationType } from '../utils/translation.collection.js';
import { toTranslationType } from '../utils/utils.js';
import { ParserInterface } from './parser.interface.js';

const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream', 'translate'];

export class ServiceParser implements ParserInterface {
	private static propertyMap = new Map<string, string[]>();
	private static compilerOptionsCache = new Map<string, CompilerOptions>();

	public extract(source: string, filePath: string): TranslationCollection {
		const extracted: TranslationType = Object.create(null);
		const filePathNormalized = normalizeFilePath(filePath);
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return new TranslationCollection();
		}

		const classDeclarations = findClassDeclarations(sourceFile);
		const functionDeclarations = findFunctionExpressions(sourceFile);

		if (classDeclarations.length === 0 && functionDeclarations.length === 0) {
			return new TranslationCollection();
		}

		const translateServiceCallExpressions: CallExpression[] = [];

		functionDeclarations.forEach((fnDeclaration) => {
			const translateServiceVariableName = findVariableNameByInjectType(fnDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
			const callExpressions = translateServiceVariableName
				? findMethodCallExpressions(sourceFile, translateServiceVariableName, TRANSLATE_SERVICE_METHOD_NAMES)
				: [];
			const inlineInjectCallExpressions = findInlineInjectCallExpressions(
				sourceFile,
				TRANSLATE_SERVICE_TYPE_REFERENCE,
				TRANSLATE_SERVICE_METHOD_NAMES,
			);
			translateServiceCallExpressions.push(...callExpressions, ...inlineInjectCallExpressions);
		});

		classDeclarations.forEach((classDeclaration) => {
			const callExpressions = [
				...this.findConstructorParamCallExpressions(classDeclaration),
				...this.findPropertyCallExpressions(classDeclaration, sourceFile),
			];

			translateServiceCallExpressions.push(...callExpressions);
		});

		translateServiceCallExpressions
			.filter((callExpression) => !!callExpression.arguments?.[0])
			.forEach((callExpression) => {
				const [firstArg] = callExpression.arguments;
				if (!firstArg) {
					return;
				}
				getStringsFromExpression(firstArg).forEach((key) => {
					extracted[key] = toTranslationType('', filePathNormalized);
				});
			});

		return new TranslationCollection(extracted);
	}

	protected findConstructorParamCallExpressions(classDeclaration: ClassDeclaration): CallExpression[] {
		const constructorDeclaration = findConstructorDeclaration(classDeclaration);
		if (!constructorDeclaration) {
			return [];
		}
		const paramName = findMethodParameterByType(constructorDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
		const methodCallExpressions = paramName
			? findMethodCallExpressions(constructorDeclaration, paramName, TRANSLATE_SERVICE_METHOD_NAMES)
			: [];
		const inlineInjectCallExpressions = findInlineInjectCallExpressions(
			constructorDeclaration,
			TRANSLATE_SERVICE_TYPE_REFERENCE,
			TRANSLATE_SERVICE_METHOD_NAMES,
		);
		// Calls of the TranslateService when injected using the inject function within the constructor
		const translateServiceLocalVariableName = findVariableNameByInjectType(constructorDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
		const localVariableCallExpressions = translateServiceLocalVariableName
			? findMethodCallExpressions(constructorDeclaration, translateServiceLocalVariableName, TRANSLATE_SERVICE_METHOD_NAMES)
			: [];

		return [...methodCallExpressions, ...localVariableCallExpressions, ...inlineInjectCallExpressions];
	}

	protected findPropertyCallExpressions(classDeclaration: ClassDeclaration, sourceFile: SourceFile): CallExpression[] {
		const propNames = findClassPropertiesByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);

		if (propNames.length === 0) {
			propNames.push(...this.findParentClassProperties(classDeclaration, sourceFile));
		}

		return propNames.flatMap((name) => findPropertyCallExpressions(classDeclaration, name, TRANSLATE_SERVICE_METHOD_NAMES));
	}

	private findParentClassProperties(
		classDeclaration: ClassDeclaration,
		ast: SourceFile,
		visited = new Set<ClassDeclaration>(),
	): string[] {
		if (visited.has(classDeclaration)) {
			return [];
		}
		visited.add(classDeclaration);

		const superClassNameOrAlias = getSuperClassName(classDeclaration);
		if (!superClassNameOrAlias) {
			return [];
		}

		const importPath = getImportPath(ast, superClassNameOrAlias);
		if (!importPath) {
			// The parent class is in the same file.
			const localSuperClassDeclarations = findClassDeclarations(ast, superClassNameOrAlias);
			const localSuperClassPropertyNames = localSuperClassDeclarations.flatMap((decl) =>
				findClassPropertiesByType(decl, TRANSLATE_SERVICE_TYPE_REFERENCE),
			);

			if (localSuperClassPropertyNames.length > 0) {
				return localSuperClassPropertyNames;
			}

			// If the local parent class extends another class, recurse.
			return localSuperClassDeclarations.flatMap((decl) => this.findParentClassProperties(decl, ast, visited));
		}

		// Resolve the actual name of the superclass from the named import
		const superClassName = getNamedImport(ast, superClassNameOrAlias, importPath);
		if (!superClassName) {
			return [];
		}
		const currDir = path.join(path.dirname(ast.fileName), '/');

		const cacheKey = `${currDir}|${importPath}`;
		const cached = ServiceParser.propertyMap.get(cacheKey);
		if (cached) {
			return cached;
		}

		const compilerOptions = this.getTsCompilerOptions(currDir);

		// Use TypeScript's native module resolver to handle aliases, paths, and absolute/relative imports
		const resolvedModule = resolveModuleName(importPath, ast.fileName, compilerOptions, sys);

		let potentialSuperFiles: string[] = [];

		if (resolvedModule.resolvedModule && resolvedModule.resolvedModule.resolvedFileName) {
			potentialSuperFiles = [resolvedModule.resolvedModule.resolvedFileName];
		} else {
			// Fallback for unsupported edge cases or custom folder structures without index.ts
			const superClassPath = importPath.startsWith('/') ? importPath : path.resolve(currDir, importPath);

			const superClassFile = superClassPath + '.ts';
			if (fs.lstatSync(superClassFile, { throwIfNoEntry: false })?.isFile()) {
				potentialSuperFiles = [superClassFile];
			} else if (fs.lstatSync(superClassPath, { throwIfNoEntry: false })?.isDirectory()) {
				potentialSuperFiles = fs
					.readdirSync(superClassPath)
					.filter((file) => file.endsWith('.ts'))
					.map((file) => path.join(superClassPath, file));
			} else {
				ServiceParser.propertyMap.set(cacheKey, []);
				return [];
			}
		}

		const allSuperClassPropertyNames: string[] = [];
		potentialSuperFiles.forEach((file) => {
			const superClassFileContent = fs.readFileSync(file, 'utf8');
			const superClassAst = getAST(superClassFileContent, file).parsedFile;
			if (!superClassAst) {
				return;
			}
			const superClassDeclarations = findClassDeclarations(superClassAst, superClassName);
			const superClassPropertyNames = superClassDeclarations.flatMap((superClassDeclaration) =>
				findClassPropertiesByType(superClassDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE),
			);
			if (superClassPropertyNames.length > 0) {
				allSuperClassPropertyNames.push(...superClassPropertyNames);
			} else {
				superClassDeclarations.forEach((declaration) =>
					allSuperClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst, visited)),
				);
			}
		});

		// Cache the fully resolved result (even when empty) so any other class extending the same
		// import doesn't have to read from the filesystem or re-walk these ASTs again.
		ServiceParser.propertyMap.set(cacheKey, allSuperClassPropertyNames);
		return allSuperClassPropertyNames;
	}

	private getTsCompilerOptions(currDir: string): CompilerOptions {
		const cached = ServiceParser.compilerOptionsCache.get(currDir);
		if (cached !== undefined) {
			return cached;
		}

		const tsconfigFilePath = findConfigFile(currDir, fs.existsSync);

		if (!tsconfigFilePath) {
			return {};
		}

		const tsConfigFile = fs.readFileSync(tsconfigFilePath, { encoding: 'utf-8' });
		const parsed = parseConfigFileTextToJson(tsconfigFilePath, tsConfigFile);

		if (!parsed.config) {
			return {};
		}

		// Fully resolves the config file including 'paths', 'baseUrl', and extended configs
		const parsedConfig = parseJsonConfigFileContent(parsed.config, sys, path.dirname(tsconfigFilePath));
		const options = parsedConfig.options;

		ServiceParser.compilerOptionsCache.set(currDir, options);
		return options;
	}
}
