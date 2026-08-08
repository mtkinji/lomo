import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'ActivitiesScreen.tsx'), 'utf8');

describe('Activities view settings management actions', () => {
  it('keeps duplicate and delete available from the quiet More menu', () => {
    expect(source).toContain('const handleDuplicateCurrentView = React.useCallback');
    expect(source).toContain('label="Duplicate view"');
    expect(source).toContain('onPress={handleDuplicateCurrentView}');
    expect(source).toContain('label="Delete view"');
    expect(source).toContain('onPress={handleDeleteCurrentView}');
  });

  it('restores dialog focus to accessible menu triggers rather than hidden child buttons', () => {
    const triggers = source.match(/<DropdownMenuTrigger[\s\S]*?<\/DropdownMenuTrigger>/g) ?? [];
    expect(triggers.filter((trigger) => trigger.match(/<DropdownMenuTrigger[^>]*ref=\{viewsTriggerRef\}/s))).toHaveLength(2);
    expect(triggers.some((trigger) => trigger.match(/<DropdownMenuTrigger[^>]*ref=\{viewActionsTriggerRef\}/s))).toBe(true);
    expect(triggers.some((trigger) => trigger.match(/<Button[^>]*ref=\{(?:viewsTriggerRef|viewActionsTriggerRef)\}/s))).toBe(false);
  });
});
