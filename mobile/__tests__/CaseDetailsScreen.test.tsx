import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CaseDetailsScreen from '../src/screens/shared/CaseDetailsScreen';
import { mobileSupabase } from '../src/shared/supabase';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  }),
  useRoute: () => ({
    params: { caseId: 'test-case-id' }
  })
}));

// Mock Supabase
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn()
  },
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('CaseDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and handles "Message Attorney" click without errors', async () => {
    // Setup mocks
    (mobileSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-client-id' } },
    });

    // Mock Realtime Channel
    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn().mockReturnThis();
    (mobileSupabase.channel as jest.Mock).mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();
    const mockLike = jest.fn().mockReturnThis();

    const mockSingleCase = jest.fn().mockResolvedValue({
      data: {
        id: 'test-case-id',
        title: 'Test Case Title',
        status: 'In Progress',
        description: '{"concern":"Test concern","location":"Test location"}',
        created_at: '2026-08-12T00:00:00Z',
        client_id: 'test-client-id',
        attorney_id: 'test-attorney-id',
        attorney: { first_name: 'Test', last_name: 'Atty' }
      },
    });

    const mockLogs = jest.fn().mockResolvedValue({ data: [] });
    const mockTimeLogs = jest.fn().mockResolvedValue({ data: [] });

    (mobileSupabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'cases') {
        return { select: mockSelect, eq: mockEq, single: mockSingleCase };
      }
      if (table === 'audit_logs') {
        return { select: mockSelect, like: mockLike, order: mockOrder, then: (cb: any) => cb({data: []}) };
      }
      if (table === 'pro_bono_logs') {
        return { select: mockSelect, eq: mockEq, order: mockOrder, then: (cb: any) => cb({data: []}) };
      }
      return { select: mockSelect, eq: mockEq };
    });

    // The component fetches multiple things concurrently and doesn't explicitly await all promises before rendering sometimes,
    // so we override the mocked from() implementation properly.
    (mobileSupabase.from as jest.Mock).mockImplementation((table) => {
      let chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };
      
      if (table === 'cases') {
        chain.single = mockSingleCase;
      } else {
        // Other tables return empty array by default
        chain.order = jest.fn().mockResolvedValue({ data: [] });
      }
      return chain;
    });

    const { getByText, queryByText } = await render(<CaseDetailsScreen />);

    // Wait for the mock data to load
    await waitFor(() => {
      expect(getByText('Test Case Title')).toBeTruthy();
    });

    // Check if the "Message Attorney" button is present and click it
    const msgBtn = getByText('Message Attorney');
    fireEvent.press(msgBtn);
    
    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('ChatThread', {
      threadId: 'test-case-id',
      threadName: 'Atty. Test Atty'
    });
  });
});
