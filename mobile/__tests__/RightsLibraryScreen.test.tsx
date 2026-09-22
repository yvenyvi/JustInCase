import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RightsLibraryScreen from '../src/screens/public/RightsLibraryScreen';
import { searchLegalSources } from '../src/shared/legalResearch';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../src/shared/legalResearch', () => ({ searchLegalSources: jest.fn() }));
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => table === 'rights_categories'
        ? { order: jest.fn().mockResolvedValue({ data: [{ id: 'labor', title: 'Labor', subtitle: null, icon_name: 'briefcase', law_reference: null, description: 'Workplace rights', display_order: 1 }], error: null }) }
        : Promise.resolve({ data: [{ id: 'wage', category_id: 'labor', title: 'Minimum Wage', detail: 'Workers are entitled to applicable minimum wage.', law_section: null }], error: null })),
    })),
  },
}));

describe('RightsLibraryScreen', () => {
  beforeEach(() => jest.clearAllMocks());
  it('loads curated guides and opens Pending Bills', async () => {
    const view = await render(<RightsLibraryScreen />);
    await waitFor(() => expect(view.getByText('Minimum Wage')).toBeTruthy());
    await fireEvent.press(view.getByText('Pending Bills'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicLegislationTracker');
  });

  it('searches Juris cases and labels results as research aids', async () => {
    (searchLegalSources as jest.Mock).mockResolvedValue({
      jurisprudence: [{ dataset: 'jurisprudence', id: '1', title: 'Sample Labor Case', citation: 'G.R. No. 1', summary: 'Illegal dismissal summary', url: 'https://juris.ph/1', source_url: 'https://elibrary.judiciary.gov.ph/1' }],
      republic_acts: [], sources: [], unavailable: [], query: 'illegal dismissal',
    });
    const view = await render(<RightsLibraryScreen />);
    await fireEvent.press(view.getByText('Cases'));
    const input = await waitFor(() => view.getByPlaceholderText('Search Philippine law or a legal issue...'));
    await fireEvent.changeText(input, 'illegal dismissal');
    await fireEvent(input, 'submitEditing');
    await waitFor(() => expect(view.getByText('Sample Labor Case')).toBeTruthy());
    expect(view.getAllByText(/AI-generated research aid/).length).toBeGreaterThan(0);
    expect(view.getByText('Authoritative source')).toBeTruthy();
  });

  it('shows a retry state when legal research is unavailable', async () => {
    (searchLegalSources as jest.Mock).mockRejectedValue(new Error('Legal research is temporarily unavailable.'));
    const view = await render(<RightsLibraryScreen />);
    await fireEvent.press(view.getByText('Laws'));
    const input = await waitFor(() => view.getByPlaceholderText('Search Philippine law or a legal issue...'));
    await fireEvent.changeText(input, 'consumer rights');
    await fireEvent(input, 'submitEditing');
    await waitFor(() => expect(view.getByText('Legal research is temporarily unavailable.')).toBeTruthy());
    expect(view.getByText('Retry')).toBeTruthy();
  });
});
