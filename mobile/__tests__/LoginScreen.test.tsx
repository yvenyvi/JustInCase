import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../src/screens/auth/LoginScreen';
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
const mockNavigation = {
  replace: mockReplace,
  navigate: mockNavigate,
};

// Mock Route
const mockRoute = { params: {} };

// Mock Supabase
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />);

    await waitFor(() => {
      expect(getByText('Welcome back')).toBeTruthy();
    });

    expect(getByPlaceholderText('example@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••')).toBeTruthy();
    expect(getByText('LOGIN')).toBeTruthy();
  });

  it('shows validation errors when fields are empty', async () => {
    const { getByText } = await render(<LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />);

    const loginButton = getByText('LOGIN');
    await fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });

    expect(mobileSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('calls Supabase auth and navigates on success', async () => {
    (mobileSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user1' }, session: { access_token: 'abc' } },
      error: null,
    });

    const { findByText, findByPlaceholderText } = await render(<LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />);

    const emailInput = await findByPlaceholderText('example@email.com');
    const passwordInput = await findByPlaceholderText('••••••');
    
    await fireEvent.changeText(emailInput, 'test@example.com');
    await fireEvent.changeText(passwordInput, 'password123');

    const loginButton = await findByText('LOGIN');
    await fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mobileSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to ForgotPassword when link is pressed', async () => {
    const { findByTestId } = await render(<LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />);

    const forgotPasswordLink = await findByTestId('forgot-password-link');
    await fireEvent.press(forgotPasswordLink);

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to Register when SIGNUP button is pressed', async () => {
    const { findByTestId } = await render(<LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />);

    const signupButton = await findByTestId('signup-button');
    await fireEvent.press(signupButton);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });
});
