import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

    expect(getByText('Pagsusuri ng AI Tapos Na')).toBeTruthy();
    expect(getByText('Labor Law')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
    expect(getByText('Illegal Dismissal')).toBeTruthy();
    expect(getByText('The employer terminated the employee without due process.')).toBeTruthy();
  });

  it('navigates to Lawyer Selection when primary button is pressed', async () => {
    const { getByText } = await render(<TriageResultScreen />);

    const nextButton = getByText('Hanapan ng Abogado');
    fireEvent.press(nextButton);

    expect(mockNavigate).toHaveBeenCalledWith('PublicTriageLawyerSelection', {
      result: mockRoute.params.result,
    });
  });

  it('resets navigation when cancel button is pressed', async () => {
    const { getByText } = await render(<TriageResultScreen />);

    const cancelButton = getByText('Kanselahin');
    fireEvent.press(cancelButton);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'PublicHome' }],
    });
  });
});
