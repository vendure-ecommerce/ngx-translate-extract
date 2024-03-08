import { afterEach, describe, beforeEach, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ServiceParser } from '../../src/parsers/service.parser.js';

describe('ServiceParser', () => {
	let parser: ServiceParser;
	let tempDir: string;
	let componentFilename: string;

	beforeEach(() => {
		parser = new ServiceParser();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngxte-'));
		componentFilename = path.resolve(tempDir, 'test.component.ts');
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true });
	});

	it('should extract strings when TranslateService is accessed directly via constructor parameter', () => {
		const contents = `
			@Component({ })
			export class MyComponent {
				public constructor(protected translateService: TranslateService) {
					translateService.get('It works!');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['It works!']);
	});

	it('should locate TranslateService when injected with public, protected, private and readonly keyword', () => {
		const ACCESSORS = ['public', 'protected', 'private', 'readonly'];

		ACCESSORS.forEach((accessor) => {
			const contents = `
				@Component({ })
				export class AppComponent {
					public constructor(${accessor} _translateService: TranslateService) { }
					public test() {
						this._translateService.get('Hello get');
						this._translateService.instant('Hello instant');
						this._translateService.stream('Hello stream');
					}
				`;
			const keys = parser.extract(contents, componentFilename)?.keys();
			expect(keys).to.deep.equal(['Hello get', 'Hello instant', 'Hello stream'], `Accessor value: "${accessor}"`);
		});
	});

	it('should support extracting binary expressions', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					const message = 'The Message';
					this._translateService.get(message || 'Fallback message');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Fallback message']);
	});

	it('should support conditional operator', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					const message = 'The Message';
					this._translateService.get(message ? message : 'Fallback message');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Fallback message']);
	});

	it('should extract strings in TranslateService\'s get() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.get('Hello World');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello World']);
	});

	it('should extract strings in TranslateService\'s instant() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.instant('Hello World');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello World']);
	});

	it('should extract strings in TranslateService\'s stream() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.stream('Hello World');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello World']);
	});

	it('should extract array of strings in TranslateService\'s get() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.get(['Hello', 'World']);
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello', 'World']);
	});

	it('should extract array of strings in TranslateService\'s instant() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.instant(['Hello', 'World']);
				}
		`;
		const key = parser.extract(contents, componentFilename)?.keys();
		expect(key).to.deep.equal(['Hello', 'World']);
	});

	it('should extract array of strings in TranslateService\'s stream() method', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.stream(['Hello', 'World']);
				}
		`;
		const key = parser.extract(contents, componentFilename)?.keys();
		expect(key).to.deep.equal(['Hello', 'World']);
	});

	it('should extract string arrays encapsulated in backticks', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.get([\`Hello\`, \`World\`]);
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello', 'World']);
	});

	it('should not extract strings in get()/instant()/stream() methods of other services', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(
					protected _translateService: TranslateService,
					protected _otherService: OtherService
				) { }
				public test() {
					this._otherService.get('Hello World');
					this._otherService.instant('Hi there');
					this._otherService.stream('Hi there');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should extract strings with liberal spacing', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(
					protected _translateService: TranslateService,
					protected _otherService: OtherService
				) { }
				public test() {
					this._translateService.instant('Hello');
					this._translateService.get ( 'World' );
					this._translateService.instant ( ['How'] );
					this._translateService.get([ 'Are' ]);
					this._translateService.get([ 'You' , 'Today' ]);
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello', 'World', 'How', 'Are', 'You', 'Today']);
	});

	it('should not extract string when not accessing property', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected trans: TranslateService) { }
				public test() {
					trans.get("You are expected at {{time}}", {time: moment.format('H:mm')}).subscribe();
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should extract string with params on same line', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService: TranslateService) { }
				public test() {
					this._translateService.get('You are expected at {{time}}', {time: moment.format('H:mm')});
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['You are expected at {{time}}']);
	});

	it('should not crash when constructor parameter has no type', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected _translateService) { }
				public test() {
					this._translateService.instant('Hello World');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should not extract variables', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected translateService: TranslateService) { }
				public test() {
					this.translateService.get(["yes", variable]).then(translations => {
						console.log(translations[variable]);
					});
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['yes']);
	});

	it('should extract strings from all classes in the file', () => {
		const contents = `
			import { Injectable } from '@angular/core';
			import { TranslateService } from '@ngx-translate/core';
			export class Stuff {
				thing: string;
				translate: any;
				constructor(thing: string) {
					this.translate.get('Not me');
					this.thing = thing;
				}
			}
			@Injectable()
			export class MyComponent {
				constructor(public translate: TranslateService) {
					this.translate.instant("Extract me!");
				}
			}
			export class OtherClass {
				constructor(thing: string, _translate: TranslateService) {
					this._translate.get("Do not extract me");
				}
			}
			@Injectable()
			export class AuthService {
				constructor(public translate: TranslateService) {
					this.translate.instant("Hello!");
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Extract me!', 'Hello!']);
	});

	it('should extract strings when TranslateService is declared as a property', () => {
		const contents = `
			export class MyComponent {
				protected translateService: TranslateService;
				public constructor() {
					this.translateService = new TranslateService();
				}
				public test() {
					this.translateService.instant('Hello World');
				}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello World']);
	});

	it('should extract strings when TranslateService is injected using the inject function ', () => {
		const contents = `
			export class MyComponent {
				private translateService = inject(TranslateService);

				public test() {
					this.translateService.instant('Hello World');
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Hello World']);
	});

	it('should extract strings passed to TranslateServices methods only', () => {
		const contents = `
			export class AppComponent implements OnInit {
				constructor(protected config: Config, protected translateService: TranslateService) {}

				public ngOnInit(): void {
					this.localizeBackButton();
				}

				protected localizeBackButton(): void {
					this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
						this.config.set('backButtonText', this.translateService.instant('Back'));
					});
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal(['Back']);
	});

	it('should not break when trying to follow a non-relative import', () => {
		const contents = `
			import { BaseClass } from '@angular/core';

			@Component({ })
			export class MyComponent extends BaseClass {
				public constructor() {
					this.translate.instant('nope');
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should not follow interface definitions', () => {
		const contents = `
			import { OnInit } from '@angular/core';

			@Component({ })
			export class MyComponent implements OnInit {
				public constructor() {
					this.translate.instant('nope');
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should not break on multi-line imports', () => {
		const contents = `
			import {
				ChangeDetectionStrategy,
				ChangeDetectorRef,
				Component,
				OnDestroy,
				OnInit,
				ViewEncapsulation
			} from '@angular/core';

			@Component({ })
			export class MyComponent implements OnInit, OnDestroy {
				public constructor() {
					this.translate.instant('nope');
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should recognize the property in the base class in another file', () => {
		const file_contents_base = `
			export abstract class Base {
				protected translate: TranslateService;
			}
		`;
		fs.writeFileSync(path.join(tempDir, 'base.ts'), file_contents_base);
		const file_contents_middle = `
			import { Base } from './base';
			export class Middle extends Base {
				public constructor() {
					super();
					this.translate.instant('middle');
				}
			}
		`;
		const file_name_middle = path.join(tempDir, 'middle.ts');
		let keys = parser.extract(file_contents_middle, file_name_middle)?.keys();
		expect(keys).to.deep.equal(['middle']);
		// also assert that multi-level works
		fs.writeFileSync(file_name_middle, file_contents_middle);
		const contents = `
			import { Middle } from './middle';

			export class Test extends Middle {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`;
		keys = parser.extract(contents, path.join(tempDir, 'test.ts'))?.keys();
		expect(keys).to.deep.equal(['test']);
	});

	it('should work with getters in base classes', () => {
		const file_contents_base = `
			export abstract class Base {
				protected get translate(): TranslateService {
					return this._translate;
				};

				private _translate: TranslateService;
			}
		`;
		fs.writeFileSync(path.join(tempDir, 'base.ts'), file_contents_base);
		const contents = `
			import { Base } from './base';

			export class Test extends Base {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`;
		const keys = parser.extract(contents, path.join(tempDir, 'test.ts'))?.keys();
		expect(keys).to.deep.equal(['test']);
	});

	it('should work with modules with an index.ts', () => {
		const file_contents_base = `
			export abstract class Base {
				protected translate: TranslateService;
			}
		`;
		fs.mkdirSync(path.join(tempDir, 'base'));
		fs.writeFileSync(path.join(tempDir, 'base', 'base.ts'), file_contents_base);
		const contents = `
			import { Base } from './base';

			export class Test extends Base {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`;
		const keys = parser.extract(contents, path.join(tempDir, 'test.ts'))?.keys();
		expect(keys).to.deep.equal(['test']);
	});

	it('should respect the baseUrl in tsconfig.json', () => {
		const tsconfig_contents = `
			{
				"compilerOptions": {
					"baseUrl": "./",
					"lib": [
						"es2020",
						"dom",
					],
				}
			}
		`;
		fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), tsconfig_contents);
		const file_contents_base = `
			export abstract class Base {
				protected translate: TranslateService;
			}
		`;
		fs.mkdirSync(path.join(tempDir, 'src', 'folder'), { recursive: true });
		fs.writeFileSync(path.join(tempDir, 'src', 'folder', 'base.ts'), file_contents_base);
		const contents = `
			import { Base } from 'src/folder/base';

			export class Test extends Base {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`;
		const keys = parser.extract(contents, path.join(tempDir, 'src', 'other_folder', 'test.ts'))?.keys();
		expect(keys).to.deep.equal(['test']);
	});

	it('should extract correctly when the base class is in the same file', () => {
		const contents = `
			export abstract class Base {
				protected translate: TranslateService;
			}

			export class Test extends Base {
				public constructor() {
					super();
					this.translate.instant("test");
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});

	it('should not extract chained function calls', () => {
		const contents = `
			@Component({ })
			export class AppComponent {
				public constructor(protected translate: TranslateService) { }
				public test() {
					const strings = ["a", "b", "c"];
					return strings.map(string => this.translate.instant(string)).join(', ');
				}
			}
		`;
		const keys = parser.extract(contents, componentFilename)?.keys();
		expect(keys).to.deep.equal([]);
	});
});
