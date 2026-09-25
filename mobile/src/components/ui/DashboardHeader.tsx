import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { NotificationBell } from './NotificationBell';

type Props = {
  eyebrow: string;
  name: string;
  subtitle: string;
  isLoading?: boolean;
};

export function DashboardHeader({ eyebrow, name, subtitle, isLoading }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 16, 36) }]}>
      <View style={styles.row}>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">{name}</Text>
          )}
        </View>
        <NotificationBell />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identity: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  name: { color: theme.colors.textPrimary, fontSize: 22, lineHeight: 27, fontWeight: '800' },
  loader: { alignSelf: 'flex-start', height: 29 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
});
