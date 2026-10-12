import type { PersonalRuleConnector } from './personalCompositeScreenTimeRule';

export type PersonalRuleExpression = { type: 'condition'; conditionId: string } | PersonalRuleGroup;
export type PersonalRuleGroup = { type: 'group'; id: string; connector: PersonalRuleConnector; children: PersonalRuleExpression[] };
export type RuleTruth = boolean | 'unknown';
export const MAX_RULE_GROUP_DEPTH = 4;

export function flatRuleExpression(connector: PersonalRuleConnector, ids: string[]): PersonalRuleGroup {
  return { type: 'group', id: 'root', connector, children: ids.map(conditionId => ({ type: 'condition', conditionId })) };
}

export function validRuleExpression(value: unknown, conditionIds: string[]): value is PersonalRuleGroup {
  const references = new Set<string>();
  const groups = new Set<string>();
  let nodes = 0;
  function visit(candidate: unknown, depth: number): boolean {
    if (++nodes > 256 || !candidate || typeof candidate !== 'object') return false;
    const node = candidate as Record<string, unknown>;
    if (node.type === 'condition') {
      if (typeof node.conditionId !== 'string' || !conditionIds.includes(node.conditionId) || references.has(node.conditionId)) return false;
      references.add(node.conditionId);
      return true;
    }
    if (node.type !== 'group' || depth > MAX_RULE_GROUP_DEPTH || typeof node.id !== 'string' || !node.id.trim()
      || groups.has(node.id) || conditionIds.includes(node.id) || (node.connector !== 'all' && node.connector !== 'any')
      || !Array.isArray(node.children) || !node.children.length) return false;
    groups.add(node.id);
    return node.children.every(child => visit(child, depth + 1));
  }
  return !!value && (value as PersonalRuleExpression).type === 'group'
    && visit(value, 1) && references.size === conditionIds.length;
}

export function combineRuleTruth(connector: PersonalRuleConnector, values: RuleTruth[]): RuleTruth {
  if (!values.length) return 'unknown';
  if (connector === 'all') return values.includes(false) ? false : values.includes('unknown') ? 'unknown' : true;
  return values.includes(true) ? true : values.includes('unknown') ? 'unknown' : false;
}

export function evaluateRuleExpression(node: PersonalRuleExpression, truth: Record<string, RuleTruth>): RuleTruth {
  return node.type === 'condition' ? truth[node.conditionId] ?? 'unknown'
    : combineRuleTruth(node.connector, node.children.map(child => evaluateRuleExpression(child, truth)));
}

/** Only branches contributing to the known aggregate result belong in a blocking explanation. */
export function decisiveRuleConditionIds(node: PersonalRuleExpression, truth: Record<string, RuleTruth>): string[] {
  const result = evaluateRuleExpression(node, truth);
  if (result === 'unknown') return [];
  if (node.type === 'condition') return [node.conditionId];
  return node.children.filter(child => evaluateRuleExpression(child, truth) === result)
    .flatMap(child => decisiveRuleConditionIds(child, truth));
}

export function ruleNodeKey(node: PersonalRuleExpression): string {
  return node.type === 'condition' ? node.conditionId : node.id;
}

export function mapRuleGroup(root: PersonalRuleGroup, id: string, transform: (group: PersonalRuleGroup) => PersonalRuleGroup): PersonalRuleGroup {
  if (root.id === id) return transform(root);
  return { ...root, children: root.children.map(child => child.type === 'group' ? mapRuleGroup(child, id, transform) : child) };
}

export function reconcileRuleExpression(root: PersonalRuleGroup, ids: string[], connector: PersonalRuleConnector): PersonalRuleGroup {
  const seen = new Set<string>();
  function prune(node: PersonalRuleExpression): PersonalRuleExpression | null {
    if (node.type === 'condition') {
      if (!ids.includes(node.conditionId)) return null;
      seen.add(node.conditionId);
      return node;
    }
    const children = node.children.map(prune).filter((child): child is PersonalRuleExpression => child !== null);
    return children.length ? { ...node, children } : null;
  }
  const pruned = prune(root) as PersonalRuleGroup | null;
  return { ...root, connector, children: [...(pruned?.children ?? []), ...ids.filter(id => !seen.has(id)).map(conditionId => ({ type: 'condition' as const, conditionId }))] };
}

export function groupRuleNodes(root: PersonalRuleGroup, keys: string[], id: string, connector: PersonalRuleConnector): PersonalRuleGroup | null {
  const selected = root.children.filter(child => keys.includes(ruleNodeKey(child)));
  if (selected.length < 2) return null;
  let inserted = false;
  const children = root.children.flatMap(child => {
    if (!keys.includes(ruleNodeKey(child))) return [child];
    if (inserted) return [];
    inserted = true;
    return [{ type: 'group' as const, id, connector, children: selected }];
  });
  const result = { ...root, children };
  const ids = (node: PersonalRuleExpression): string[] => node.type === 'condition' ? [node.conditionId] : node.children.flatMap(ids);
  return validRuleExpression(result, ids(root)) ? result : null;
}

export function ungroupRuleNode(root: PersonalRuleGroup, id: string): PersonalRuleGroup {
  return { ...root, children: root.children.flatMap(child => child.type === 'condition' ? [child]
    : child.id === id ? child.children : [ungroupRuleNode(child, id)]) };
}
