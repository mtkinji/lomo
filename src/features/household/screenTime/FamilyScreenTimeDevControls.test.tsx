import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { FamilyScreenTimeDevControls } from './FamilyScreenTimeDevControls';
import { resetFamilyScreenTimeLearningStoreForTests } from './useFamilyScreenTimeLearningStore';

describe('FamilyScreenTimeDevControls', () => {
  beforeEach(() => resetFamilyScreenTimeLearningStoreForTests());

  it('identifies the child and prepares or resets the simulated device', () => {
    const { getByText } = renderWithProviders(
      <FamilyScreenTimeDevControls
        childDisplayName="Charlie"
        childMembershipId="child-1"
        userId="user-1"
      />,
    );

    expect(getByText('Charlie')).toBeTruthy();
    expect(getByText('No test phone')).toBeTruthy();

    fireEvent.press(getByText('Prepare test phone'));
    expect(getByText('Ready')).toBeTruthy();

    fireEvent.press(getByText('Reset'));
    expect(getByText('No test phone')).toBeTruthy();
  });
});
