import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareSummaries,
  summarizeFiles,
} from './code-health-lib.mjs';

test('summarizeFiles counts large files and softness indicators', () => {
  const current = summarizeFiles([
    {
      file: 'src/features/demo/BigScreen.tsx',
      text: [
        "import { Text } from 'react-native';",
        'const value = thing as ' + 'any;',
        'console.log(value);',
        ...Array.from({ length: 801 }, (_, index) => `const line${index} = ${index};`),
      ].join('\n'),
    },
    {
      file: 'node_modules/pkg/index.ts',
      text: 'const ignored = true;',
    },
  ]);

  assert.equal(current.totals.files, 1);
  assert.equal(current.totals.largeFiles, 1);
  assert.equal(current.totals.asAny, 1);
  assert.equal(current.totals.consoleLog, 1);
  assert.equal(current.totals.rawReactNativeTextFeatureFiles, 1);
});

test('compareSummaries fails new high-risk regressions and warns on loose typing', () => {
  const base = summarizeFiles([
    {
      file: 'src/features/demo/Screen.tsx',
      text: "import { View } from 'react-native';\nconst value = 1;\n",
    },
    {
      file: 'src/features/demo/Large.tsx',
      text: Array.from({ length: 1500 }, (_, index) => `const base${index} = ${index};`).join('\n'),
    },
  ]);
  const current = summarizeFiles([
    {
      file: 'src/features/demo/Screen.tsx',
      text: [
        "import { Text } from 'react-native';",
        'const value = 1 as ' + 'any;',
        'console.log(value);',
        '// @ts-' + 'ignore',
      ].join('\n'),
    },
    {
      file: 'src/features/demo/Large.tsx',
      text: Array.from({ length: 1602 }, (_, index) => `const next${index} = ${index};`).join('\n'),
    },
    {
      file: 'src/features/demo/NewLarge.tsx',
      text: Array.from({ length: 800 }, (_, index) => `const line${index} = ${index};`).join('\n'),
    },
  ]);

  const findings = compareSummaries(current.rows, base.rows);
  const byCode = new Map(findings.map((finding) => [finding.code, finding]));

  assert.equal(byCode.get('new-raw-react-native-text')?.severity, 'error');
  assert.equal(byCode.get('new-console-log')?.severity, 'error');
  assert.equal(byCode.get('new-ts-ignore')?.severity, 'error');
  assert.equal(byCode.get('large-file-growth')?.severity, 'error');
  assert.equal(byCode.get('new-large-file')?.severity, 'error');
  assert.equal(byCode.get('new-as-any')?.severity, 'warning');
});
