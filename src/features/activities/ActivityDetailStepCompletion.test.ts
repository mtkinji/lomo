import { readFileSync } from 'fs';
import path from 'path';

describe('Activity detail step completion treatment', () => {
  it('matches Grocery checks and strikes completed step titles', () => {
    const component = readFileSync(
      path.join(__dirname, 'ActivityDetailRefresh.tsx'),
      'utf8',
    );
    const styleSource = readFileSync(
      path.join(__dirname, 'activityDetailStyles.ts'),
      'utf8',
    );

    expect(component).toContain('accessibilityRole="checkbox"');
    expect(component).toContain('accessibilityState={{ checked: isChecked }}');
    expect(component).toContain('isChecked ? styles.stepCheckboxCompleted : null');
    expect(component).toContain('isChecked ? styles.stepTextCompleted : null');

    expect(styleSource).toMatch(
      /stepCheckbox: \{[\s\S]*?width: 22,[\s\S]*?height: 22,[\s\S]*?borderRadius: 7,[\s\S]*?borderWidth: 1,/,
    );
    expect(styleSource).toMatch(
      /stepCheckboxCompleted: \{[\s\S]*?borderColor: colors\.primary,[\s\S]*?backgroundColor: colors\.primary,/,
    );
    expect(styleSource).toMatch(
      /stepTextCompleted: \{[\s\S]*?color: colors\.textSecondary,[\s\S]*?textDecorationLine: 'line-through',/,
    );
  });
});
