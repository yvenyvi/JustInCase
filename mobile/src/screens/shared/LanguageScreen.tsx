import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';

export default function LanguageScreen() {
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = useState('Tagalog');

  const languages = [
    { id: '1', name: 'Tagalog' },
    { id: '2', name: 'English' },
    { id: '3', name: 'Cebuano' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructions}>Piliin ang wika na gusto mong gamitin sa buong app.</Text>

        <View style={styles.list}>
          {languages.map((lang) => (
            <Pressable 
              key={lang.id} 
              style={[styles.listItem, selectedLanguage === lang.name && styles.listItemSelected]}
              onPress={() => setSelectedLanguage(lang.name)}
            >
              <Text style={styles.listText}>{lang.name}</Text>
              {selectedLanguage === lang.name && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
              {selectedLanguage !== lang.name && <Ionicons name="ellipse-outline" size={24} color="#E2E8F0" />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  instructions: { color: theme.colors.textSecondary, fontSize: 15, marginBottom: 24, lineHeight: 22 },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
  listItemSelected: { backgroundColor: '#F0FDFA' },
  listText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
