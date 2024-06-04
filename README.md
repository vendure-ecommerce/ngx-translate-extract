# ngx-translate-extract

> Angular translations extractor (plugin for [@ngx-translate](https://github.com/ngx-translate/core))

> ✓ _Angular 14+, Ivy and Angular Universal (SSR) compatible_

Extract translatable (ngx-translate) strings and save as a JSON or Gettext pot file.
Merges with existing strings if the output file already exists.

## History

This project was originally created by [Kim Biesbjerg](https://github.com/biesbjerg/ngx-translate-extract).
Unfortunately he was unable to continue to maintain it so the Vendure team [agreed to take over maintenance](https://github.com/biesbjerg/ngx-translate-extract/issues/246#issuecomment-1211682548) of this fork.

## Install

Install the package in your project:

```bash
npm install @vendure/ngx-translate-extract --save-dev
# or
yarn add @vendure/ngx-translate-extract --dev
```

Choose the version corresponding to your Angular version:

| Angular    | ngx-translate-extract                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| >=17       | 9.x                                                                                        |
| 13 – 16    | 8.x                                                                                        |
| 8  – 12    | [@biesbjerg/ngx-translate-extract](https://github.com/biesbjerg/ngx-translate-extract) 7.x |

Add a script to your project's `package.json`:

```json
"scripts": {
  "i18n:init": "ngx-translate-extract --input ./src --output ./src/assets/i18n/template.json --key-as-default-value --replace --format json",
  "i18n:extract": "ngx-translate-extract --input ./src --output ./src/assets/i18n/{en,da,de,fi,nb,nl,sv}.json --clean --format json"
}
```

You can now run `npm run i18n:extract` and it will extract strings from your project.

## Usage

**Extract from dir and save to file**

```bash
ngx-translate-extract --input ./src --output ./src/assets/i18n/strings.json
```

**Extract from multiple dirs**

```bash
ngx-translate-extract --input ./src-a ./src-b --output ./src/assets/i18n/strings.json
```

**Extract and save to multiple files using path expansion**

```bash
ngx-translate-extract --input ./src --output ./src/i18n/{da,en}.json
```

**Strip prefix from the generated json keys**

Useful when loading multiple translation files in the same application and prefixing them automatically

```bash
ngx-translate-extract --input ./src --output ./src/i18n/{da,en}.json --strip-prefix 'PREFIX.'
```

**Cache for consecutive runs**

If your project grows rather large, runs can take seconds. With this cache, unchanged files don't need
to be parsed again, keeping consecutive runs under .5 seconds.

```bash
ngx-translate-extract --cache-file node_modules/.i18n-cache/my-cache-file --input ./src --output ./src/i18n/{da,en}.json
```

### JSON indentation

Tabs are used by default for indentation when saving extracted strings in json formats:

If you want to use spaces instead, you can do the following:

```bash
ngx-translate-extract --input ./src --output ./src/i18n/en.json --format-indentation ' '
```

### Sorting

Extracted keys are by default not sorted. You can enable sorting by using the `--sort` or `-s` flag.

If sorting is enabled, the keys will be sorted using the default variant sort sensitivity. Other sort sensitivity options are also available using the `--sort-sensitivity` or `-ss` flag:
- `base`: Strings that differ in base letters are unequal. For example `a !== b`, `a === á`, `a === A`
- `accent`: Strings that differ in base letters and accents are unequal. For example `a !== b`, `a !== á`, `a === A`
- `case`: Strings that differ in base letters or casing are unequal. For example `a !== b`, `a === á`, `a !== A`
- `variant`: Strings that differ in base letters, accents, or casing are unequal. For example `a !== b`, `a !== á`, `a !== A`

### Marker function

If you want to extract strings that are not passed directly to `NgxTranslate.TranslateService`'s
`get()`/`instant()`/`stream()` methods, or its `translate` pipe or directive, you can wrap them
in a marker function/pipe/directive to let `ngx-translate-extract` know you want to extract them.

```bash
npm install @colsen1991/ngx-translate-extract-marker
```

See [@colsen1991/ngx-translate-extract-marker](https://github.com/colsen1991/ngx-translate-extract-marker/blob/master/README.md) documentation for more information.

### Commandline arguments

```bash
Usage:
ngx-translate-extract [options]

Output
  --format, -f                Format        [string] [choices: "json", "namespaced-json", "pot"] [default: "json"]
  --format-indentation, --fi  Format indentation (JSON/Namedspaced JSON)                  [string] [default: "\t"]
  --sort, -s                  Sort strings in alphabetical order                                         [boolean]
  --sort-sensitivity, -ss     Sensitivity when sorting strings (only when sort is enabled)				 [string]
  --clean, -c                 Remove obsolete strings after merge                                        [boolean]
  --replace, -r               Replace the contents of output file if it exists (Merges by default)       [boolean]
  --strip-prefix, -sp         Strip prefix from key                                                       [string]

Extracted key value (defaults to empty string)
  --key-as-default-value, -k           Use key as default value                                          [boolean]
  --key-as-initial-default-value, -ki  Use key as initial default value                                  [boolean]
  --null-as-default-value, -n          Use null as default value                                         [boolean]
  --string-as-default-value, -d        Use string as default value                                        [string]

Options:
  --version, -v  Show version number                                                                     [boolean]
  --help, -h     Show help                                                                               [boolean]
  --input, -i    Paths you would like to extract strings from. You can use path expansion, glob patterns and
                 multiple paths                                               [array] [required] [default: ["./"]]
  --output, -o   Paths where you would like to save extracted strings. You can use path expansion, glob
                 patterns and multiple paths                                                    [array] [required]
  --cache-file   Cache parse results to speed up consecutive runs                                         [string]
  --marker, -m   Custom marker function name                                                              [string]

Examples:
  ngx-translate-extract -i ./src-a/ -i ./src-b/ -o strings.json             Extract (ts, html) from multiple paths
  ngx-translate-extract -i './{src-a,src-b}/' -o strings.json               Extract (ts, html) from multiple paths using brace expansion
  ngx-translate-extract -i ./src/ -o ./i18n/da.json -o ./i18n/en.json       Extract (ts, html) and save to da.json and en.json
  ngx-translate-extract -i ./src/ -o './i18n/{en,da}.json'                  Extract (ts, html) and save to da.json and en.json using brace expansion
  ngx-translate-extract -i './src/**/*.{ts,tsx,html}' -o strings.json       Extract from ts, tsx and html
  ngx-translate-extract -i './src/**/!(*.spec).{ts,html}' -o strings.json   Extract from ts, html, excluding files with ".spec"
  ngx-translate-extract -i './src/' -o strings.json -sp 'PREFIX.'           Strip the prefix "PREFIX." from the json keys
```

## Note for GetText users

Please pay attention of which version of `gettext-parser` you actually use in your project.
For instance, `gettext-parser:1.2.2` does not support HTML tags in translation keys.

## Credits

-   Original library, idea and code: [Kim Biesbjerg](https://github.com/biesbjerg/ngx-translate-extract) ❤️
-   Further updates and improvements by [bartholomej](https://github.com/bartholomej) ❤️
-   Further updates and improvements by [P4](https://github.com/P4) ❤️
-   Further updates and improvements by [colsen1991](https://github.com/colsen1991) ❤️
-   Further updates and improvements by [tmijieux](https://github.com/tmijieux) ❤️
