import { KWILT_CAPABILITY_MANIFEST } from './kwiltCapabilityManifest';
import { KWILT_TOOL_CONTRACTS } from './kwiltToolContracts';

const operation = (id: string) => KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === id);
const tool = (id: string) => KWILT_TOOL_CONTRACTS.find((candidate) => candidate.id === id);

describe('family Screen Time agent contracts', () => {
  it('registers read, standing agreement, temporary override, request, and native handoff operations', () => {
    expect(operation('screen_time.read')).toMatchObject({
      owner: 'screenTime', consequence: 'low', confirmation: 'none',
    });
    for (const id of [
      'screen_time.agreement.create',
      'screen_time.agreement.update',
      'screen_time.agreement.deactivate',
      'screen_time.override.block',
      'screen_time.override.allow',
      'screen_time.override.cancel',
      'screen_time.request.decide',
    ]) {
      expect(operation(id)).toMatchObject({
        owner: 'screenTime', consequence: 'consequential', confirmation: 'explicit',
      });
    }
    for (const id of [
      'screen_time.selection.open',
      'screen_time.device.setup.open',
      'screen_time.device.release.open',
    ]) {
      expect(operation(id)).toMatchObject({ owner: 'screenTime', confirmation: 'native' });
    }
  });

  it('requires stable child, selection, and version identifiers before staging a direct control', () => {
    for (const id of ['screen_time.override.block', 'screen_time.override.allow']) {
      const schema = tool(id)?.inputSchema as {
        properties?: { targets?: { items?: { required?: string[]; properties?: Record<string, unknown> } } };
      };
      expect(schema.properties?.targets?.items?.required).toEqual([
        'childMembershipId', 'selectionId', 'expectedVersion',
      ]);
      expect(schema.properties?.targets?.items?.properties).not.toHaveProperty('childName');
      expect(schema.properties?.targets?.items?.properties).not.toHaveProperty('appName');
      expect(JSON.stringify(schema)).toContain('wall_clock');
      expect(JSON.stringify(schema)).not.toContain('foreground_usage');
    }
  });

  it('keeps Apple tokens out of every Screen Time tool payload', () => {
    const serialized = JSON.stringify(
      KWILT_TOOL_CONTRACTS.filter((candidate) => candidate.id.startsWith('screen_time.')),
    ).toLowerCase();
    expect(serialized).not.toContain('applicationtoken');
    expect(serialized).not.toContain('categorytoken');
    expect(serialized).not.toContain('webdomaintoken');
    expect(serialized).not.toContain('opaquetoken');
  });

  it('models one daily foreground prerequisite in standing agreement creation', () => {
    const schema = tool('screen_time.agreement.create')?.inputSchema as {
      required?: string[];
      properties?: { rule?: { properties?: Record<string, unknown>; required?: string[] } };
    };
    expect(schema.required).toEqual([
      'childMembershipId', 'targetSelectionId', 'expectedPolicyVersion', 'rule',
    ]);
    expect(schema.properties?.rule?.required).toContain('prerequisiteActivity');
    expect(JSON.stringify(schema.properties?.rule?.properties?.prerequisiteActivity)).toContain('thresholdMinutes');
    expect(JSON.stringify(schema.properties?.rule?.properties?.prerequisiteActivity)).toContain('daily');
    expect(JSON.stringify(schema)).not.toContain('childName');
    expect(JSON.stringify(schema)).not.toContain('appName');
  });

  it('does not claim mobile or Phone execution before providers are wired and proven', () => {
    for (const entry of KWILT_CAPABILITY_MANIFEST.filter((candidate) => (
      candidate.id.startsWith('screen_time.') && candidate.id !== 'screen_time.configure'
    ))) {
      expect(entry.channels.mobile.state).toBe('pending_provider');
      expect(entry.channels.phone.state).toBe('pending_provider');
      expect(entry.returnBehavior).toBe('honest_boundary');
    }
  });
});
