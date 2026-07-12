import fs from 'node:fs';
import path from 'node:path';

describe('Focus Live Activity timer source', () => {
  test('the config plugin clamps the running countdown at zero', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'plugins/withAppleEcosystemIntegrations.js'),
      'utf8',
    );

    expect(source.match(/Text\(timerInterval: startedAt\.\.\.end, countsDown: true\)/g)).toHaveLength(2);
    expect(source).not.toContain('Text(end, style: .timer)');
  });

  test('uses a calm Kwilt timer capsule and native session progress', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'plugins/withAppleEcosystemIntegrations.js'),
      'utf8',
    );

    expect(source).toContain('Text("Remaining")');
    expect(source).toContain('ProgressView(timerInterval: startedAt...end, countsDown: true)');
    expect(source).toContain('.clipShape(Capsule())');
    expect(source).not.toContain('proxy.size.width * 0.24');
  });
});
