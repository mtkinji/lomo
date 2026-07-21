import { fireEvent, render } from '@testing-library/react-native';
import { CapabilityMenu } from './CapabilityMenu';

const handlers = {
  onSelectCapability: jest.fn(),
  onOpenSearch: jest.fn(),
  onOpenSettings: jest.fn(),
  onOpenAgent: jest.fn(),
};

describe('CapabilityMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the accepted hierarchy without a close control', () => {
    const { getByText, getByLabelText, queryByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" {...handlers} />,
    );

    expect(getByText('Kwilt')).toBeTruthy();
    expect(getByText('GOALS & PLANS')).toBeTruthy();
    expect(getByText('Goals')).toBeTruthy();
    expect(getByText('To-dos')).toBeTruthy();
    expect(getByText('Plan')).toBeTruthy();
    expect(getByText('Arcs')).toBeTruthy();
    expect(getByText('Chapters')).toBeTruthy();
    expect(getByText('CHATS')).toBeTruthy();
    expect(getByLabelText('Open chat')).toBeTruthy();
    expect(queryByLabelText(/close/i)).toBeNull();
  });

  it('collapses and expands a capability group', () => {
    const { getByLabelText, queryByText, getByText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" {...handlers} />,
    );

    fireEvent.press(getByLabelText('Collapse Goals & Plans'));
    expect(queryByText('To-dos')).toBeNull();

    fireEvent.press(getByLabelText('Expand Goals & Plans'));
    expect(getByText('To-dos')).toBeTruthy();
  });

  it('marks and selects the active capability', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" {...handlers} />,
    );

    expect(getByLabelText('To-dos').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Plan'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('plan');
  });

  it('reuses global search, settings, and Agent entry points', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" {...handlers} />,
    );

    fireEvent.press(getByLabelText('Search Kwilt'));
    fireEvent.press(getByLabelText('Open profile and settings'));
    fireEvent.press(getByLabelText('Open chat'));

    expect(handlers.onOpenSearch).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenAgent).toHaveBeenCalledTimes(1);
  });
});
