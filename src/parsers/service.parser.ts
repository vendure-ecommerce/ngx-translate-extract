import { ClassDeclaration, CallExpression, StringLiteral, SourceFile } from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import {
	findClassDeclarations,
	findClassPropertyByType,
	findPropertyCallExpressions,
	findMethodCallExpressions,
	getStringsFromExpression,
	findMethodParameterByType,
	findConstructorDeclaration,
	getSuperClassName,
	getImportPath
} from '../utils/ast-helpers.js';
import * as path from 'path';
import * as fs from 'fs';

const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];

export class ServiceParser implements ParserInterface {
	private static propertyMap = new Map<string, string[]>();

	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = tsquery.ast(source, filePath);

		const classDeclarations = findClassDeclarations(sourceFile);
		if (!classDeclarations) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		classDeclarations.forEach((classDeclaration) => {
			const callExpressions = [
				...this.findConstructorParamCallExpressions(classDeclaration),
				...this.findPropertyCallExpressions(classDeclaration, sourceFile)
			];

			callExpressions.forEach((callExpression) => {
				const [firstArg] = callExpression.arguments;
				if (!firstArg) {
					return;
				}
				const strings = getStringsFromExpression(firstArg);
				collection = collection.addKeys(strings, filePath);
			});
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
		let propNames: string[];
		const propName: string = findClassPropertyByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
		if (propName) {
			propNames = [propName];
		} else {
			propNames = this.findParentClassProperties(classDeclaration, sourceFile);
		}
		return propNames.flatMap(name => findPropertyCallExpressions(classDeclaration, name, TRANSLATE_SERVICE_METHOD_NAMES));
	}

	/* Adopted from https://github.com/phenomnomnominal/tsquery/issues/30#issuecomment-428139650 */
	private findParentClassProperties(classDeclaration: ClassDeclaration, ast: SourceFile): string[] {
		const superClassName = getSuperClassName(classDeclaration);
		if (!superClassName) {
			return [];
		}
		const importPath = getImportPath(ast, superClassName);
		if (!importPath) {
			// parent class must be in the same file and will be handled automatically, so we can
			// skip it here
			return [];
		}

		const currDir = path.dirname(ast.fileName);
        const superClassPath = path.resolve(currDir, importPath);
        if (superClassPath in ServiceParser.propertyMap) {
            return ServiceParser.propertyMap.get(superClassPath);
        }
        const superClassFile = superClassPath + '.ts';
        let potentialSuperFiles: string[];
        if (fs.existsSync(superClassFile) && fs.lstatSync(superClassFile).isFile()) {
			potentialSuperFiles = [superClassFile];
		} else if (fs.existsSync(superClassPath) && fs.lstatSync(superClassPath).isDirectory()) {
			potentialSuperFiles = fs.readdirSync(superClassPath).filter(file => file.endsWith('.ts')).map(file => path.join(superClassPath, file));
		} else {
			// we cannot find the superclass, so just assume that no translate property exists
			return [];
		}

		const superClassPropertyNames: string[] = [];
		potentialSuperFiles.forEach(file => {
			const superClassFileContent = fs.readFileSync(file, 'utf8');
			const superClassAst = tsquery.ast(superClassFileContent, file);
			const superClassDeclarations = findClassDeclarations(superClassAst, superClassName);
			const _superClassPropertyNames = superClassDeclarations
				.map(superClassDeclaration => findClassPropertyByType(superClassDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE))
				.filter(n => !!n);
			if (_superClassPropertyNames.length > 0) {
				ServiceParser.propertyMap.set(file, _superClassPropertyNames);
				superClassPropertyNames.push(..._superClassPropertyNames);
			} else {
				superClassDeclarations.forEach(declaration =>
					superClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst))
				);
			}
		});
		return superClassPropertyNames;
	}
}
