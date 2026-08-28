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
      'screen_time.personal.setup.open',
      'screen_time.personal.limit.open',
      'screen_time.selection.open',
      'screen_time.device.setup.open',
      'screen_time.device.release.open',
    ]) {
      expect(operation(id)).toMatchObject({ owner: 'screenTime', confirmation: 'native' });
    }
  });

  it('carries a bounded self usage limit into native review without an Apple token', () => {
    const contract = tool('screen_time.personal.limit.open');
    expect(contract).toMatchObject({
      capabilityId: 'screenTime', providers: ['device', 'server'], effect: 'write', confirmation: 'explicit',
    });
    expect(JSON.stringify(contract?.inputSchema)).toContain('"kind":{"type":"string","enum":["self"]}');
    expect(JSON.stringify(contract?.inputSchema)).toContain('"limitMinutes":{"type":"integer","minimum":1,"maximum":1440}');
    expect(JSON.stringify(contract?.inputSchema)).toContain('"reset":{"type":"string","enum":["daily"]}');
    expect(JSON.stringify(contract?.inputSchema)).not.toMatch(/token/i);
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

  it('models Money app control as a typed self subject, Money condition, and Screen Time effect', () => {
    const contract = tool('money.app_control.review');
    expect(contract).toMatchObject({
      capabilityId: 'money', providers: ['device'], effect: 'write', confirmation: 'explicit',
    });
    const serialized = JSON.stringify(contract?.inputSchema);
    expect(serialized).toContain('"subject"');
    expect(serialized).toContain('"kind":{"type":"string","enum":["self"]}');
    expect(serialized).toContain('"owner":{"type":"string","enum":["money"]}');
    expect(serialized).toContain('"owner":{"type":"string","enum":["screenTime"]}');
    expect(serialized).toContain('"preset"');
    expect(serialized).not.toContain('childMembershipId');
    expect(serialized).not.toContain('applicationToken');
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

  it('claims bounded reads and reviewed writes where providers are wired', () => {
    const read = operation('screen_time.read');
    expect(read?.channels.mobile.state).toBe('live');
    expect(read?.channels.phone.state).toBe('live');
    expect(read?.returnBehavior).toBe('answer');
    for (const id of [
      'screen_time.agreement.create', 'screen_time.agreement.update',
      'screen_time.agreement.deactivate', 'screen_time.override.block',
      'screen_time.override.allow', 'screen_time.override.cancel', 'screen_time.request.decide',
    ]) {
      const write = operation(id);
      expect(`${id}:${write?.channels.mobile.state}`).toBe(`${id}:live`);
      expect(`${id}:${write?.channels.phone.state}`).toBe(`${id}:live`);
      expect(write?.returnBehavior).toBe('proposal_or_receipt');
    }
    for (const id of [
      'screen_time.personal_rule.list', 'screen_time.personal_rule.get',
      'screen_time.personal_rule.update', 'screen_time.personal_rule.deactivate',
      'screen_time.personal_rule.delete',
    ]) {
      const personalRule = operation(id);
      expect(`${id}:${personalRule?.channels.mobile.state}`).toBe(`${id}:live`);
      expect(`${id}:${personalRule?.channels.phone.state}`).toBe(`${id}:confirmation_only`);
      expect(personalRule?.channels.phone.outcome).toBe('device_handoff');
    }
    for (const id of [
      'screen_time.personal.setup.open', 'screen_time.personal.limit.open',
      'screen_time.selection.open', 'screen_time.device.setup.open',
      'screen_time.device.release.open', 'screen_time.configure',
    ]) {
      const handoff = operation(id);
      expect(`${id}:${handoff?.channels.mobile.state}`).toBe(`${id}:confirmation_only`);
      expect(`${id}:${handoff?.channels.phone.state}`).toBe(`${id}:confirmation_only`);
      expect(handoff?.returnBehavior).toBe('native_handoff');
    }
    for (const entry of KWILT_CAPABILITY_MANIFEST.filter((candidate) => (
      candidate.id.startsWith('screen_time.') &&
      candidate.id !== 'screen_time.read' &&
      candidate.id !== 'screen_time.agreement.create' &&
      candidate.id !== 'screen_time.agreement.update' &&
      candidate.id !== 'screen_time.agreement.deactivate' &&
      candidate.id !== 'screen_time.override.block' &&
      candidate.id !== 'screen_time.override.allow' &&
      candidate.id !== 'screen_time.override.cancel' &&
      candidate.id !== 'screen_time.request.decide' &&
      !candidate.id.startsWith('screen_time.personal_rule.') &&
      candidate.id !== 'screen_time.configure' &&
      candidate.id !== 'screen_time.personal.setup.open' &&
      candidate.id !== 'screen_time.personal.limit.open' &&
      candidate.id !== 'screen_time.selection.open' &&
      candidate.id !== 'screen_time.device.setup.open' &&
      candidate.id !== 'screen_time.device.release.open'
    ))) {
      expect(entry.channels.mobile.state).toBe('pending_provider');
      expect(entry.channels.phone.state).toBe('pending_provider');
      expect(entry.returnBehavior).toBe('honest_boundary');
    }
  });
});
