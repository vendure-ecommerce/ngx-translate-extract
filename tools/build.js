#! /usr/bin/env node

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { stdout } from 'node:process';

import JSON5 from 'json5';

const PROJECT_NAME = 'ngx-translate-extract';
const SEPARATOR = '-'.repeat(80);
const CARRIAGE_CHAR = stdout.isTTY ? '\r' : '\n';

console.log(`\nBuilding ${PROJECT_NAME}`);
console.log(SEPARATOR);

// Read tsconfig.json
const tsconfigRaw = readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf-8');
const tsconfig = JSON5.parse(tsconfigRaw);

// Get outDir from tsconfig.json
const outDir = tsconfig?.compilerOptions?.outDir ?? null;
const resolvedOutDir = resolve(process.cwd(), outDir);

// Empty dist
stdout.write(`⏳ Emptying '${outDir}' directory`);
rmSync(resolvedOutDir, { recursive: true, force: true });
mkdirSync(resolvedOutDir, { recursive: true });
stdout.write(`${CARRIAGE_CHAR}✔  Emptying '${outDir}' directory\n`);

// Copy assets
const filesToCopy = ['LICENSE', 'README.md'];
filesToCopy.forEach(fileName => {
  console.log(`ℹ  Copying ${fileName}`);
  copyFileSync(fileName, join(resolvedOutDir, fileName));
});

// Copy and clean package.json
const pkgPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const keysToRemove = ['devDependencies', 'scripts'];
keysToRemove.forEach(key => {
  console.log(`ℹ  Removing ${key} from package.json`);
  delete packageJson[key];
});
writeFileSync(join(resolvedOutDir, 'package.json'), JSON.stringify(packageJson, null, 2));
console.log(`✔  Copied assets to '${outDir}' directory`);

// Build
stdout.write(`⏳ Building project`);
execSync(`tsc --project tsconfig.json`, { stdio: 'inherit' });
stdout.write(`${CARRIAGE_CHAR}✔  Building project\n`);
console.log(SEPARATOR);
