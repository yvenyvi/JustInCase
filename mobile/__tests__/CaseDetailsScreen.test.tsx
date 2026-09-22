import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import CaseDetailsScreen from '../src/screens/shared/CaseDetailsScreen';
import { mobileSupabase } from '../src/shared/supabase';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    channel: jest.fn(),
    removeChannel: jest.fn()
  },
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('CaseDetailsScreen', () => {
  afterEach(async () => {
    await cleanup();
  });

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
      } else if (table === 'pro_bono_logs') {
        chain.order = jest.fn().mockResolvedValue({
          data: [{
            id: 'pending-log-id',
            hours: 3,
            description: 'Reviewed evidence and discussed next steps.',
            created_at: '2026-09-23T00:00:00Z',
            is_verified: false,
          }],
        });
      } else {
        // Other tables return empty array by default
        chain.order = jest.fn().mockResolvedValue({ data: [] });
      }
      return chain;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const { getByText, queryByText, unmount } = await render(
      <QueryClientProvider client={queryClient}>
        <CaseDetailsScreen />
      </QueryClientProvider>
    );

    // Wait for the mock data to load
    await waitFor(() => {
      expect(getByText('Test Case Title')).toBeTruthy();
    });

    expect(getByText('HOURS FOR YOUR REVIEW')).toBeTruthy();
    expect(getByText('1 pending')).toBeTruthy();
    expect(getByText('Accept')).toBeTruthy();
    expect(getByText('Reject')).toBeTruthy();

    await fireEvent.press(getByText('Reject'));
    expect(getByText('Reject submitted hours?')).toBeTruthy();
    expect(getByText("This 3-hour entry will be removed and will not count toward the attorney's recorded service. Ask the attorney to submit a corrected entry if needed.")).toBeTruthy();
    expect(getByText('This action cannot be undone.')).toBeTruthy();
    expect(getByText('Reject Hours')).toBeTruthy();

    await fireEvent.press(getByText('Keep It'));
    await waitFor(() => expect(queryByText('Reject submitted hours?')).toBeNull());

    await fireEvent.press(getByText('Cancel Case'));
    expect(getByText('Cancel this case?')).toBeTruthy();
    expect(getByText('The case will be marked as withdrawn and the assigned attorney will be notified. You will need to start a new request if you need help again.')).toBeTruthy();
    expect(getByText('This action cannot be undone.')).toBeTruthy();
    expect(getByText('Keep It')).toBeTruthy();

    // Check if the "Message Attorney" button is present and click it
    const msgBtn = getByText('Message Attorney');
    await fireEvent.press(msgBtn);
    
    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('ChatThread', {
      threadId: 'test-case-id',
      threadName: 'Atty. Test Atty'
    });

    unmount();
    queryClient.clear();
  });
});
