import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CapabilityMenu } from './CapabilityMenu';
import { colors } from '../theme';

const handlers = {
  onSelectCapability: jest.fn(),
  onSelectChat: jest.fn(),
  onCreateChat: jest.fn(),
  onOpenSearch: jest.fn(),
  onOpenSettings: jest.fn(),
  onOpenChat: jest.fn(),
};

const chats = [
  { id: 'chat-2', title: 'Plan the school week', updatedAt: '2026-07-22T18:00:00.000Z' },
  { id: 'chat-1', title: 'Tea tomorrow', updatedAt: '2026-07-21T18:00:00.000Z' },
];

describe('CapabilityMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the accepted hierarchy without a close control', () => {
    const { getByText, getByLabelText, queryByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
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
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(getByLabelText('Collapse Goals & Plans'));
    expect(queryByText('To-dos')).toBeNull();

    fireEvent.press(getByLabelText('Expand Goals & Plans'));
    expect(getByText('To-dos')).toBeTruthy();
  });

  it('marks and selects the active capability', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByLabelText('To-dos').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Plan'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('plan');
  });

  it('uses neutral launcher chrome rather than Pine accents', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(StyleSheet.flatten(getByLabelText('To-dos').props.style)?.backgroundColor).toBe(
      colors.gray100,
    );
    expect(StyleSheet.flatten(getByLabelText('Open chat').props.style)?.backgroundColor).toBe(
      colors.sumi900,
    );
  });

  it('reuses global search and settings and opens durable Chat', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(getByLabelText('Search Kwilt'));
    fireEvent.press(getByLabelText('Open profile and settings'));
    fireEvent.press(getByLabelText('Open chat'));

    expect(handlers.onOpenSearch).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('renders and opens every chat from the scrollable menu and owns chat creation there', () => {
    const { getByLabelText, getByText } = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByText('Plan the school week')).toBeTruthy();
    expect(getByText('Tea tomorrow')).toBeTruthy();
    fireEvent.press(getByLabelText('New chat'));
    fireEvent.press(getByLabelText('Open chat Plan the school week'));

    expect(handlers.onCreateChat).toHaveBeenCalledTimes(1);
    expect(handlers.onSelectChat).toHaveBeenCalledWith('chat-2');
  });
});
