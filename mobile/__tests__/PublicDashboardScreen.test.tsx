import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PublicDashboardScreen from '../src/screens/public/PublicDashboardScreen';
import { mobileSupabase } from '../src/shared/supabase';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useIsFocused: () => true,
}));

// Mock Supabase
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn().mockReturnValue({ 
      on: jest.fn().mockReturnThis(), 
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }) 
    }),
    removeChannel: jest.fn(),
  },
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('PublicDashboardScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('renders correctly and handles clicks without errors', async () => {
    // Setup mocks
    (mobileSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockIn = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: { first_name: 'TestCitizen' },
    });
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'test-case-id',
        title: 'Test Case 1',
        status: 'In Progress',
        updated_at: '2026-08-12T00:00:00Z',
        attorney: { first_name: 'Test', last_name: 'Atty' },
      },
    });

    (mobileSupabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'users') {
        return { select: mockSelect, eq: mockEq, single: mockSingle };
      }
      if (table === 'cases') {
        return { select: mockSelect, eq: mockEq, in: mockIn, order: mockOrder, limit: mockLimit, maybeSingle: mockMaybeSingle };
      }
      return { select: mockSelect, eq: mockEq, in: mockIn, maybeSingle: mockMaybeSingle };
    });

    const { getByText, findByText } = await render(
      <QueryClientProvider client={queryClient}>
        <PublicDashboardScreen />
      </QueryClientProvider>
    );

    // Wait for the mock data to load
    await waitFor(() => {
      expect(getByText('TestCitizen')).toBeTruthy();
    });

    // Check if the case loaded
    expect(getByText('Test Case 1')).toBeTruthy();

    // Test Clicks
    const heroBtn = getByText('Simulan Ngayon');
    fireEvent.press(heroBtn);
    expect(mockNavigate).toHaveBeenCalledWith('PublicTriage');

    const caseWidget = getByText('Test Case 1');
    fireEvent.press(caseWidget);
    expect(mockNavigate).toHaveBeenCalledWith('CaseDetails', { caseId: 'test-case-id' });
    
    const seeAll = getByText('Tingnan Lahat');
    fireEvent.press(seeAll);
    expect(mockNavigate).toHaveBeenCalledWith('Cases');
  });
});
