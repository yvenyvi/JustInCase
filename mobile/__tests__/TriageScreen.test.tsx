import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TriageScreen from '../src/screens/public/TriageScreen';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers review without navigating until explicitly requested', async () => {
    const assessment = { primary_issue: 'Unpaid wages', intent: 'seek_attorney' };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({
      reply: 'We can prepare your concern for attorney review.', intent: 'seek_attorney',
      review_ready: true, suggestions: [], assessment: null,
    }) }).mockResolvedValueOnce({ ok: true, json: async () => ({
      reply: 'Your concern is ready for review.', intent: 'seek_attorney',
      review_ready: true, suggestions: [], assessment,
    }) });
    const view = await render(<TriageScreen />);
    await fireEvent.changeText(view.getByPlaceholderText('Ilarawan ang iyong problema...'), 'I want an attorney for unpaid wages.');
    await fireEvent.press(view.getByTestId('send-button'));
    await waitFor(() => expect(view.getByText('Review and find an attorney')).toBeTruthy());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect((fetch as jest.Mock).mock.calls[0][1].body).toContain('action=continue');
    await fireEvent.press(view.getByTestId('review-assessment'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PublicTriageResult', expect.objectContaining({ result: assessment })));
    expect((fetch as jest.Mock).mock.calls[1][1].body).toContain('action=assess');
  });

  it('retries failed turns without duplicating the user message', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    const view = await render(<TriageScreen />);
    await fireEvent.changeText(view.getByPlaceholderText('Ilarawan ang iyong problema...'), 'My salary is unpaid.');
    await fireEvent.press(view.getByTestId('send-button'));
    await waitFor(() => expect(view.getByText('Retry')).toBeTruthy());
    await fireEvent.press(view.getByText('Retry'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const body = (fetch as jest.Mock).mock.calls[1][1].body;
    const history = JSON.parse(new URLSearchParams(body).get('history')!);
    expect(history.filter((message: any) => message.content === 'My salary is unpaid.')).toHaveLength(1);
    expect(history.some((message: any) => message.content.includes('Pansamantalang'))).toBe(false);
  });

  it('renders correctly', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <TriageScreen />
    );

    expect(getByText('Legal Help Assessment')).toBeTruthy();
    expect(getByPlaceholderText('Ilarawan ang iyong problema...')).toBeTruthy();
  });

  it('sends a message and updates the chat', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = await render(
      <TriageScreen />
    );

    const input = getByPlaceholderText('Ilarawan ang iyong problema...');
    await fireEvent.changeText(input, 'I have a labor issue.');

    await waitFor(() => {
      expect(getByTestId('send-button').props.accessibilityState.disabled).toBe(false);
    });
    await fireEvent.press(getByTestId('send-button'));

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
    await fireEvent.changeText(input, 'I have a labor issue.');
    await waitFor(() => {
      expect(getByTestId('send-button').props.accessibilityState.disabled).toBe(false);
    });
    await fireEvent.press(getByTestId('send-button'));

    await waitFor(() => {
      expect(getByText('Tell me more')).toBeTruthy();
    });

    const optionBtn = getByText('Tell me more');
    await fireEvent.press(optionBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(getByText('Finish')).toBeTruthy();
    });
  });

  it('shows an intuitive outage message without exposing a raw network error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ detail: 'AI triage is temporarily unavailable.' }),
    });
    const view = await render(<TriageScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('Ilarawan ang iyong problema...'), 'I have a labor issue.');
    await waitFor(() => expect(view.getByTestId('send-button').props.accessibilityState.disabled).toBe(false));
    await fireEvent.press(view.getByTestId('send-button'));

    await waitFor(() => {
      expect(view.getByText('Pansamantalang hindi available ang AI assessment. Naka-save ang usapan sa screen; pakisubukang muli makalipas ang ilang sandali.')).toBeTruthy();
      expect(view.queryByText('Network response was not ok')).toBeNull();
    });
  });
});
