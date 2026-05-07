import { Text } from 'react-native';
import { renderWithProviders } from './renderWithProviders';

describe('renderWithProviders', () => {
  it('renders a basic React Native component without errors', () => {
    const { getByText } = renderWithProviders(<Text>hello-test</Text>);
    expect(getByText('hello-test')).toBeTruthy();
  });

  it('supports navigation wrapper without throwing', () => {
    const { getByText } = renderWithProviders(<Text>nav-test</Text>, {
      withNavigation: true,
    });
    expect(getByText('nav-test')).toBeTruthy();
  });
});
