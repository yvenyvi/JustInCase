import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../shared/theme';

export default function TriageResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const result = route.params?.result || {};

  const handleNext = () => {
    navigation.navigate('PublicTriageLawyerSelection', { result });
  };

  const handleCancel = () => {
    navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Assessment Result</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.resultHeader}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={styles.resultTitle}>Pagsusuri ng AI Tapos Na</Text>
        </View>

        <View style={styles.aiResultCard}>
          <View style={styles.aiResultHeader}>
            <Ionicons name="bulb-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.aiResultTitle}>Legal Assessment Summary</Text>
          </View>
          
          <View style={[styles.aiDetailRow, { flexDirection: 'row', gap: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiDetailLabel}>Kategorya ng Batas:</Text>
              <Text style={styles.aiDetailValue}>{result.category_of_law}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiDetailLabel}>Urgency:</Text>
              <Text style={styles.aiDetailValue}>{result.urgency}</Text>
            </View>
          </View>
          
          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Pangunahing Isyu:</Text>
            <Text style={styles.aiDetailValue}>{result.primary_issue}</Text>
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>AI Assessment:</Text>
            <Text style={styles.aiDetailValue}>{result.ai_assessment}</Text>
          </View>

          {result.missing_details && result.missing_details.toLowerCase() !== "none" && (
            <View style={[styles.aiDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.aiDetailLabel}>Mga Kulang na Detalye:</Text>
              <Text style={[styles.aiDetailValue, { color: theme.colors.warning }]}>{result.missing_details}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={styles.btnPrimary} 
          onPress={handleNext}
        >
          <Text style={styles.btnPrimaryText}>Hanapan ng Abogado</Text>
        </Pressable>
        <Pressable 
          style={styles.btnSecondary} 
          onPress={handleCancel}
        >
          <Text style={styles.btnSecondaryText}>Kanselahin</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.subheading },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  resultHeader: { alignItems: 'center', marginBottom: 24 },
  resultTitle: { ...theme.typography.heading, marginTop: 12 },
  
  aiResultCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 24, ...theme.shadows.soft, borderWidth: 1, borderColor: theme.colors.border },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  aiResultTitle: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  aiDetailRow: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary, paddingBottom: 16 },
  aiDetailLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  aiDetailValue: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 22, fontWeight: '500' },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium },
  btnPrimaryText: { color: theme.colors.surface, fontSize: 16, fontWeight: '800' },
  btnSecondary: { backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '700' },
});
