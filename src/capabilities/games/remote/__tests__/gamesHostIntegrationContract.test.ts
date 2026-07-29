import fs from 'node:fs';
import path from 'node:path';

const workspacePath = (...parts: string[]) => path.join(process.cwd(), ...parts);

describe('Games host integration contract', () => {
  it('allows authenticated room members to send both presence and broadcast messages', () => {
    const migration = fs.readFileSync(
      workspacePath('supabase', 'migrations', '20260729001009_kwilt_games_full_parity.sql'),
      'utf8',
    );

    expect(migration).toContain('create policy "game members send realtime updates"');
    expect(migration).toContain("realtime.messages.extension in ('broadcast', 'presence')");
  });

  it('ships the Apple implementation declared by the nearby Expo module', () => {
    const modulePath = workspacePath('modules', 'kwilt-nearby-table', 'ios');
    expect(fs.existsSync(path.join(modulePath, 'KwiltNearbyTableModule.swift'))).toBe(true);
    expect(fs.existsSync(path.join(modulePath, 'KwiltNearbyTable.podspec'))).toBe(true);
  });

  it('registers the legacy Games invite scheme with the installed Kwilt binary', () => {
    const appConfig = fs.readFileSync(workspacePath('app.config.ts'), 'utf8');
    expect(appConfig).toContain("scheme: ['kwilt', 'kwiltgames']");
  });
});
