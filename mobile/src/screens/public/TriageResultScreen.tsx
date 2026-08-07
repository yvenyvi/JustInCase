import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';
import { theme } from '../../shared/theme';

export default function TriageResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const result = route.params?.result || {};
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLawyers = async () => {
      // Fetch up to 5 legal professionals
      const { data } = await mobileSupabase
        .from('users')
        .select('id, first_name, last_name, firm_name, city_municipality, selfie_url')
        .eq('role', 'Volunteer Attorney')
        .limit(5);

      if (data && data.length > 0) {
        // Sort to prioritize lawyers in the user's location
        const sorted = data.sort((a, b) => {
          if (a.city_municipality && result.location && a.city_municipality.toLowerCase().includes(result.location.toLowerCase())) return -1;
          if (b.city_municipality && result.location && b.city_municipality.toLowerCase().includes(result.location.toLowerCase())) return 1;
          return 0;
        });
        setLawyers(sorted);
        setSelectedLawyerId(sorted[0].id); // Select best match by default
      }
    };
    fetchLawyers();
  }, [result]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await mobileSupabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const user = session.user;
      
      const dateStr = new Date().toLocaleDateString();
      const caseTitle = `${result.category_of_law || 'Legal'} Concern (${dateStr})`;

      const fullDescriptionObject = {
        summary: result.primary_issue,
        urgency: result.urgency,
        location: result.location,
        opposingParty: result.opposing_party,
        evidence: result.evidence,
        income: result.income,
        lawyer_preference: result.lawyer_preference,
        ai_assessment: result.ai_assessment
      };

      const caseData = {
        title: caseTitle,
        client_id: user.id,
        category: result.category_of_law || 'General Practice',
        description: JSON.stringify(fullDescriptionObject),
        status: 'Pending Triage',
        attorney_id: selectedLawyerId || null,
        lawyer_preference: result.lawyer_preference || 'Any',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await mobileSupabase
        .from('cases')
        .insert(caseData);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Success', text2: 'Naipadala na ang iyong kaso.' });
      navigation.navigate('Dashboard');
    } catch (error: any) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Nabigo ang pag-submit ng kaso.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isSubmitting}>
          {!isSubmitting && <Ionicons name="arrow-back" size={24} color="#64748B" />}
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

        {lawyers.length > 0 ? (
          <View style={styles.lawyerCard}>
            <Text style={styles.lawyerCardTitle}>💡 Pumili ng Abogado para sa Iyong Kaso</Text>
            {lawyers.map((lawyer) => (
              <Pressable 
                key={lawyer.id} 
                style={[styles.lawyerProfileRow, selectedLawyerId === lawyer.id && styles.selectedLawyerRow]}
                onPress={() => setSelectedLawyerId(lawyer.id)}
              >
                <View style={[styles.radioCircle, selectedLawyerId === lawyer.id && { borderColor: theme.colors.primary }]}>
                  {selectedLawyerId === lawyer.id && <View style={styles.radioInner} />}
                </View>
                
                {lawyer.selfie_url ? (
                  <Image source={{ uri: lawyer.selfie_url }} style={styles.lawyerAvatar} />
                ) : (
                  <View style={[styles.lawyerAvatar, { backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.lawyerInfo}>
                  <Text style={styles.lawyerName}>Atty. {lawyer.first_name} {lawyer.last_name}</Text>
                  <Text style={styles.lawyerFirm}>{lawyer.firm_name || 'Independent Counsel'}</Text>
                  <View style={styles.lawyerLocationBadge}>
                    <Ionicons name="location" size={12} color={theme.colors.primary} />
                    <Text style={styles.lawyerLocationText}>{lawyer.city_municipality || 'Pilipinas'}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Pressable 
              style={[styles.lawyerProfileRow, selectedLawyerId === null && styles.selectedLawyerRow]}
              onPress={() => setSelectedLawyerId(null)}
            >
              <View style={[styles.radioCircle, selectedLawyerId === null && { borderColor: theme.colors.primary }]}>
                {selectedLawyerId === null && <View style={styles.radioInner} />}
              </View>
              <View style={[styles.lawyerAvatar, { backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="globe-outline" size={24} color="#94A3B8" />
              </View>
              <View style={styles.lawyerInfo}>
                <Text style={styles.lawyerName}>I-post sa Open Network</Text>
                <Text style={styles.lawyerFirm}>Para makita ng lahat ng abogado.</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.lawyerCard}>
            <Text style={styles.lawyerCardTitle}>I-post ang Kaso sa Network</Text>
            <Text style={styles.lawyerCardDesc}>Walang direktang match na abogado sa ngayon, ngunit maaari nating i-post ito sa aming network para makita ng lahat ng abogado.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.btnPrimary, isSubmitting && styles.btnDisabled]} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>{selectedLawyerId ? 'Ipadala ang Kaso sa Abogado' : 'I-post ang Kaso'}</Text>}
        </Pressable>
        <Pressable 
          style={[styles.btnSecondary, isSubmitting && styles.btnDisabled]} 
          onPress={handleCancel}
          disabled={isSubmitting}
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

  lawyerCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
  lawyerCardTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 16 },
  lawyerCardDesc: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },
  lawyerProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: 'transparent', marginBottom: 8 },
  selectedLawyerRow: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary },
  lawyerAvatar: { width: 56, height: 56, borderRadius: 28 },
  lawyerInfo: { flex: 1 },
  lawyerName: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  lawyerFirm: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 6 },
  lawyerLocationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.md, gap: 4 },
  lawyerLocationText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium },
  btnPrimaryText: { color: theme.colors.surface, fontSize: 16, fontWeight: '800' },
  btnDisabled: { backgroundColor: theme.colors.textSecondary, shadowOpacity: 0 },
  btnSecondary: { backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '700' },
});
