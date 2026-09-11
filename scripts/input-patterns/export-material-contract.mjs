#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'packages/kwilt-tokens/generated/input-material-contract.json');
export async function buildInputMaterialContract() {
  const names = ['colors', 'radii', 'spacing', 'typography'];
  const source = names.map(name => fs.readFileSync(path.join(root, `packages/kwilt-tokens/src/${name}.ts`), 'utf8'));
  const modules = await Promise.all(source.map(async text => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`)));
  const [{colors}, {radii}, {spacing}, {typography}] = modules;
  return {
    schemaVersion: 1,
    source: {package: '@kwilt/tokens', revision: `sha256:${createHash('sha256').update(source.join('\n')).digest('hex')}`},
    units: 'Native points map to CSS pixels; host font scaling remains platform-owned.',
    css: {
      '--kw-input-fill': colors.inputFill,
      '--kw-input-fill-pressed': colors.inputFillPressed,
      '--kw-input-fill-on-muted': colors.inputFillOnMuted,
      '--kw-input-focus': colors.accent,
      '--kw-input-error': colors.destructive,
      '--kw-input-outline': colors.muted,
      '--kw-input-radius': `${radii.input}px`,
      '--kw-input-composer-radius': `${radii.composer}px`,
      '--kw-input-font-size': `${typography.body.fontSize}px`,
      '--kw-input-line-height': `${typography.body.lineHeight}px`,
      '--kw-input-compact-font-size': `${typography.bodySm.fontSize}px`,
      '--kw-input-padding-inline': `${spacing.md}px`,
      '--kw-input-padding-block': `${spacing.sm}px`,
      '--kw-input-composer-inset': `${spacing.lg}px`,
    },
  };
}
export function assertMaterialContractCurrent(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Input material export is stale; regenerate it and reconcile the workbench copy.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const contract = await buildInputMaterialContract();
    if (process.argv[2] === '--write') { fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, `${JSON.stringify(contract, null, 2)}\n`); }
    else if (process.argv[2] === '--check') { assertMaterialContractCurrent(JSON.parse(fs.readFileSync(target, 'utf8')), contract); console.log('Input material export matches native token sources.'); }
    else throw new Error('Use --write to generate the material contract or --check to validate it.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
