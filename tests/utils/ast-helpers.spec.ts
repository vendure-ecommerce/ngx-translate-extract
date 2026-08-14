import { parseTemplate, TmplAstSwitchBlock } from '@angular/compiler';
import { ScriptKind, SyntaxKind, tsquery } from '@phenomnomnominal/tsquery';
import { LanguageVariant, type ClassDeclaration, isClassDeclaration, type VariableStatement, type Expression } from 'typescript';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import {
	findClassDeclarations,
	findClassPropertiesConstructorParameterByType,
	findClassPropertiesDeclarationByInject,
	findClassPropertiesDeclarationByType,
	findClassPropertiesGetterByType,
	findFunctionCallExpressions,
	findFunctionExpressions,
	findInlineInjectCallExpressions,
	findMethodCallExpressions,
	findMethodParameterByType,
	findPropertyCallExpressions,
	findSimpleCallExpressions,
	findVariableNameByInjectType,
	getAST,
	getComponentInlineTemplate,
	getNamedImport,
	getNamedImportAlias,
	getNodesFromSwitchBlockTmpl,
	getStringsFromExpression,
	getSuperClassName,
} from '../../src/utils/ast-helpers.js';

describe('getAST()', () => {
	const tsqueryAstSpy = vi.spyOn(tsquery, 'ast');

	beforeEach(() => {
		tsqueryAstSpy.mockClear();
	});

	it('should return the AST for a TypeScript source with a .ts file extension', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.ts';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TS);
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.Standard);
	});

	it('should return the AST for a TypeScript source with a .tsx file extension', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.tsx';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TSX);
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should return the AST for a JavaScript source with a .js file extension', () => {
		const source = 'const x = 42;';
		const fileName = 'example.js';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.JS);
		// JS files also return JSX language variant.
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should return the AST for a JavaScript source with a .jsx file extension', () => {
		const source = 'const x = 42;';
		const fileName = 'example.jsx';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.JSX);
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.JSX);
	});

	it('should use ScriptKind.TS if the file extension is unsupported', () => {
		const source = 'const x: number = 42;';
		const fileName = 'example.unknown';

		const result = getAST(source, fileName);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, fileName, ScriptKind.TS);
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.Standard);
	});

	it('should use ScriptKind.TS if no file name is provided', () => {
		const source = 'const x: number = 42;';

		const result = getAST(source);

		expect(tsqueryAstSpy).toHaveBeenCalledWith(source, '', ScriptKind.TS);
		expect(result.parsedFile.languageVariant).toBe(LanguageVariant.Standard);
	});
});

describe('getComponentInlineTemplate()', () => {
	it('should find the inline template property assignment within a @Component decorator', () => {
		const code = `
            @Component({
                selector: 'app-hello',
                standalone: true,
                template: '<div>Hello World</div>',
                styles: ['div { color: red; }']
            })
            export class HelloComponent {}
        `;
		const node = getAST(code).parsedFile!;

		const results = getComponentInlineTemplate(node);

		expect(results).toHaveLength(1);
		// Verify it grabbed the actual PropertyAssignment node ('template: "..."')
		expect(results[0].name.getText()).toBe('template');
		expect(results[0].initializer.getText()).toBe("'<div>Hello World</div>'");
	});

	it('should NOT match when the component uses templateUrl instead of an inline template', () => {
		const code = `
            @Component({
                selector: 'app-hello',
                templateUrl: './hello.component.html'
            })
            export class HelloComponent {}
        `;
		const node = getAST(code).parsedFile!;

		const results = getComponentInlineTemplate(node);

		expect(results).toHaveLength(0);
	});

	it('should ignore template properties in standard objects or other decorators', () => {
		const code = `
            // False positive trap 1: A different decorator that happens to have a 'template' property
            @Directive({
                selector: '[custom]',
                template: 'ignored'
            })
            export class CustomDirective {}

            // False positive trap 2: A standard variable assignment
            const config = {
                template: '<div>Not a component</div>'
            };

            // False positive trap 3: A nested object inside a Component, but not the root metadata
            @Component({
                selector: 'app-wrapper',
                providers: [{ provide: TEMPLATE_TOKEN, useValue: { template: 'ignored' } }]
            })
            export class WrapperComponent {}
        `;
		const node = getAST(code).parsedFile!;

		const results = getComponentInlineTemplate(node);

		expect(results).toHaveLength(0);
	});
});

describe('getNamedImport()', () => {
	describe('with a normal import', () => {
		const node = tsquery.ast(`
			import { Base } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given exact import path', () => {
			expect(getNamedImport(node, 'CoreBase', './src/base')).to.equal(null);
			expect(getNamedImport(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given a regex pattern for the import path', () => {
			expect(getNamedImport(node, 'CoreBase', new RegExp('base'))).to.equal(null);
			expect(getNamedImport(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});

	describe('with an aliased import', () => {
		const node = tsquery.ast(`
			import { Base as CoreBase } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given an alias and exact import path', () => {
			expect(getNamedImport(node, 'CoreBase', './src/base')).to.equal('Base');
			expect(getNamedImport(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given an alias and a regex pattern for the import path', () => {
			expect(getNamedImport(node, 'CoreBase', new RegExp('base'))).to.equal('Base');
			expect(getNamedImport(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});
});

describe('getNamedImportAlias()', () => {
	describe('with a normal import', () => {
		const node = tsquery.ast(`
			import { Base } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the original class name when given exact import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', './src/base')).to.equal(null);
			expect(getNamedImportAlias(node, 'Base', './src/base')).to.equal('Base');
		});

		it('should return the original class name when given a regex pattern for the import', () => {
			expect(getNamedImportAlias(node, 'CoreBase', new RegExp('base'))).to.equal(null);
			expect(getNamedImportAlias(node, 'Base', new RegExp('base'))).to.equal('Base');
		});
	});

	describe('with an aliased import', () => {
		const node = tsquery.ast(`
			import { Base as CoreBase } from './src/base';

			export class Test extends CoreBase {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`);

		it('should return the aliased class name when given an alias and exact import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', './src/base')).to.equal('CoreBase');
			expect(getNamedImportAlias(node, 'Base', './src/base')).to.equal('CoreBase');
		});

		it('should return the aliased class name when given an alias and a regex pattern for the import path', () => {
			expect(getNamedImportAlias(node, 'CoreBase', new RegExp('base'))).to.equal('CoreBase');
			expect(getNamedImportAlias(node, 'Base', new RegExp('base'))).to.equal('CoreBase');
		});
	});
});

describe('findClassDeclarations()', () => {
	it('should return all class declarations when no name filter is provided', () => {
		const code = `
            class UserService {}
            class AuthService {}
            class LoggingService {}
        `;
		const node = getAST(code).parsedFile!;

		const results = findClassDeclarations(node);

		const classNames = results.map((c) => c.name?.text);
		expect(classNames).toEqual(['UserService', 'AuthService', 'LoggingService']);
	});

	it('should return only the class that matches the specified name', () => {
		const code = `
            class UserService {}
            class AuthService {}
        `;
		const node = getAST(code).parsedFile!;

		const results = findClassDeclarations(node, 'AuthService');

		const classNames = results.map((c) => c.name?.text);
		expect(classNames).toEqual(['AuthService']);
	});

	it('should handle anonymous/default export classes', () => {
		const code = `
            // Anonymous class (common in some routing or module setups)
            export default class {}

            class NamedService {}
        `;
		const node = getAST(code).parsedFile!;

		// Getting all classes should include the anonymous one
		const allResults = findClassDeclarations(node);
		expect(allResults).toHaveLength(2);

		// Searching by name should skip the anonymous one without throwing an error
		const filteredResults = findClassDeclarations(node, 'NamedService');
		expect(filteredResults).toHaveLength(1);
		expect(filteredResults[0].name?.text).toBe('NamedService');
	});

	it('should perform a strict, case-sensitive match and ignore partial matches', () => {
		const code = `
            class ConfigService {}
            class ConfigServiceBase {}
            class configservice {}
        `;
		const node = getAST(code).parsedFile!;

		const results = findClassDeclarations(node, 'ConfigService');

		// Should not match "ConfigServiceBase" (partial match) or "configservice" (wrong casing)
		expect(results).toHaveLength(1);
		expect(results[0].name?.text).toBe('ConfigService');
	});
});

describe('findFunctionExpressions()', () => {
	it('should find arrow functions assigned to variables', () => {
		const code = `
            const myArrow = (x: number) => x * 2;
            let helper = () => { console.log('hi'); };
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionExpressions(node);

		expect(results).toHaveLength(2);
		expect(results[0].kind).toBe(SyntaxKind.ArrowFunction);
		expect(results[1].kind).toBe(SyntaxKind.ArrowFunction);
	});

	it('should find standard function expressions assigned to variables', () => {
		const code = `
            const myFunc = function() {
                return 'hello';
            };
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionExpressions(node);

		expect(results).toHaveLength(1);
		expect(results[0].kind).toBe(SyntaxKind.FunctionExpression);
	});

	it('should ignore standard function declarations', () => {
		const code = `
            // This is a FunctionDeclaration, not a FunctionExpression assigned to a variable
            function classicFunction() {
                return 'I should be ignored';
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionExpressions(node);

		expect(results).toHaveLength(0);
	});

	it('should match nested/inline functions within variables', () => {
		const code = `
            const processData = () => {
                return [1, 2, 3].map(x => x * 2);
            };
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionExpressions(node);

		expect(results).toHaveLength(2);
	});
});

describe('getSuperClassName()', () => {
	it('should return the name of the extended base class', () => {
		const code = `
            class MyComponent extends BaseComponent {}
        `;
		const node = getAST(code).parsedFile!;

		const classNode = node.statements[0];

		expect(getSuperClassName(classNode)).toBe('BaseComponent');
	});

	it('should return null if the class does not extend anything', () => {
		const code = `
            class StandaloneComponent {}
        `;
		const node = getAST(code).parsedFile!;
		const classNode = node.statements[0];

		expect(getSuperClassName(classNode)).toBe(null);
	});

	it('should NOT return a value from a different class later in the file', () => {
		const code = `
            // Class 1: Extends nothing
            class FirstComponent {}

            // Class 2: Extends something
            class SecondComponent extends BaseService {}
        `;
		const node = getAST(code).parsedFile!;

		// Pass Class 1 to the function
		const firstClassNode = node.statements[0];

		expect(getSuperClassName(firstClassNode)).toBe(null);
	});

	it('should ignore "implements" clauses', () => {
		const code = `
            class MyComponent implements OnInit, OnDestroy {}
        `;
		const node = getAST(code).parsedFile!;
		const classNode = node.statements[0];

		expect(getSuperClassName(classNode)).toBe(null);
	});
});

describe('getStringsFromExpression()', () => {
	function getExpressionNode(code: string) {
		const file = getAST(`const target = ${code};`).parsedFile!;
		const statement = file.statements[0] as VariableStatement;
		return statement.declarationList.declarations[0].initializer as Expression;
	}

	describe('Base Extractions', () => {
		it('should extract a standard string literal', () => {
			const node = getExpressionNode("'hello_world'");
			expect(getStringsFromExpression(node)).toEqual(['hello_world']);
		});

		it('should extract string literals from arrays and ignore empty strings', () => {
			const node = getExpressionNode("['a', 'b', '', 'c']");
			expect(getStringsFromExpression(node)).toEqual(['a', 'b', 'c']);
		});
	});

	describe('Concatenations (+)', () => {
		it('should concatenate purely static string segments', () => {
			const node = getExpressionNode("'hello' + '_' + 'world'");
			expect(getStringsFromExpression(node)).toEqual(['hello_world']);
		});

		it('should ignore concatenations that contain dynamic variables', () => {
			const node = getExpressionNode("'prefix-' + dynamicVariable");
			expect(getStringsFromExpression(node)).toEqual([]);
		});

		it('should generate all combinations when concatenating branching logic', () => {
			const node = getExpressionNode("(isTrue ? 'user_' : 'admin_') + 'profile'");
			expect(getStringsFromExpression(node)).toEqual(['user_profile', 'admin_profile']);
		});

		it('should concatenate purely static string segments', () => {
			const node = getExpressionNode("'hello' + '_' + 'world'");
			expect(getStringsFromExpression(node)).toEqual(['hello_world']);
		});

		it('should treat empty string segments as valid parts of a concatenation', () => {
			const node = getExpressionNode("'' + 'my_class'");
			expect(getStringsFromExpression(node)).toEqual(['my_class']);
		});

		it('should preserve whitespace-only segments inside a concatenation', () => {
			const node = getExpressionNode("'hello' + ' ' + 'world'");
			expect(getStringsFromExpression(node)).toEqual(['hello world']);
		});

		it('should ignore concatenations that contain dynamic variables', () => {
			const node = getExpressionNode("'prefix-' + dynamicVariable");
			expect(getStringsFromExpression(node)).toEqual([]);
		});
	});

	describe('Branching Logic (||, ? :)', () => {
		it('should extract all possible paths from logical OR operators', () => {
			const node = getExpressionNode("'primary' || 'fallback'");
			expect(getStringsFromExpression(node)).toEqual(['primary', 'fallback']);
		});

		it('should extract all possible paths from ternary operators', () => {
			const node = getExpressionNode("isTrue ? 'yes' : 'no'");
			expect(getStringsFromExpression(node)).toEqual(['yes', 'no']);
		});

		it('should safely flatten nested arrays inside branching logic', () => {
			const node = getExpressionNode("condition ? ['a', 'b'] : 'c'");
			expect(getStringsFromExpression(node)).toEqual(['a', 'b', 'c']);
		});
	});
});

describe('getNodesFromSwitchBlockTmpl()', () => {
	it('should extract nodes from a @switch', () => {
		const nodes = parseTemplate(
			`
			@switch (condition) {
				@case (caseA) {
				  <div>switch.caseA</div>
				}
				@case (caseB) {
				  <div>switch.caseB</div>
				}
				@default {
				  <div>switch.default</div>
				}
			  }
		`,
			'.',
		).nodes;

		expect(nodes.length).toBe(1);
		expect(nodes.at(0)).toBeInstanceOf(TmplAstSwitchBlock);

		const childNodes = getNodesFromSwitchBlockTmpl(nodes.at(0) as TmplAstSwitchBlock);
		expect(childNodes.length).toBe(3);
		expect(childNodes.at(0).children.at(0).value).toBe('switch.caseA');
		expect(childNodes.at(1).children.at(0).value).toBe('switch.caseB');
		expect(childNodes.at(2).children.at(0).value).toBe('switch.default');
	});

	it('should extract nodes from a @switch with `cases` property', () => {
		const nodes = parseTemplate(
			`
			@switch (condition) {
				@case (caseA) {
				  <div>switch.caseA</div>
				}
				@case (caseB) {
				  <div>switch.caseB</div>
				}
				@default {
				  <div>switch.default</div>
				}
			  }
		`,
			'.',
		).nodes;
		const switchBlockNode = nodes.at(0) as TmplAstSwitchBlock;

		// Create a mock node with the 'cases' property since we cannot install an older version of angular compiler
		// only for the test.
		Reflect.defineProperty(switchBlockNode, 'cases', { value: switchBlockNode.groups });
		Reflect.deleteProperty(switchBlockNode, 'groups');

		const childNodes = getNodesFromSwitchBlockTmpl(switchBlockNode);
		expect(childNodes.length).toBe(3);
		expect(childNodes.at(0).children.at(0).value).toBe('switch.caseA');
		expect(childNodes.at(1).children.at(0).value).toBe('switch.caseB');
		expect(childNodes.at(2).children.at(0).value).toBe('switch.default');
	});
});

describe('findMethodParameterByType()', () => {
	it('should return the name of the parameter that matches the specified type', () => {
		const code = `
            class MyService {
                initialize(id: string, config: AppConfig, force: boolean) {
                    // ...
                }
            }
        `;
		const node = getClassDeclarationNode(code);

		const result = findMethodParameterByType(node, 'AppConfig');

		expect(result).toBe('config');
	});

	it('should NOT match parameter names that happen to share the type name', () => {
		const code = `
            class MyService {
                // 'AppConfig' is used as a parameter name for a different type,
                // while 'validConfig' is the actual parameter we want.
                setup(AppConfig: LegacyConfig, validConfig: AppConfig) {
                    // ...
                }
            }
        `;
		const node = getClassDeclarationNode(code);

		const result = findMethodParameterByType(node, 'AppConfig');

		// It must ignore the trap and return the correct identifier
		expect(result).toBe('validConfig');
	});

	it('should return null if the target type does not exist in the parameters', () => {
		const code = `
            class MyService {
                processData(data: string, options: any) {
                    // ...
                }
            }
        `;
		const node = getClassDeclarationNode(code);

		const result = findMethodParameterByType(node, 'AppConfig');

		expect(result).toBe(null);
	});
});

describe('findVariableNameByInjectType()', () => {
	it('should return the name of the variable that is assigned the injected type', () => {
		const code = `
            function setup() {
                const myConfig = inject(AppConfig);
            }
        `;
		const node = getAST(code).parsedFile!;

		const result = findVariableNameByInjectType(node, 'AppConfig');

		expect(result).toBe('myConfig');
	});

	it('should NOT match a variable name that shares the target type name but injects something else', () => {
		const code = `
            function setup() {
                // False positive trap: The variable is named 'AppConfig', but it injects 'LegacyConfig'
                const AppConfig = inject(LegacyConfig);

                // The actual valid injection
                const validConfig = inject(AppConfig);
            }
        `;
		const node = getAST(code).parsedFile!;

		const result = findVariableNameByInjectType(node, 'AppConfig');

		// It must ignore the trap and find 'validConfig'
		expect(result).toBe('validConfig');
	});

	it('should return null if the type is never injected in a variable declaration', () => {
		const code = `
            function setup() {
                const unrelated = inject(OtherService);
                let count = 0;
            }
        `;
		const node = getAST(code).parsedFile!;

		const result = findVariableNameByInjectType(node, 'AppConfig');

		expect(result).toBe(null);
	});
});

describe('findMethodCallExpressions()', () => {
	it('should find a call expression matching a specific property and single method name', () => {
		const code = `
            function initialize() {
                // Correct match
                appConfig.loadEnvironment('prod');

                // Ignored: wrong method name
                appConfig.clear();

                // Ignored: wrong property name
                otherConfig.loadEnvironment('dev');
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findMethodCallExpressions(node, 'appConfig', 'loadEnvironment');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe("appConfig.loadEnvironment('prod')");
	});

	it('should find multiple call expressions when provided an array of method names', () => {
		const code = `
            function handleRequests() {
                httpClient.get('/api/data');
                httpClient.post('/api/data', payload);
                httpClient.delete('/api/data/1'); // Not in the array, should be ignored
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findMethodCallExpressions(node, 'httpClient', ['get', 'post']);

		expect(results).toHaveLength(2);

		// Map to string text to easily verify the matched AST nodes
		const callTexts = results.map((r) => r.getText());
		expect(callTexts).toContain("httpClient.get('/api/data')");
		expect(callTexts).toContain("httpClient.post('/api/data', payload)");
		expect(callTexts).not.toContain("httpClient.delete('/api/data/1')");
	});

	it('should ignore method calls prefixed with "this."', () => {
		const code = `
            class DataService {
                fetch() {
                    // False positive trap: ignored because of 'this.'
                    this.api.requestData();

                    // Valid match: local or injected variable without 'this.'
                    api.requestData();
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findMethodCallExpressions(node, 'api', 'requestData');

		// It must completely ignore `this.api.requestData()` due to the :not(:has(ThisKeyword)) selector
		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe('api.requestData()');
	});
});

describe('findInlineInjectCallExpressions()', () => {
	it('should find a specific method call chained directly to the target injected type', () => {
		const code = `
            function initialize() {
                // Correct match
                inject(AppConfig).loadEnvironment('prod');

                // Ignored: wrong method name
                inject(AppConfig).clear();

                // Ignored: wrong injected type
                inject(OtherConfig).loadEnvironment('dev');
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findInlineInjectCallExpressions(node, 'AppConfig', 'loadEnvironment');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe("inject(AppConfig).loadEnvironment('prod')");
	});

	it('should find multiple method calls when provided an array of function names', () => {
		const code = `
            function handleRequests() {
                inject(HttpClient).get('/api/data');
                inject(HttpClient).post('/api/data', payload);
                inject(HttpClient).delete('/api/data/1'); // Not in the array, should be ignored
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findInlineInjectCallExpressions(node, 'HttpClient', ['get', 'post']);

		expect(results).toHaveLength(2);

		const callTexts = results.map((r) => r.getText());
		expect(callTexts).toContain("inject(HttpClient).get('/api/data')");
		expect(callTexts).toContain("inject(HttpClient).post('/api/data', payload)");
		expect(callTexts).not.toContain("inject(HttpClient).delete('/api/data/1')");
	});

	it('should ignore standard variable or class property method calls', () => {
		const code = `
            class DataService {
                constructor(private http: HttpClient) {}

                fetch() {
                    // False positive trap: matches method and type conceptually, but is NOT an inline inject
                    this.http.get('/api/data');

                    // False positive trap: standard variable
                    const client = inject(HttpClient);
                    client.get('/api/data');

                    // Valid match: true inline inject
                    inject(HttpClient).get('/api/data');
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findInlineInjectCallExpressions(node, 'HttpClient', 'get');

		// It must strictly require the `inject(...)` wrapper as part of the call expression chain
		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe("inject(HttpClient).get('/api/data')");
	});
});

describe('findClassPropertiesConstructorParameterByType()', () => {
	it('should find properties defined via constructor parameters with access modifiers', () => {
		const code = `
            class MyService {
                constructor(
                    private auth: AuthService,
                    public config: AppConfig,
                    protected readonly logger: LoggerService
                ) {}
            }
        `;
		const classNode = getClassDeclarationNode(code);

		// Test basic private modifier
		expect(findClassPropertiesConstructorParameterByType(classNode, 'AuthService')).toEqual(['auth']);

		// Test multiple modifiers (protected readonly)
		expect(findClassPropertiesConstructorParameterByType(classNode, 'LoggerService')).toEqual(['logger']);
	});

	it('should ignore constructor parameters that do NOT have access/readonly modifiers', () => {
		const code = `
            class MyService {
                constructor(
                    private validService: AuthService,

                    // Not a class property! Just a local constructor variable.
                    tempData: AuthService,

                    // Not a class property! (no modifier)
                    mockService: AuthService
                ) {}
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesConstructorParameterByType(classNode, 'AuthService');

		// It must only return the one defined as a class property
		expect(results).toHaveLength(1);
		expect(results).toEqual(['validService']);
	});

	it('should NOT match parameter names that happen to share the target type name', () => {
		const code = `
            class MyService {
                constructor(
                    // False positive trap: named 'AppConfig' but type is 'LegacyConfig'
                    private AppConfig: LegacyConfig,

                    // The actual valid property
                    private validConfig: AppConfig
                ) {}
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesConstructorParameterByType(classNode, 'AppConfig');

		// It must completely ignore the naming trap
		expect(results).toHaveLength(1);
		expect(results).toEqual(['validConfig']);
	});
});

describe('findClassPropertiesDeclarationByType()', () => {
	it('should find all properties matching the exact specified type', () => {
		const code = `
            class MyComponent {
                mainService: TranslateService;
                fallbackService: TranslateService;
                unrelated: OtherService;
            }
        `;
		const classDecl = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByType(classDecl, 'TranslateService');

		expect(results).toHaveLength(2);
		expect(results).toEqual(expect.arrayContaining(['mainService', 'fallbackService']));
	});

	it('should ignore properties that have the same name as the target type', () => {
		const code = `
		  	class MyComponent {
				// Property name matches AuthService type, but its type is different
				AuthService: DifferentService;

				// Correct usage
				validService: AuthService;
			}
		`;

		const classDecl = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByType(classDecl as ClassDeclaration, 'AuthService');

		// It should ONLY find 'validService', ignoring 'AuthService'
		expect(results).toEqual(['validService']);
		expect(results).not.toContain('AuthService');
	});

	it('should ignore properties that have the same name as the target type', () => {
		const code = `
            class MyComponent {
                // Possible false positive: Property name matches the target type
                TranslateService: OtherService;

                // Possible false positive: Type name is a partial match
                mockLogger: MockTranslateService;

                // The actual valid property
                validTranslateService: TranslateService;
            }
        `;
		const classDecl = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByType(classDecl, 'TranslateService');

		expect(results).toEqual(['validTranslateService']);
	});

	it('should find the type even when wrapped in modifiers, unions, or strict initialization', () => {
		const code = `
            class MyComponent {
                // Access modifiers & readonly
                private readonly loggerA: LoggerService;

                // Union types
                public loggerB: LoggerService | null;

                // Initialization operator
                loggerC!: LoggerService;
            }
        `;
		const classDecl = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByType(classDecl, 'LoggerService');

		expect(results).toHaveLength(3);
		expect(results).toEqual(expect.arrayContaining(['loggerA', 'loggerB', 'loggerC']));
	});

	it('should ignore arrays, generic wrappers, and generic initializers', () => {
		const code = `
            class MyComponent {
                // Arrays of the requested Type should be ignored
                public arrayA: TranslateService[];
                public arrayB: Array<TranslateService>;

                // Generic wrappers of the requested Type should be ignored
                public wrappedA: Signal<TranslateService>;
                public wrappedB: ng.Signal<TranslateService>;

                // Initializers containing the target type as a generic should be ignored
                public initializedProp = createConfig<TranslateService>();
                readonly signalProp = signal<TranslateService | undefined>();

                // False positive trap: generic wrapper matches, but internal type doesn't
                public falseTrap: Observable<OtherConfig>;

                // The actual valid properties
                public validLogger: TranslateService;
                public namespacedLogger: ngx.TranslateService;
                public unionLogger: TranslateService | null;
            }
        `;
		const classDecl = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByType(classDecl, 'TranslateService');

		// It must ignore all the traps and only return the exact matches
		expect(results).toEqual(['validLogger', 'namespacedLogger', 'unionLogger']);
	});
});

describe('findClassPropertiesDeclarationByInject()', () => {
	it('should find properties that are initialized using inject() with the target type', () => {
		const code = `
            class MyComponent {
                // Correct matches
                private config = inject(AppConfig);
                public fallback = inject(AppConfig);

                // Ignored: wrong type
                private logger = inject(LoggerService);
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByInject(classNode, 'AppConfig');

		expect(results).toHaveLength(2);
		expect(results).toEqual(expect.arrayContaining(['config', 'fallback']));
	});

	it('should NOT match property names that happen to share the target type name', () => {
		const code = `
            class MyComponent {
                // False positive trap: Property is named 'AppConfig', but injects 'LegacyConfig'
                AppConfig = inject(LegacyConfig);

                // The actual valid injection
                validConfig = inject(AppConfig);
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByInject(classNode, 'AppConfig');

		// It must ignore the trap and only find 'validConfig'
		expect(results).toHaveLength(1);
		expect(results).toEqual(['validConfig']);
	});

	it('should return an empty array if the type is never injected into a property', () => {
		const code = `
            class MyComponent {
                // Standard property, not injected
                config: AppConfig;

                // Injected, but wrong type
                logger = inject(LoggerService);
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesDeclarationByInject(classNode, 'AppConfig');

		expect(results).toEqual([]);
	});
});

describe('findClassPropertiesGetterByType()', () => {
	it('should find getters that explicitly declare the target return type', () => {
		const code = `
            class MyComponent {
                // Correct match
                get config(): AppConfig {
                    return this._config;
                }

                // Ignored: wrong return type
                get logger(): LoggerService {
                    return this._logger;
                }
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesGetterByType(classNode, 'AppConfig');

		expect(results).toHaveLength(1);
		expect(results).toEqual(['config']);
	});

	it('should NOT match getters that happen to share the target type name', () => {
		const code = `
            class MyComponent {
                // False positive trap 1: Getter is named 'AppConfig', but returns 'LegacyConfig'
                get AppConfig(): LegacyConfig {
                    return this._legacy;
                }

                // The actual valid getter
                get validConfig(): AppConfig {
                    return this._config;
                }
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesGetterByType(classNode, 'AppConfig');

		// It must ignore the name trap and only find 'validConfig'
		expect(results).toHaveLength(1);
		expect(results).toEqual(['validConfig']);
	});

	it('should NOT match getters that just use the type inside their body logic', () => {
		const code = `
            class MyComponent {
                // False positive trap 2: The body mentions 'AppConfig', but the return type is 'any'
                get someData(): any {
                    const temp = inject(AppConfig);
                    return temp.getData();
                }
            }
        `;
		const classNode = getClassDeclarationNode(code);

		const results = findClassPropertiesGetterByType(classNode, 'AppConfig');

		// It must ignore the getter entirely since the declared return type is not 'AppConfig'
		expect(results).toEqual([]);
	});
});

describe('findFunctionCallExpressions()', () => {
	it('should find top-level function calls by name', () => {
		const code = `
            function setup() {
                // Valid matches
                bootstrapApplication();
                initialize();
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionCallExpressions(node, 'bootstrapApplication');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe('bootstrapApplication()');
	});

	it('should support an array of function names using regex', () => {
		const code = `
            const a = inject(ServiceA);
            const b = forwardRef(() => ServiceB);
            const c = unrelated();
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionCallExpressions(node, ['inject', 'forwardRef']);

		expect(results).toHaveLength(2);
		const textResults = results.map((r) => r.getText());
		expect(textResults).toContain('inject(ServiceA)');
		expect(textResults).toContain('forwardRef(() => ServiceB)');
	});

	it('should ignore method calls chained on objects or "this"', () => {
		const code = `
            class MyComponent {
                setup() {
                    // False positive traps: these are PropertyAccessExpressions
                    this.inject();
                    TestBed.inject(ServiceA);

                    // Valid match: top-level
                    inject(ServiceB);
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findFunctionCallExpressions(node, 'inject');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe('inject(ServiceB)');
	});
});

describe('findSimpleCallExpressions()', () => {
	it('should find both top-level functions AND method calls', () => {
		const code = `
            class MyComponent {
                setup() {
                    // It should find ALL of these because it is a "simple" query
                    this.inject();
                    TestBed.inject(ServiceA);
                    inject(ServiceB);
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findSimpleCallExpressions(node, 'inject');

		expect(results).toHaveLength(3);
		const textResults = results.map((r) => r.getText());
		expect(textResults).toContain('this.inject()');
		expect(textResults).toContain('TestBed.inject(ServiceA)');
		expect(textResults).toContain('inject(ServiceB)');
	});

	it('should support finding multiple function names using an array', () => {
		const code = `
            function run() {
                console.log('test');
                logger.warn('test');
                alert('test');
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findSimpleCallExpressions(node, ['log', 'warn']);

		expect(results).toHaveLength(2);
		const textResults = results.map((r) => r.getText());
		expect(textResults).toContain("console.log('test')");
		expect(textResults).toContain("logger.warn('test')");
	});
});

describe('findPropertyCallExpressions()', () => {
	it('should find method calls on a specific class property via "this."', () => {
		const code = `
            class MyComponent {
                constructor(private authService: AuthService) {}

                login() {
                    // Valid match
                    this.authService.authenticate();

                    // Ignored: wrong method name
                    this.authService.logout();

                    // Ignored: wrong property name
                    this.otherService.authenticate();
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findPropertyCallExpressions(node, 'authService', 'authenticate');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe('this.authService.authenticate()');
	});

	it('should find multiple method calls when provided an array of function names', () => {
		const code = `
            class DataService {
                constructor(private http: HttpClient) {}

                fetchData() {
                    // Valid matches
                    this.http.get('/api/data');
                    this.http.post('/api/data', payload);

                    // Ignored: not in the array
                    this.http.delete('/api/data/1');
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findPropertyCallExpressions(node, 'http', ['get', 'post']);

		expect(results).toHaveLength(2);

		const callTexts = results.map((r) => r.getText());
		expect(callTexts).toContain("this.http.get('/api/data')");
		expect(callTexts).toContain("this.http.post('/api/data', payload)");
		expect(callTexts).not.toContain("this.http.delete('/api/data/1')");
	});

	it('should ignore calls that do not use "this." or belong to local variables', () => {
		const code = `
            class MyComponent {
                process() {
                    // False positive trap: matches property name and method, but lacks "this."
                    const http = inject(HttpClient);
                    http.get('/api/data');

                    // Valid match
                    this.http.get('/api/data');
                }
            }
        `;
		const node = getAST(code).parsedFile!;

		const results = findPropertyCallExpressions(node, 'http', 'get');

		expect(results).toHaveLength(1);
		expect(results[0].getText()).toBe("this.http.get('/api/data')");
	});
});

function getClassDeclarationNode(code: string): ClassDeclaration {
	const ast = tsquery.ast(code, 'test.ts', ScriptKind.TS);
	const classDecl = tsquery.query<ClassDeclaration>(ast, 'ClassDeclaration')[0];

	if (!isClassDeclaration(classDecl)) {
		throw new Error('No class declaration found');
	}

	return classDecl;
}
