import { tsquery } from '@phenomnomnominal/tsquery';
import { TranslationCollection } from '../utils/translation.collection.js';
import { findClassDeclarations, findClassPropertiesByType, findPropertyCallExpressions, findMethodCallExpressions, getStringsFromExpression, findMethodParameterByType, findConstructorDeclaration, getSuperClassName, getImportPath } from '../utils/ast-helpers.js';
import * as path from 'path';
import * as fs from 'fs';
import { loadSync } from 'tsconfig';
const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];
export class ServiceParser {
    static propertyMap = new Map();
    extract(source, filePath) {
        const sourceFile = tsquery.ast(source, filePath);
        const classDeclarations = findClassDeclarations(sourceFile);
        if (!classDeclarations) {
            return null;
        }
        let collection = new TranslationCollection();
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
                collection = collection.addKeys(strings);
            });
        });
        return collection;
    }
    findConstructorParamCallExpressions(classDeclaration) {
        const constructorDeclaration = findConstructorDeclaration(classDeclaration);
        if (!constructorDeclaration) {
            return [];
        }
        const paramName = findMethodParameterByType(constructorDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
        return findMethodCallExpressions(constructorDeclaration, paramName, TRANSLATE_SERVICE_METHOD_NAMES);
    }
    findPropertyCallExpressions(classDeclaration, sourceFile) {
        let propNames = [
            ...findClassPropertiesByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE),
            ...this.findParentClassProperties(classDeclaration, sourceFile)
        ];
        return propNames.flatMap((name) => findPropertyCallExpressions(classDeclaration, name, TRANSLATE_SERVICE_METHOD_NAMES));
    }
    findParentClassProperties(classDeclaration, ast) {
        const superClassName = getSuperClassName(classDeclaration);
        if (!superClassName) {
            return [];
        }
        const importPath = getImportPath(ast, superClassName);
        if (!importPath) {
            return [];
        }
        const currDir = path.join(path.dirname(ast.fileName), '/');
        const key = `${currDir}|${importPath}`;
        if (key in ServiceParser.propertyMap) {
            return ServiceParser.propertyMap.get(key);
        }
        let superClassPath;
        if (importPath.startsWith('.')) {
            superClassPath = path.resolve(currDir, importPath);
        }
        else if (importPath.startsWith('/')) {
            superClassPath = importPath;
        }
        else {
            const config = loadSync(currDir);
            let baseUrl = config?.config?.compilerOptions?.baseUrl;
            if (baseUrl) {
                baseUrl = path.resolve(path.dirname(config.path), baseUrl);
            }
            superClassPath = path.resolve(baseUrl ?? currDir, importPath);
        }
        const superClassFile = superClassPath + '.ts';
        let potentialSuperFiles;
        if (fs.existsSync(superClassFile) && fs.lstatSync(superClassFile).isFile()) {
            potentialSuperFiles = [superClassFile];
        }
        else if (fs.existsSync(superClassPath) && fs.lstatSync(superClassPath).isDirectory()) {
            potentialSuperFiles = fs
                .readdirSync(superClassPath)
                .filter((file) => file.endsWith('.ts'))
                .map((file) => path.join(superClassPath, file));
        }
        else {
            return [];
        }
        const allSuperClassPropertyNames = [];
        potentialSuperFiles.forEach((file) => {
            const superClassFileContent = fs.readFileSync(file, 'utf8');
            const superClassAst = tsquery.ast(superClassFileContent, file);
            const superClassDeclarations = findClassDeclarations(superClassAst, superClassName);
            const superClassPropertyNames = superClassDeclarations
                .flatMap((superClassDeclaration) => findClassPropertiesByType(superClassDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE));
            if (superClassPropertyNames.length > 0) {
                ServiceParser.propertyMap.set(file, superClassPropertyNames);
                allSuperClassPropertyNames.push(...superClassPropertyNames);
            }
            else {
                superClassDeclarations.forEach((declaration) => allSuperClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst)));
            }
        });
        return allSuperClassPropertyNames;
    }
}
//# sourceMappingURL=service.parser.js.map