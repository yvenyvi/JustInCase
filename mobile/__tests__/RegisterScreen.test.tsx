import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../src/screens/auth/RegisterScreen';
import { mobileSupabase } from '../src/shared/supabase';

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: 'ScrollView'
}));// Mock Navigation
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

// Mock Supabase
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn().mockReturnValue('justicelink://register'),
  openURL: jest.fn(),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

// Mock fetch for registration endpoint
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ attemptId: 'test-attempt-123', verificationUrl: 'https://didit.me/verify' }),
  })
) as jest.Mock;

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Step 1 correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <RegisterScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('example@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getByText('Citizen')).toBeTruthy();
    expect(getByText('Legal Professional')).toBeTruthy();
  });

  it('shows validation errors for empty fields in Step 1', async () => {
    const { getByText } = await render(
      <RegisterScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    const nextButton = getByText('NEXT STEP');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('advances to Step 2 when fields are valid (Citizen)', async () => {
    const { findByText, findByPlaceholderText } = await render(
      <RegisterScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    const emailInput = await findByPlaceholderText('example@email.com');
    const passwordInput = await findByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const nextButton = await findByText('NEXT STEP');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(await findByText('Verify Your Identity')).toBeTruthy();
  });

  it('navigates to Login when Login link is pressed', async () => {
    const { findByTestId } = await render(
      <RegisterScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    const loginLink = await findByTestId('login-link');
    fireEvent.press(loginLink);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
