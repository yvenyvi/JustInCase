import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import TriageLawyerSelectionScreen, {
  buildCaseTitle,
  normalizeCaseCategory,
} from '../src/screens/public/TriageLawyerSelectionScreen';
import { mobileSupabase } from '../src/shared/supabase';

const mockReset = jest.fn();
const mockLongCategory = `Labor and Employment Law ${'and wage-related workplace protections '.repeat(5)}`;
const mockRoute = {
  params: {
    result: {
      category_of_law: mockLongCategory,
      primary_issue: 'Unpaid final salary',
      urgency: 'Medium',
      location: 'Bulacan',
      opposing_party: 'Employer',
      evidence: 'Payslips',
      lawyer_preference: 'Pro Bono',
      ai_assessment: 'The claim may require legal review.',
      case_summary: 'The citizen reports an unpaid final salary.',
      case_subcategory: 'Unpaid Wages',
      chronology: ['Employment ended in August.'],
      important_dates: ['August 31'],
      desired_outcome: 'Payment of the final salary',
      safety_risks: [],
      missing_details: 'Exact payroll period',
      legal_sources: [],
    },
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset, goBack: jest.fn() }),
  useRoute: () => mockRoute,
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../src/components/ui/WorkflowProgress', () => ({ WorkflowProgress: () => null }));
jest.mock('../src/shared/supabase', () => ({
  mobileSupabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

describe('TriageLawyerSelectionScreen', () => {
  const insert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        lawyers: [{
          id: 'attorney-id',
          first_name: 'Test',
          last_name: 'Lawyer',
          city_municipality: 'Bulacan',
          expertise: ['Labor and Employment Law'],
          rating: 4.8,
          review_count: 5,
          match_score: 90,
          match_reasons: ['Specialization matches Labor'],
        }],
      }),
    });
    (mobileSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'citizen-id' } } },
    });
    insert.mockResolvedValue({ error: null });
    (mobileSupabase.from as jest.Mock).mockReturnValue({ insert });
  });

  it('keeps database-constrained case fields within 100 characters', () => {
    const category = normalizeCaseCategory(mockLongCategory);
    const title = buildCaseTitle(category, '9/22/2026');

    expect(category.length).toBeLessThanOrEqual(100);
    expect(title.length).toBeLessThanOrEqual(100);
    expect(title).toContain('Concern (9/22/2026)');
  });

  it('submits long AI categories without losing the original value', async () => {
    const view = await render(<TriageLawyerSelectionScreen />);
    await waitFor(() => expect(view.getByText('Atty. Test Lawyer')).toBeTruthy());
    await fireEvent.press(view.getByText('Atty. Test Lawyer'));
    await waitFor(() => expect(view.getByText('Ipadala ang Kaso sa Abogado')).toBeTruthy());
    await fireEvent.press(view.getByText('Ipadala ang Kaso sa Abogado'));

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const payload = insert.mock.calls[0][0];
    const description = JSON.parse(payload.description);

    expect(payload.title.length).toBeLessThanOrEqual(100);
    expect(payload.category.length).toBeLessThanOrEqual(100);
    expect(payload.attorney_id).toBe('attorney-id');
    expect(description.category_of_law).toBe(mockLongCategory);
    expect(description.case_subcategory).toBe('Unpaid Wages');
    expect(description.chronology).toEqual(['Employment ended in August.']);
    expect(description.desired_outcome).toBe('Payment of the final salary');
    expect(description.missing_details).toBe('Exact payroll period');
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'PublicHome' }] });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/lawyers/match'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
