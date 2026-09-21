import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../shared/theme';

type ScreenShellProps = {
  title: string;
  subtitle: string;
};

export default function ScreenShell({ title, subtitle }: ScreenShellProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>LAYA</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
});
