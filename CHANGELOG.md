# Changelog

## v9.1.1 (2024-03-08)

- Fix TranslateService not resolved when injected with readonly keyword ([#39](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/39))

## v9.1.0 (2024-02-05)

- Add support for caching via the new `--cache-file` option ([#38](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/38))

## v9.0.3 (2023-11-28)

- Fix `RangeError: Maximum call stack size exceeded` on nested templates ([#34](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/34))
- Fix alphabetical order of extracted keys ([#35](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/35))

## v9.0.2 (2023-11-24)

- Fix import from glob packages ([#31](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/31))
- Fix extract for Windows file paths ([#32](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/32))

## v9.0.1 (2023-11-23)

- Update dependencies & removed unused dependencies ([#29](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/29))
- fix: Fix syntax error when parsing tsconfig file ([#30](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/30)) Fixes [#24](https://github.com/vendure-ecommerce/ngx-translate-extract/issues/24)

## v9.0.0 (2023-11-21)

- feat: Add support for new Angular v17 control flow syntax ([#27](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/27))

**BREAKING CHANGES**

- minimum angular version required bumped to 17
- minimum node version required bumped to v18.13.0 to be aligned with the Angular 17 requirements
- minimum TypeScript version required bumped to v5.2 to be aligned with the Angular 17 requirements

## v8.3.0 (2023-11-21)
- Add support for the `--strip-prefix` option ([#23](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/23))

## v8.2.3 (2023-09-27)
- Enable extraction from subclasses without declaration ([#21](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/21))
- Fix chained function calls ([#21](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/21))
- Add tests ([#21](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/21))
- Extract translations when service injected using `inject()` function  ([#22](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/22))

## v8.2.2 (2023-08-10)
- Fix extraction error with --null-as-default-value ([#18](https://github.com/vendure-ecommerce/ngx-translate-extract/issues/18))

## v8.2.1 (2023-07-21)
- Fix extraction error introduced in the last version ([#14](https://github.com/vendure-ecommerce/ngx-translate-extract/issues/14))
- Add `braces` to dependencies ([#9](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/9))

## v8.2.0 (2023-07-03)
- Add source locations in PO compiler output ([#13](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/13))

## v8.1.1 (2023-05-11)

- Update tsquery dependency to allow usage with TypeScript v5 ([#10](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/10))

## v8.1.0 (2023-03-15)

- Accommodate marker pipe and directive
- Enable support for other marker packages apart from the original from [Kim Biesbjerg](https://github.com/biesbjerg/ngx-translate-extract-marker)
- Merged [P4's](https://github.com/P4) PRs ([#1](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/1), [#2](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/2)) in order to improve the pipe parser when it comes to pipe args and structural directives
- Fixed some botched imports
- Re-added --marker/-m option to CLI thanks to [tmijieux's](https://github.com/tmijieux) [PR](https://github.com/colsen1991/ngx-translate-extract/pull/1)
- Moved to eslint and fixed errors/warnings
- Other minor clerical changes and small refactoring
- Remove dependency on a specific version of the Angular compiler. Instead, we rely on the peer dependency. [#3](https://github.com/vendure-ecommerce/ngx-translate-extract/issues/3)

## v8.0.5 (2023-03-02)

- fix(pipe-parser): Search for pipe in structural directives [#1](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/1)

  This fix will now detect the pipe in code like this:

  ```
  <ng-container *ngTemplateOutlet="section; context: {
    title: 'example.translation.key' | translate
  }"></ng-container>
  ```

- fix: Find uses of translate pipe in pipe arguments [#2](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/2)

  Fixes the following:


  ```angular2html
  {{ 'value' | testPipe: ('test1' | translate) }} // finds nothing, misses 'test1'
  {{ 'Hello' | translate: {world: ('World' | translate)} }} // finds 'Hello', misses 'World'
  {{ 'previewHeader' | translate:{filename: filename || ('video' | translate)} }} // finds 'previewHeader', misses 'video'
  ```

## v8.0.3 (2022-12-15)

- First package published under the @vendure namespace
- Update references in README

## v8 - v8.0.2

- Support for Angular 13 + 14 added by https://github.com/bartholomej

## Prior to v8

See the [releases in the original repo](https://github.com/biesbjerg/ngx-translate-extract/releases).
