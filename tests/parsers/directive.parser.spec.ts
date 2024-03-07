import { describe, beforeEach, expect, it } from 'vitest';

import { DirectiveParser, TRANSLATE_ATTR_NAMES } from '../../src/parsers/directive.parser.js';

describe('DirectiveParser', () => {
	const templateFilename: string = 'test.template.html';
	const componentFilename: string = 'test.component.ts';

	let parser: DirectiveParser;

	beforeEach(() => {
		parser = new DirectiveParser();
	});

	TRANSLATE_ATTR_NAMES.forEach((translateAttrName) => {
		describe(`with attribute name '${translateAttrName}'`, () => {
			it('should extract keys when using literal map in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="{ key1: 'value1' | ${translateAttrName}, key2: 'value2' | ${translateAttrName} }"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['value1', 'value2']);
			});

			it('should extract keys when using literal arrays in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="[ 'value1' | ${translateAttrName}, 'value2' | ${translateAttrName} ]"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['value1', 'value2']);
			});

			it('should extract keys when using binding pipe in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="'KEY1' | withPipe"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY1']);
			});

			it('should extract keys when using binary expression in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="keyVar || 'KEY1'"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY1']);
			});

			it('should extract keys when using literal primitive in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="'KEY1'"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY1']);
			});

			it('should extract keys when using conditional in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="condition ? 'KEY1' : 'KEY2'"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY1', 'KEY2']);
			});

			it('should extract keys when using nested conditionals in bound attribute', () => {
				const contents = `<div [${translateAttrName}]="isSunny ? (isWarm ? 'Sunny and warm' : 'Sunny but cold') : 'Not sunny'"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Sunny and warm', 'Sunny but cold', 'Not sunny']);
			});

			it('should extract keys when using interpolation', () => {
				const contents = `<div ${translateAttrName}="{{ 'KEY1' + key2 + 'KEY3' }}"></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY1', 'KEY3']);
			});

			it('should extract keys keeping proper whitespace', () => {
				const contents = `
					<div ${translateAttrName}>
						Wubba
						Lubba
						Dub Dub
					</div>
				`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Wubba Lubba Dub Dub']);
			});

			it('should use element contents as key when no translate attribute value is present', () => {
				const contents = `<div ${translateAttrName}>Hello World</div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should use translate attribute value as key when present', () => {
				const contents = `<div ${translateAttrName}="MY_KEY">Hello World<div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['MY_KEY']);
			});

			it('should extract keys from child elements when translate attribute is present', () => {
				const contents = `<div ${translateAttrName}>Hello <strong ${translateAttrName}>World</strong></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello', 'World']);
			});

			it('should not extract keys from child elements when translate attribute is not present', () => {
				const contents = `<div ${translateAttrName}>Hello <strong>World</strong></div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello']);
			});

			it('should extract and parse inline template', () => {
				const contents = `
					@Component({
						selector: 'test',
						template: '<p ${translateAttrName}>Hello World</p>'
					})
					export class TestComponent { }
				`;
				const keys = parser.extract(contents, componentFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should extract contents when no translate attribute value is provided', () => {
				const contents = `<div ${translateAttrName}>Hello World</div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should extract translate attribute value if provided', () => {
				const contents = `<div ${translateAttrName}="KEY">Hello World<div>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['KEY']);
			});

			it('should not extract translate pipe in html tag', () => {
				const contents = `<p>{{ 'Audiobooks for personal development' | ${translateAttrName} }}</p>`;
				const collection = parser.extract(contents, templateFilename);
				expect(collection.values).to.deep.equal({});
			});

			it('should extract contents from custom elements', () => {
				const contents = `<custom-table><tbody><tr><td ${translateAttrName}>Hello World</td></tr></tbody></custom-table>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['Hello World']);
			});

			it('should extract from template without leading/trailing whitespace', () => {
				const contents = `
					<div *ngIf="!isLoading && studentsToGrid && studentsToGrid.length == 0" class="no-students" mt-rtl ${translateAttrName}>There
						are currently no students in this class. The good news is, adding students is really easy! Just use the options
						at the top.
					</div>
				`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal([
					'There are currently no students in this class. The good news is, adding students is really easy! Just use the options at the top.'
				]);
			});

			it('should extract keys from element without leading/trailing whitespace', () => {
				const contents = `
					<div ${translateAttrName}>
						this is an example
						of a long label
					</div>

					<div>
						<p ${translateAttrName}>
							this is an example
							of another a long label
						</p>
					</div>
				`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['this is an example of a long label', 'this is an example of another a long label']);
			});

			it('should collapse excessive whitespace', () => {
				const contents = `<p ${translateAttrName}>this      is an example</p>`;
				const keys = parser.extract(contents, templateFilename).keys();
				expect(keys).to.deep.equal(['this is an example']);
			});

			describe('Built-in control flow', () => {
				it('should extract keys from elements inside an @if/@else block', () => {
					const contents = `
						@if (loggedIn) {
							<p ${translateAttrName}>if.block</p>
						} @else if (condition) {
							<p ${translateAttrName}>elseif.block</p>
						} @else {
							<p ${translateAttrName}>else.block</p>
						}
					`;

					const keys = parser.extract(contents, templateFilename)?.keys();
					expect(keys).to.deep.equal(['if.block', 'elseif.block', 'else.block']);
				});

				it('should extract keys from elements inside a @for/@empty block', () => {
					const contents = `
						@for (user of users; track user.id) {
							<p ${translateAttrName}>for.block</p>
						} @empty {
							<p ${translateAttrName}>for.empty.block</p>
						}
					`;

					const keys = parser.extract(contents, templateFilename).keys();
					expect(keys).to.deep.equal(['for.block', 'for.empty.block']);
				});

				it('should extract keys from elements inside an @switch/@case block', () => {
					const contents = `
						@switch (condition) {
							@case (caseA) {
								<p ${translateAttrName}>switch.caseA</p>
							}
							@case (caseB) {
								<p ${translateAttrName}>switch.caseB</p>
							}
							@default {
								<p ${translateAttrName}>switch.default</p>
							}
						}
					`;

					const keys = parser.extract(contents, templateFilename).keys();
					expect(keys).to.deep.equal(['switch.caseA', 'switch.caseB', 'switch.default']);
				});

				it('should extract keys from elements inside an @deferred/@error/@loading/@placeholder block', () => {
					const contents = `
						@defer (on viewport) {
							<p ${translateAttrName}>defer</p>
						} @loading {
							<p ${translateAttrName}>defer.loading</p>
						} @error {
							<p ${translateAttrName}>defer.error</p>
						} @placeholder {
							<p ${translateAttrName}>defer.placeholder</p>
						}
					`;

					const keys = parser.extract(contents, templateFilename).keys();
					expect(keys).to.deep.equal(['defer', 'defer.placeholder', 'defer.loading', 'defer.error']);
				});

				it('should extract keys from nested blocks', () => {
					const contents = `
						@if (loggedIn) {
							<p ${translateAttrName}>if.block</p>
							@if (nestedCondition) {
								@if (nestedCondition) {
									<p ${translateAttrName}>nested.if.block</p>
								}  @else {
									<p ${translateAttrName}>nested.else.block</p>
								}
							} @else if (nestedElseIfCondition) {
								<p ${translateAttrName}>nested.elseif.block</p>
							}
						} @else if (condition) {
							<p ${translateAttrName}>elseif.block</p>
						} @else {
							<p ${translateAttrName}>else.block</p>
						}
					`;

					const keys = parser.extract(contents, templateFilename)?.keys();
					expect(keys).to.deep.equal([
						'if.block',
						'elseif.block',
						'else.block',
						'nested.elseif.block',
						'nested.if.block',
						'nested.else.block'
					]);
				});
			});
		});
	});
});
