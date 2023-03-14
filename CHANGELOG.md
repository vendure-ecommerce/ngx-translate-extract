# Changelog


## v8.0.6 (2023-03-TODO)

- Accommodate marker pipe and directive
- Enable support for other marker packages apart from the original from [Kim Biesbjerg](https://github.com/biesbjerg/ngx-translate-extract-marker)
- Merged [P4's](https://github.com/P4) PRs ([#1](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/1), [#2](https://github.com/vendure-ecommerce/ngx-translate-extract/pull/2)) in order to improve the pipe parser when it comes to pipe args and structural directives
- Fixed some botched imports
- Re-added --marker/-m option to CLI thanks to [tmijieux's](https://github.com/tmijieux) [PR](https://github.com/colsen1991/ngx-translate-extract/pull/1)
- Moved to eslint and fixed errors/warnings
- Other minor clerical changes and small refactoring

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
