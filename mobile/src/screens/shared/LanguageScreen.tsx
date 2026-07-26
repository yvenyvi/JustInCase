import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
              {selectedLanguage === lang.name && <Ionicons name="checkmark-circle" size={24} color="#0D9488" />}
              {selectedLanguage !== lang.name && <Ionicons name="ellipse-outline" size={24} color="#E2E8F0" />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  instructions: { color: '#64748B', fontSize: 15, marginBottom: 24, lineHeight: 22 },
  list: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listItemSelected: { backgroundColor: '#F0FDFA' },
  listText: { color: '#1E293B', fontSize: 16, fontWeight: '600' },
});
