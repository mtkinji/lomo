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

  test('uses a solid session-color surface with one unlabeled countdown', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'plugins/withAppleEcosystemIntegrations.js'),
      'utf8',
    );

    expect(source).toContain('.activityBackgroundTint(KwiltFocusPalette.forKey(context.state.colorKey).background)');
    expect(source).toContain('ProgressView(timerInterval: startedAt...end, countsDown: true)');
    expect(source).toContain('.labelsHidden()');
    expect(source).toContain('.clipShape(Capsule())');
    expect(source).toContain('if let logo = kwiltLogoImage()');
    expect(source).not.toContain('Text("Remaining")');
    expect(source).not.toContain('Text(isPaused ? "Focus paused" : "Focus")');
    expect(source).not.toContain('Circle()\n            .fill(KwiltPalette.pineSoft)');
    expect(source).not.toContain('proxy.size.width * 0.24');
  });
});
