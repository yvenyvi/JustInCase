import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TriageResultScreen from '../src/screens/public/TriageResultScreen';

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  reset: mockReset,
};

// Mock Route
const mockRoute = {
  params: {
    result: {
      category_of_law: 'Labor Law',
      urgency: 'High',
      primary_issue: 'Illegal Dismissal',
      case_summary: 'The citizen reports being dismissed without notice.',
      opposing_party: 'Employer',
      location: 'Manila',
      evidence: 'Termination letter',
      desired_outcome: 'Reinstatement',
      chronology: ['Dismissed on September 1'],
      ai_assessment: 'The employer terminated the employee without due process.',
      missing_details: 'None'
    }
  }
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

describe('TriageResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AI result correctly', async () => {
    const { getByText } = await render(<TriageResultScreen />);

    expect(getByText('Review your concern')).toBeTruthy();
    expect(getByText('Labor Law')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
    expect(getByText('Illegal Dismissal')).toBeTruthy();
    expect(getByText('The employer terminated the employee without due process.')).toBeTruthy();
  });

  it('navigates to Lawyer Selection when primary button is pressed', async () => {
    const { getByText } = await render(<TriageResultScreen />);

    const nextButton = getByText('Find an attorney');
    await fireEvent.press(nextButton);
    expect(mockNavigate).not.toHaveBeenCalled();
    await fireEvent.press(getByText('No preference'));

    expect(mockNavigate).toHaveBeenCalledWith('PublicTriageLawyerSelection', {
      result: { ...mockRoute.params.result, intent: 'seek_attorney', lawyer_preference: 'Any' },
    });
  });

  it('passes citizen corrections to lawyer selection', async () => {
    const view = await render(<TriageResultScreen />);

    await act(async () => {
      await fireEvent.press(view.getByTestId('edit-case-profile'));
    });
    await waitFor(() => expect(view.getByTestId('location-input')).toBeTruthy());
    await act(async () => {
      await fireEvent.changeText(view.getByTestId('location-input'), 'Quezon City');
      await fireEvent.changeText(view.getByTestId('desired-outcome-input'), 'Back pay and reinstatement');
    });
    await waitFor(() => expect(view.getByDisplayValue('Quezon City')).toBeTruthy());
    await fireEvent.press(view.getByText('Find an attorney'));
    await fireEvent.press(view.getByText('Pro Bono'));

    expect(mockNavigate).toHaveBeenCalledWith('PublicTriageLawyerSelection', {
      result: expect.objectContaining({
        location: 'Quezon City',
        desired_outcome: 'Back pay and reinstatement',
      }),
    });
  });

  it('resets navigation when cancel button is pressed', async () => {
    const { getByText } = await render(<TriageResultScreen />);

    const cancelButton = getByText('Finish for now');
    await fireEvent.press(cancelButton);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'PublicHome' }],
    });
  });
});
