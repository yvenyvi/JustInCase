import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import DocumentGeneratorScreen from '../src/screens/public/DocumentGeneratorScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));
jest.mock('../src/shared/MobileAuthContext', () => ({
  useMobileAuth: () => ({ session: { access_token: 'test-token' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../src/components/ui/WorkflowProgress', () => ({
  WorkflowProgress: () => null,
}));

describe('DocumentGeneratorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });
  it('opens saved documents from the header shortcut', async () => {
    const { getByLabelText, getByText } = await render(<DocumentGeneratorScreen />);
    expect(getByText('Document Drafter')).toBeTruthy();
    await fireEvent.press(getByLabelText('Open saved documents'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicMyDocuments');
  });

  it('continues the interview when the backend returns a question', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'QUESTION: Ano ang pangalan ng kabilang panig?' }),
    });
    const view = await render(<DocumentGeneratorScreen />);
    await fireEvent.changeText(view.getByPlaceholderText('Ilarawan ang iyong sitwasyon...'), 'Kailangan ko ng demand letter.');
    await fireEvent(view.getByLabelText('Send document details'), 'press');
    await waitFor(() => expect(view.getByText('Ano ang pangalan ng kabilang panig?')).toBeTruthy());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/documents/interactive-draft'), expect.objectContaining({ method: 'POST' }));
  });

  it('shows a safe error instead of crashing when drafting is unavailable', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    const view = await render(<DocumentGeneratorScreen />);
    const input = view.getByPlaceholderText('Ilarawan ang iyong sitwasyon...');
    await fireEvent.changeText(input, 'Gumawa ng affidavit.');
    await fireEvent(view.getByLabelText('Send document details'), 'press');
    await waitFor(() => expect(view.getByText('Paumanhin, mayroong error sa system ngayon. Pakisubukang muli.')).toBeTruthy());
    consoleError.mockRestore();
  });
});
