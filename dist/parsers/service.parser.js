import { tsquery } from '@phenomnomnominal/tsquery';
import { TranslationCollection } from '../utils/translation.collection.js';
import { findClassDeclarations, findClassPropertyByType, findPropertyCallExpressions, findMethodCallExpressions, getStringsFromExpression, findMethodParameterByType, findConstructorDeclaration, getSuperClassName, getImportPath } from '../utils/ast-helpers.js';
import * as path from 'path';
import * as fs from 'fs';
const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];
export class ServiceParser {
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
        let propNames;
        const propName = findClassPropertyByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
        if (propName) {
            propNames = [propName];
        }
        else {
            propNames = this.findParentClassProperties(classDeclaration, sourceFile);
        }
        return propNames.flatMap(name => findPropertyCallExpressions(classDeclaration, name, TRANSLATE_SERVICE_METHOD_NAMES));
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
        const currDir = path.dirname(ast.fileName);
        const superClassPath = path.resolve(currDir, importPath + '.ts');
        if (superClassPath in ServiceParser.propertyMap) {
            return ServiceParser.propertyMap.get(superClassPath);
        }
        const superClassFile = fs.readFileSync(superClassPath, 'utf8');
        const superClassAst = tsquery.ast(superClassFile, superClassPath);
        const superClassDeclarations = findClassDeclarations(superClassAst, superClassName);
        const superClassPropertyNames = superClassDeclarations
            .map(superClassDeclaration => findClassPropertyByType(superClassDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE))
            .filter(n => !!n);
        if (superClassPropertyNames.length > 0) {
            ServiceParser.propertyMap.set(superClassPath, superClassPropertyNames);
            return superClassPropertyNames;
        }
        else {
            superClassDeclarations.forEach(declaration => superClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst)));
            return superClassPropertyNames.flat();
        }
    }
}
ServiceParser.propertyMap = new Map();
//# sourceMappingURL=service.parser.js.map