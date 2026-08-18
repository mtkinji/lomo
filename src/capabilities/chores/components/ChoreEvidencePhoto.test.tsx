import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { ChoreEvidencePhoto } from './ChoreEvidencePhoto';

describe('ChoreEvidencePhoto', () => {
  it('keeps evidence compact until the caregiver opens the zoomable viewer', () => {
    const screen = renderWithProviders(
      <ChoreEvidencePhoto
        uri="fixture://tidy-shoes"
        childName="Charlie"
        compact
      />,
    );

    fireEvent.press(screen.getByLabelText("Charlie's chore photo. Open full screen"));

    expect(screen.getByLabelText("Charlie's chore photo. Pinch to zoom")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close full-screen chore photo'));
    expect(screen.queryByLabelText("Charlie's chore photo. Pinch to zoom")).toBeNull();
  });
});
