import { tsquery } from '@phenomnomnominal/tsquery';
import { TranslationCollection } from '../utils/translation.collection.js';
import { findClassDeclarations, findClassPropertyByType, findPropertyCallExpressions, findMethodCallExpressions, getStringsFromExpression, findMethodParameterByType, findConstructorDeclaration, getSuperClassName, getImportPath } from '../utils/ast-helpers.js';
import * as path from 'path';
import * as fs from 'fs';
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
        else if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            return [];
        }
        const currDir = path.dirname(ast.fileName);
        const superClassPath = path.resolve(currDir, importPath);
        if (superClassPath in ServiceParser.propertyMap) {
            return ServiceParser.propertyMap.get(superClassPath);
        }
        const superClassFile = superClassPath + '.ts';
        let potentialSuperFiles;
        if (fs.existsSync(superClassFile) && fs.lstatSync(superClassFile).isFile()) {
            potentialSuperFiles = [superClassFile];
        }
        else if (fs.existsSync(superClassPath) && fs.lstatSync(superClassPath).isDirectory()) {
            potentialSuperFiles = fs.readdirSync(superClassPath).filter(file => file.endsWith('.ts')).map(file => path.join(superClassPath, file));
        }
        const superClassPropertyNames = [];
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
            }
            else {
                superClassDeclarations.forEach(declaration => superClassPropertyNames.push(...this.findParentClassProperties(declaration, superClassAst)));
            }
        });
        return superClassPropertyNames;
    }
}
//# sourceMappingURL=service.parser.js.map