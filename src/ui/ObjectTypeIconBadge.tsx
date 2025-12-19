import React from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { Icon, type IconName } from './Icon';
import { getObjectTypeBadgeColors, type ObjectTypeTone } from '../theme/objectTypeBadges';

type ObjectTypeIconBadgeProps = {
  iconName: IconName;
  tone?: ObjectTypeTone;
  size?: number;
  badgeSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function ObjectTypeIconBadge({
  iconName,
  tone = 'default',
  size = 18,
  badgeSize = 32,
  style,
}: ObjectTypeIconBadgeProps) {
  const { backgroundColor, iconColor } = getObjectTypeBadgeColors(tone);

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: Math.round(badgeSize * 0.32),
          backgroundColor,
        },
        style,
      ]}
    >
      <Icon name={iconName} size={size} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    // Give it a little visual weight without looking like a button.
    padding: 0,
  },
});


