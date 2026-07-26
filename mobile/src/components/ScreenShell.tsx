import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

type ScreenShellProps = {
  title: string;
  subtitle: string;
};

import { Ionicons } from '@expo/vector-icons';
import { mobileSupabase } from '../shared/supabase';

export default function ScreenShell({ title, subtitle }: ScreenShellProps) {
  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#CBD5E1" />
        </Pressable>
      </View>
      <Text style={styles.kicker}>JusticeLink Mobile</Text>
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
    padding: 24,
    backgroundColor: '#020617',
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kicker: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 23,
  },
});