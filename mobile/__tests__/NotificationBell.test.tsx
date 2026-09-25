import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NotificationBell } from '../src/components/ui/NotificationBell';
import { mobileSupabase } from '../src/shared/supabase';

const mockNavigate = jest.fn();
let mockFocused = true;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => mockFocused,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../src/shared/MobileAuthContext', () => ({
  useMobileAuth: () => ({ role: 'legal', user: { id: 'attorney-1' } }),
}));
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: (() => {
    const channel: any = {};
    channel.on = jest.fn(() => channel);
    channel.subscribe = jest.fn(() => channel);

    return {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          })),
        })),
      })),
      __channel: channel,
    };
  })(),
}));

const mockSupabase = mobileSupabase as typeof mobileSupabase & { __channel: any };
const mockChannel = mockSupabase.__channel;
const mockChannelFactory = mockSupabase.channel as jest.Mock;

describe('NotificationBell', () => {
  beforeEach(() => {
    mockFocused = true;
    jest.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
  });

  it('subscribes once and opens attorney notifications', async () => {
    const view = await render(<NotificationBell />);
    await waitFor(() => expect(mockChannelFactory).toHaveBeenCalledTimes(1));
    expect(mockChannel.on).toHaveBeenCalledTimes(1);
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByLabelText('Notifications'));
    expect(mockNavigate).toHaveBeenCalledWith('LegalNotifications');
  });
});
