import { describe, beforeEach, expect, it } from 'vitest';

import { PipeParser, TRANSLATE_PIPE_NAMES } from '../../src/parsers/pipe.parser.js';

describe('PipeParser', () => {
	const templateFilename: string = 'test.template.html';

	let parser: PipeParser;

	beforeEach(() => {
		parser = new PipeParser();
	});

	TRANSLATE_PIPE_NAMES.forEach((translatePipeName) => {
		describe(`with pipe name ${translatePipeName}`, () => {
			it('should only extract string using pipe', () => {
				const contents = `<button [style.background]="'lime'">{{ 'SomeKey_NotWorking' | ${translatePipeName} }}</button>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['SomeKey_NotWorking']);
			});

			it('should extract string using pipe, but between quotes only', () => {
				const contents = `<input class="form-control" type="text" placeholder="{{'user.settings.form.phone.placeholder' | ${translatePipeName}}}" [formControl]="settingsForm.controls['phone']">`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['user.settings.form.phone.placeholder']);
			});

			it('should extract interpolated strings using translate pipe', () => {
				const contents = `Hello {{ 'World' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract interpolated strings when translate pipe is used before other pipes', () => {
				const contents = `Hello {{ 'World' | ${translatePipeName} | upper }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract interpolated strings when translate pipe is used after other pipes', () => {
				const contents = `Hello {{ 'World'  | upper | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract strings from ternary operators inside interpolations', () => {
				const contents = `{{ (condition ? 'Hello' : 'World') | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from ternary operators right expression', () => {
				const contents = `{{ condition ? null : ('World' | ${translatePipeName}) }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract strings from ternary operators inside attribute bindings', () => {
				const contents = `<span [attr]="condition ? null : ('World' | ${translatePipeName})"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract strings from ternary operators left expression', () => {
				const contents = `{{ condition ? ('World' | ${translatePipeName}) : null }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['World']);
			});

			it('should extract strings inside string concatenation', () => {
				const contents = `{{ 'a' + ('Hello' | ${translatePipeName}) + 'b' + 'c' + ('World' | ${translatePipeName}) + 'd' }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from object map', () => {
				const contents = `{{ {
					choice1: 'Hello' | ${translatePipeName},
					choice2: 'World' | ${translatePipeName},
				}[choice] }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from object map inside attribute', () => {
				const contents = `
					<span [attr]="{
						choice1: 'Hello' | ${translatePipeName},
						choice2: 'World' | ${translatePipeName}
					}[choice]"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from KeyedRead.key', () => {
				const contents = `{{ {
					choice1: 'Foo',
					choice2: 'Bar',
				}[ 'choice' | ${translatePipeName} ] }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['choice']);
			});

			it('should extract strings from object', () => {
				const contents = `{{ { foo: 'Hello' | ${translatePipeName}, bar: ['World' | ${translatePipeName}], deep: { nested: { baz: 'Yes' | ${translatePipeName} } } } | json }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World', 'Yes']);
			});

			it('should extract strings from ternary operators inside attribute bindings', () => {
				const contents = `<span [attr]="(condition ? 'Hello' : 'World') | ${translatePipeName}"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from nested expressions', () => {
				const contents = `<span [attr]="{ foo: ['a' + ((condition ? 'Hello' : 'World') | ${translatePipeName}) + 'b'] }"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from nested ternary operators ', () => {
				const contents = `<h3>{{ (condition ? 'Hello' : anotherCondition ? 'Nested' : 'World' ) | ${translatePipeName} }}</h3>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'Nested', 'World']);
			});

			it('should extract strings from ternary operators inside attribute interpolations', () => {
				const contents = `<span attr="{{(condition ? 'Hello' : 'World') | ${translatePipeName}}}"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings with escaped quotes', () => {
				const contents = `Hello {{ 'World\\'s largest potato' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(["World's largest potato"]);
			});

			it('should extract strings with multiple escaped quotes', () => {
				const contents = `{{ 'C\\'est ok. C\\'est ok' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(["C'est ok. C'est ok"]);
			});

			it('should extract interpolated strings using translate pipe in attributes', () => {
				const contents = `<span attr="{{ 'Hello World' | ${translatePipeName} }}"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should extract bound strings using translate pipe in attributes', () => {
				const contents = `<span [attr]="'Hello World' | ${translatePipeName}"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should extract multiple entries from nodes', () => {
				const contents = `
					<ion-header>
						<ion-navbar color="brand">
							<ion-title>{{ 'Info' | ${translatePipeName} }}</ion-title>
						</ion-navbar>
					</ion-header>

					<ion-content>

						<content-loading *ngIf="isLoading">
							{{ 'Loading...' | ${translatePipeName} }}
						</content-loading>

					</ion-content>
				`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Info', 'Loading...']);
			});

			it('should extract strings on same line', () => {
				const contents = `<span [attr]="'Hello' | ${translatePipeName}"></span><span [attr]="'World' | ${translatePipeName}"></span>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from this template', () => {
				const contents = `
					<ion-list inset>
						<ion-item>
							<ion-icon item-left name="person" color="dark"></ion-icon>
							<ion-input formControlName="name" type="text" [placeholder]="'Name' | ${translatePipeName}"></ion-input>
						</ion-item>
						<ion-item>
							<p color="danger" danger *ngFor="let error of form.get('name').getError('remote')">
								{{ error }}
							</p>
						</ion-item>
					</ion-list>
					<div class="form-actions">
						<button ion-button (click)="onSubmit()" color="secondary" block>{{ 'Create account' | ${translatePipeName} }}</button>
					</div>
				`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Name', 'Create account']);
			});

			it('should not extract variables', () => {
				const contents = `<p>{{ message | ${translatePipeName} }}</p>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal([]);
			});

			it('should be able to extract without html', () => {
				const contents = `{{ 'message' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['message']);
			});

			it('should ignore calculated values', () => {
				const contents = `{{ 'SOURCES.' + source.name + '.NAME_PLURAL' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal([]);
			});

			it('should not extract pipe argument', () => {
				const contents = `{{ value | valueToTranslationKey: 'argument' | ${translatePipeName} }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal([]);
			});

			it('should extract strings from piped arguments inside a function calls on templates', () => {
				const contents = `{{ callMe('Hello' | ${translatePipeName}, 'World' | ${translatePipeName} ) }}`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should not break extraction in this special case with operators in template', () => {
				const contents = '<div [class.active]="+variable === -variable.item2">Active</div>';
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal([]);
			});

			it('should extract translate pipe used as pipe argument', () => {
				const contents = "{{ value | valueToTranslationKey: ('argument' | translate) }}";
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['argument']);
			});

			it('should extract nested uses of translate pipe', () => {
				const contents = "{{ 'Hello' | translate: {world: ('World' | translate)} }}";
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract strings from piped arguments inside a function calls on templates', () => {
				const contents = "{{ callMe('Hello' | translate, 'World' | translate ) }}";
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract from objects in property bindings', () => {
				const contents = "<hello [values] =\"{ hello: ('Hello' | translate), world: ('World' | translate) }\"></hello>";
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should extract from structural directives', () => {
				const contents = '<ng-container *ngIf="\'Hello\' | translate as hello">{{hello}}</ng-container>';
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello']);
			});

			it('should extract form inputs to structural directives', () => {
				const contents =
					"<ng-container *ngTemplateOutlet=\"template; context:{ hello: 'Hello' | translate, world: 'World' | translate }\"></ng-container>";
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});
		});
	});

	it('should extract from objects in property bindings', () => {
		const contents = `
		<hello [values]="{
			hello: ('Hello' | translate),
			world: ('World' | translate) }"></hello>`;
		const keys = parser.extract(contents, templateFilename).keys();
		expect(keys).to.deep.equal([`Hello`, `World`]);
	});

	it('should extract from structural directives', () => {
		const contents = `
		<ng-container *ngIf="'Hello' | translate as hello">{{hello}}</ng-container>
		`;
		const keys = parser.extract(contents, templateFilename).keys();
		expect(keys).to.deep.equal([`Hello`]);
	});

	it('should extract form inputs to structural directives', () => {
		const contents = `
		<ng-container *ngTemplateOutlet="template ; context:{
			hello: 'Hello' | translate,
			world: 'World' | translate,
		}"></ng-container>`;
		const keys = parser.extract(contents, templateFilename).keys();
		expect(keys).to.deep.equal([`Hello`, `World`]);
	});

	it('should extract key from translate pipe inside `AND` expressions', () => {
		const singleCondition = `<div>{{ someProp() && 'translation.key' | translate }}</div>`;
		const singleConditionKeys = parser.extract(singleCondition, templateFilename).keys();
		expect(singleConditionKeys).to.deep.equal(['translation.key']);

		const multipleConditions = `<div>{{ someProp() && anotherProp() && 'translation.key' | translate }}</div>`;
		const multipleConditionKeys = parser.extract(multipleConditions, templateFilename).keys();
		expect(multipleConditionKeys).to.deep.equal(['translation.key']);
	});

	it('should extract key from translate pipe inside `OR` expressions', () => {
		const singleCondition = `<div>{{ someProp() || 'translation.key' | translate }}</div>`;
		const singleConditionKeys = parser.extract(singleCondition, templateFilename).keys();
		expect(singleConditionKeys).to.deep.equal(['translation.key']);

		const multipleConditions = `<div>{{ someProp() || anotherProp() || 'translation.key' | translate }}</div>`;
		const multipleConditionKeys = parser.extract(multipleConditions, templateFilename).keys();
		expect(multipleConditionKeys).to.deep.equal(['translation.key']);
	});

	it('should extract key from translate pipe inside nullish coalescing expressions', () => {
		const singleCondition = `<div>{{ someProp() ?? 'translation.key' | translate }}</div>`;
		const singleConditionKeys = parser.extract(singleCondition, templateFilename).keys();
		expect(singleConditionKeys).to.deep.equal(['translation.key']);

		const multipleConditions = `<div>{{ someProp() ?? anotherProp() ?? 'translation.key' | translate }}</div>`;
		const multipleConditionKeys = parser.extract(multipleConditions, templateFilename).keys();
		expect(multipleConditionKeys).to.deep.equal(['translation.key']);
	});

	describe('Built-in control flow', () => {
		it('should extract keys from elements inside an @if/@else block', () => {
			const contents = `
				@if (loggedIn) {
					{{ 'if.block' | translate }}
				} @else if (condition) {
					{{ 'elseif.block' | translate }}
				} @else {
					{{ 'else.block' | translate }}
				}
			`;

			const keys = parser.extract(contents, templateFilename)?.keys();
			expect(keys).to.deep.equal(['if.block', 'elseif.block', 'else.block']);
		});

		it('should extract keys from elements inside a @for/@empty block', () => {
			const contents = `
				@for (user of users; track user.id) {
					{{ 'for.block' | translate }}
				} @empty {
					{{ 'for.empty.block' | translate }}
				}
			`;

			const keys = parser.extract(contents, templateFilename).keys();
			expect(keys).to.deep.equal(['for.block', 'for.empty.block']);
		});

		it('should extract keys from elements inside an @switch/@case block', () => {
			const contents = `
			@switch (condition) {
				@case (caseA) {
				  {{ 'switch.caseA' | translate }}
				}
				@case (caseB) {
				  {{ 'switch.caseB' | translate }}
				}
				@default {
				  {{ 'switch.default' | translate }}
				}
			  }`;

			const keys = parser.extract(contents, templateFilename).keys();
			expect(keys).to.deep.equal(['switch.caseA', 'switch.caseB', 'switch.default']);
		});

		it('should extract keys from elements inside an @deferred/@error/@loading/@placeholder block', () => {
			const contents = `
				@defer (on viewport) {
					{{ 'defer' | translate }}
				} @loading {
					{{ 'defer.loading' | translate }}
				} @error {
					{{ 'defer.error' | translate }}
				} @placeholder {
					{{ 'defer.placeholder' | translate }}
				}`;

			const keys = parser.extract(contents, templateFilename).keys();
			expect(keys).to.deep.equal(['defer', 'defer.error', 'defer.loading', 'defer.placeholder']);
		});

		it('should extract keys from nested blocks', () => {
			const contents = `
				@if (loggedIn) {
					{{ 'if.block' | translate }}
					@if (nestedCondition) {
						@if (nestedCondition) {
							{{ 'nested.if.block' | translate }}
						}  @else {
							{{ 'nested.else.block' | translate }}
						}
					} @else if (nestedElseIfCondition) {
						{{ 'nested.elseif.block' | translate }}
					}
				} @else if (condition) {
					{{ 'elseif.block' | translate }}
				} @else {
					{{ 'else.block' | translate }}
				}
			`;

			const keys = parser.extract(contents, templateFilename)?.keys();
			expect(keys).to.deep.equal([
				'if.block',
				'nested.if.block',
				'nested.else.block',
				'nested.elseif.block',
				'elseif.block',
				'else.block'
			]);
		});

		it('should handle ast with arbitrary depth without hitting the call stack limit', () => {
			const depth = 500;
			const contents = `
				${Array(depth).fill('<i>').join('')}
					{{ 'deep' | translate }}
				${Array(depth).fill('</i>').join('')}
			`;

			const keys = parser.extract(contents, templateFilename)?.keys();
			expect(contents).to.contain('<i><i><i><i><i><i>');
			expect(keys).to.deep.equal(['deep']);
		});
	});
});
