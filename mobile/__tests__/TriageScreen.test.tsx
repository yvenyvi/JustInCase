import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import TriageScreen from '../src/screens/public/TriageScreen';
import * as DocumentPicker from 'expo-document-picker';
import { mobileSupabase } from '../src/shared/supabase';

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock Navigation
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: mockNavigate,
  goBack: mockGoBack,
};

// Mock Route
const mockRoute = { params: {} };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

// Mock Auth Context
jest.mock('../src/shared/MobileAuthContext', () => ({
  useMobileAuth: () => ({
    session: { user: { id: 'test-user' } }
  })
}));

// Mock Supabase
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  },
}));

// Mock DocumentPicker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      response: 'QUESTION: I can help with that. OPTIONS: ["Tell me more", "Finish"]',
    }),
  })
) as jest.Mock;

describe('TriageScreen', () => {
  afterEach(async () => {
    await cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <TriageScreen />
    );

    expect(getByText('AI Triage Intake')).toBeTruthy();
    expect(getByPlaceholderText('Ilarawan ang iyong problema...')).toBeTruthy();
  });

  it('sends a message and updates the chat', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = await render(
      <TriageScreen />
    );

    const input = getByPlaceholderText('Ilarawan ang iyong problema...');
    fireEvent.changeText(input, 'I have a labor issue.');

    await waitFor(() => {
      expect(getByTestId('send-button').props.accessibilityState.disabled).toBe(false);
    });
    fireEvent.press(getByTestId('send-button'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(getByText('I have a labor issue.')).toBeTruthy();
      expect(getByText('I can help with that.')).toBeTruthy();
      expect(getByText('Tell me more')).toBeTruthy();
      expect(getByText('Finish')).toBeTruthy();
    });
  });

  it('handles option click', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = await render(
      <TriageScreen />
    );

    const input = getByPlaceholderText('Ilarawan ang iyong problema...');
    fireEvent.changeText(input, 'I have a labor issue.');
    await waitFor(() => {
      expect(getByTestId('send-button').props.accessibilityState.disabled).toBe(false);
    });
    fireEvent.press(getByTestId('send-button'));

    await waitFor(() => {
      expect(getByText('Tell me more')).toBeTruthy();
    });

    const optionBtn = getByText('Tell me more');
    fireEvent.press(optionBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
