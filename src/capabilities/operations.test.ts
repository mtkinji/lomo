import fs from 'node:fs';
import path from 'node:path';
import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { KWILT_OPERATION_REGISTRY } from './operations';

describe('KWILT_OPERATION_REGISTRY', () => {
  test('is the product projection of the one canonical capability manifest', () => {
    expect(KWILT_OPERATION_REGISTRY).toEqual(
      KWILT_CAPABILITY_MANIFEST.map(({ id, owner }) => ({ id, owner })),
    );
    expect(new Set(KWILT_CAPABILITY_MANIFEST.map((operation) => operation.id)).size)
      .toBe(KWILT_CAPABILITY_MANIFEST.length);
  });

  test('is declared independently instead of mapping the Chat manifest at runtime', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/capabilities/operations.ts'), 'utf8');
    expect(source).not.toContain('KWILT_CAPABILITY_MANIFEST.map');
    expect(Object.isFrozen(KWILT_OPERATION_REGISTRY)).toBe(true);
  });

  test('keeps Household reads live while writes remain explicit pending-provider boundaries', () => {
    const liveReads = ['household.read', 'household.invitation.preview'] as const;
    const pendingWrites = [
      ['household.member.add_dependent', 'explicit'],
      ['household.invitation.create', 'explicit'],
      ['household.invitation.accept', 'explicit'],
      ['household.child_capability.update', 'explicit'],
      ['household.caregiver_grant.update', 'explicit'],
    ] as const;
    const byId = new Map(KWILT_CAPABILITY_MANIFEST.map((operation) => [operation.id, operation]));
    for (const id of liveReads) {
      expect(byId.get(id)).toMatchObject({
        owner: 'household', confirmation: 'none',
        channels: {
          mobile: { state: 'live', outcome: 'answer' },
          phone: { state: 'live', outcome: 'server_execution' },
        },
      });
    }
    for (const [id, confirmation] of pendingWrites) {
      expect(byId.get(id)).toMatchObject({
        owner: 'household', confirmation,
        channels: {
          mobile: { state: 'pending_provider', outcome: 'honest_boundary' },
          phone: { state: 'pending_provider', outcome: 'honest_boundary' },
        },
      });
    }
  });
});
