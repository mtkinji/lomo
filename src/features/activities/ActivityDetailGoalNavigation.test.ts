import { readFileSync } from 'fs';
import path from 'path';

describe('ActivityDetail linked goal navigation', () => {
  it('keeps Goal detail in the Activity stack so back returns to the To-do', () => {
    const rootNavigator = readFileSync(
      path.join(__dirname, '../../navigation/RootNavigator.tsx'),
      'utf8',
    );
    const activityDetailRefresh = readFileSync(
      path.join(__dirname, 'ActivityDetailRefresh.tsx'),
      'utf8',
    );

    expect(rootNavigator).toContain('<ActivitiesStack.Screen name="GoalDetail" component={GoalDetailScreen} />');
    expect(activityDetailRefresh).toContain("navigation.push('GoalDetail'");
    expect(activityDetailRefresh).not.toContain("screen: 'GoalsTab',");
  });
});
