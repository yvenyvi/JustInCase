import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../shared/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'elevated' | 'flat';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  return (
    <View style={[
      styles.card,
      variant === 'elevated' ? theme.shadows.soft : styles.flat,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  flat: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
