import fs from 'node:fs';
import path from 'node:path';

import { ClassDeclaration, CallExpression, SourceFile, findConfigFile, parseConfigFileTextToJson } from 'typescript';

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
import { TranslationCollection } from '../utils/translation.collection.js';
import { ParserInterface } from './parser.interface.js';

const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream', 'translate'];

export class ServiceParser implements ParserInterface {
	private static propertyMap = new Map<string, string[]>();

	public extract(source: string, filePath: string): TranslationCollection {
		let collection = new TranslationCollection();
		const sourceFile = getAST(source, filePath).parsedFile;

		if (!sourceFile) {
			return collection;
		}

		const classDeclarations = findClassDeclarations(sourceFile);
		const functionDeclarations = findFunctionExpressions(sourceFile);

		if (classDeclarations.length === 0 && functionDeclarations.length === 0) {
			return collection;
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
				const strings = getStringsFromExpression(firstArg);
				collection = collection.addKeys(strings, filePath);
			});

		return collection;
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

	private findParentClassProperties(classDeclaration: ClassDeclaration, ast: SourceFile): string[] {
		const superClassNameOrAlias = getSuperClassName(classDeclaration);
		if (!superClassNameOrAlias) {
			return [];
		}

		const importPath = getImportPath(ast, superClassNameOrAlias);
		if (!importPath) {
			// parent class must be in the same file and will be handled automatically, so we can
			// skip it here
			return [];
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

		let superClassPath: string;
		if (importPath.startsWith('.')) {
			// relative import, use currDir
			superClassPath = path.resolve(currDir, importPath);
		} else if (importPath.startsWith('/')) {
			// absolute relative import, use path directly
			superClassPath = importPath;
		} else {
			// absolute import, use baseUrl if present
			let baseUrl = currDir;
			const tsconfigFilePath = findConfigFile(currDir, fs.existsSync);
			if (tsconfigFilePath) {
				const tsConfigFile = fs.readFileSync(tsconfigFilePath, { encoding: 'utf8' });
				const config = parseConfigFileTextToJson(tsconfigFilePath, tsConfigFile).config;
				const compilerOptionsBaseUrl = config.compilerOptions?.baseUrl ?? '';
				baseUrl = path.resolve(path.dirname(tsconfigFilePath), compilerOptionsBaseUrl);
			}

			superClassPath = path.resolve(baseUrl, importPath);
		}
		const superClassFile = superClassPath + '.ts';
		let potentialSuperFiles: string[];
		if (fs.existsSync(superClassFile) && fs.lstatSync(superClassFile).isFile()) {
			potentialSuperFiles = [superClassFile];
		} else if (fs.existsSync(superClassPath) && fs.lstatSync(superClassPath).isDirectory()) {
			potentialSuperFiles = fs
				.readdirSync(superClassPath)
				.filter((file) => file.endsWith('.ts'))
				.map((file) => path.join(superClassPath, file));
		} else {
			// we cannot find the superclass, so just assume that no translate property exists
			return [];
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
				ServiceParser.propertyMap.set(cacheKey, superClassPropertyNames);
				allSuperClassPropertyNames.push(...superClassPropertyNames);
			} else {
				superClassDeclarations.forEach((declaration) =>
					allSuperClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst)),
				);
			}
		});
		return allSuperClassPropertyNames;
	}
}
