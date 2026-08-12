import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

describe('Sample Test', () => {
  it('renders correctly', async () => {
    const { getByText } = await render(
      <View>
        <Text>Hello Testing!</Text>
      </View>
    );

    expect(getByText('Hello Testing!')).toBeTruthy();
  });
});
