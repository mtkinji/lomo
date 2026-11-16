import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// A generous process deadline catches the quadratic reference-parser regression
// without leaving the test runner blocked. This exceeds the chat display cap to
// exercise the installed parser itself, including future callers.
for (const shape of ['title', 'label']) {
  test(`unclosed multiline Markdown ${shape} cannot monopolize the parser`, () => {
    const result = spawnSync(process.execPath, ['-e', `
      const { createRequire } = require('node:module');
      const fromDisplay = createRequire(require.resolve('react-native-markdown-display/package.json'));
      const Markdown = fromDisplay('markdown-it');
      const parser = new Markdown({ html: false, typographer: false });
      const input = (${JSON.stringify(shape)} === 'title' ? '[reference]: /path "' : '[')
        + 'word\\n'.repeat(200_000);
      const output = parser.render(input);
      if (!output.includes('word')) process.exit(2);
    `], { encoding: 'utf8', timeout: 5_000 });
    assert.equal(result.error, undefined, `Parser exceeded deadline: ${result.error?.code}`);
    assert.equal(result.status, 0, result.stderr);
  });
}
