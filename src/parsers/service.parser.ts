import path from 'node:path';
import fs from 'node:fs';

import { ClassDeclaration, CallExpression, SourceFile } from 'typescript';
import { resolveSync } from 'tsconfig';
import JSON5 from 'json5';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
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
	getAST,
	getNamedImport
} from '../utils/ast-helpers.js';

const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];

export class ServiceParser implements ParserInterface {
	private static propertyMap = new Map<string, string[]>();

	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = getAST(source, filePath);
		const classDeclarations = findClassDeclarations(sourceFile);
		const functionDeclarations = findFunctionExpressions(sourceFile);

		if (!classDeclarations && !functionDeclarations) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		const translateServiceCallExpressions: CallExpression[] = [];

		functionDeclarations.forEach((fnDeclaration) => {
			const translateServiceVariableName = findVariableNameByInjectType(fnDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
			const callExpressions = findMethodCallExpressions(sourceFile, translateServiceVariableName, TRANSLATE_SERVICE_METHOD_NAMES);
			translateServiceCallExpressions.push(...callExpressions);
		});

		classDeclarations.forEach((classDeclaration) => {
			const callExpressions = [
				...this.findConstructorParamCallExpressions(classDeclaration),
				...this.findPropertyCallExpressions(classDeclaration, sourceFile)
			];

			translateServiceCallExpressions.push(...callExpressions);
		});

		translateServiceCallExpressions
			.filter((callExpression) => !!callExpression.arguments?.[0])
			.forEach((callExpression) => {
				const [firstArg] = callExpression.arguments;

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
		return findMethodCallExpressions(constructorDeclaration, paramName, TRANSLATE_SERVICE_METHOD_NAMES);
	}

	protected findPropertyCallExpressions(classDeclaration: ClassDeclaration, sourceFile: SourceFile): CallExpression[] {
		const propNames = [
			...findClassPropertiesByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE),
			...this.findParentClassProperties(classDeclaration, sourceFile)
		];
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
		const currDir = path.join(path.dirname(ast.fileName), '/');

		const key = `${currDir}|${importPath}`;
		if (key in ServiceParser.propertyMap) {
			return ServiceParser.propertyMap.get(key);
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
			const tsconfigFilePath = resolveSync(currDir);
			if (tsconfigFilePath) {
				const tsConfigFile = fs.readFileSync(tsconfigFilePath);
				const config = JSON5.parse(tsConfigFile.toString());
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
			const superClassAst = getAST(superClassFileContent, file);
			const superClassDeclarations = findClassDeclarations(superClassAst, superClassName);
			const superClassPropertyNames = superClassDeclarations
				.flatMap((superClassDeclaration) => findClassPropertiesByType(superClassDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE));
			if (superClassPropertyNames.length > 0) {
				ServiceParser.propertyMap.set(file, superClassPropertyNames);
				allSuperClassPropertyNames.push(...superClassPropertyNames);
			} else {
				superClassDeclarations.forEach((declaration) =>
					allSuperClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst))
				);
			}
		});
		return allSuperClassPropertyNames;
	}
}
