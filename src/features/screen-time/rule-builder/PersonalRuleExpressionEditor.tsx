import { View } from 'react-native';
import { Button } from '../../../ui/Button';
import { SettingsGroup } from '../../../ui/SettingsSurface';
import { spacing } from '../../../theme';
import type { PersonalRuleCondition } from '../domain/personalCompositeScreenTimeRule';
import type { PersonalRuleGroup } from '../domain/personalRuleExpression';
import { PersonalRuleConditionRow } from './PersonalRuleConditionRow';
import { RuleSentencePickerField } from './RuleSentencePickerField';

export function PersonalRuleExpressionEditor(props: {
  group: PersonalRuleGroup;
  conditions: PersonalRuleCondition[];
  nested?: boolean;
  onConnector: (id: string) => void;
  onUngroup: (id: string) => void;
  onField: (condition: PersonalRuleCondition) => void;
  onOperator: (condition: PersonalRuleCondition) => void;
  onValue: (condition: PersonalRuleCondition) => void;
}) {
  const { group } = props;
  const content = <View style={{ gap: spacing.sm }}>
    {group.children.map((child, index) => {
      const condition = child.type === 'condition' ? props.conditions.find(c => c.id === child.conditionId) : null;
      return <View key={child.type === 'condition' ? child.conditionId : child.id} style={{ gap: spacing.sm }}>
        {index > 0 ? <RuleSentencePickerField
          accessibilityLabel={props.nested ? `Change group ${group.id} connector` : `Change ${group.connector === 'all' ? 'AND' : 'OR'} connector`}
          value={group.connector === 'all' ? 'AND' : 'OR'} onPress={() => props.onConnector(group.id)} style={{ width: 92 }} /> : null}
        {child.type === 'group' ? <PersonalRuleExpressionEditor {...props} group={child} nested />
          : condition ? <PersonalRuleConditionRow condition={condition} onEditField={() => props.onField(condition)}
            onEditOperator={() => props.onOperator(condition)} onEditValue={() => props.onValue(condition)} /> : null}
      </View>;
    })}
  </View>;
  return props.nested ? <SettingsGroup title={group.connector === 'all' ? 'All of these' : 'Any of these'}
    headerAction={<Button variant="ghost" size="sm" accessibilityLabel={`Ungroup ${group.id}`} onPress={() => props.onUngroup(group.id)}>Ungroup</Button>}>
    {content}
  </SettingsGroup> : content;
}
