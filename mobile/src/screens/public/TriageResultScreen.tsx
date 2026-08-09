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

  const getMockStats = (id: string) => {
    let sum = 0;
    for(let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    const rating = 4.0 + (sum % 10) / 10;
    const cases = 20 + (sum % 80);
    return { rating: rating.toFixed(1), cases };
  };

  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.100.144:8000';
        const response = await fetch(`${API_BASE_URL}/api/lawyers`);
        const resultData = await response.json();
        
        if (resultData.lawyers && resultData.lawyers.length > 0) {
          const sorted = resultData.lawyers.sort((a: any, b: any) => {
            if (a.city_municipality && result.location && a.city_municipality.toLowerCase().includes(result.location.toLowerCase())) return -1;
            if (b.city_municipality && result.location && b.city_municipality.toLowerCase().includes(result.location.toLowerCase())) return 1;
            return 0;
          });
          setLawyers(sorted.slice(0, 3));
          setSelectedLawyerId(sorted[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch lawyers:', error);
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
      navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
    } catch (error: any) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Nabigo ang pag-submit ng kaso.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
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
          <View style={styles.lawyerListContainer}>
            <Text style={styles.sectionHeaderTitle}>Pumili ng Abogado para sa Iyong Kaso</Text>
            <Text style={styles.sectionHeaderDesc}>Base sa iyong lokasyon at pangangailangan, narito ang mga inirerekomendang abogado.</Text>
            
            {lawyers.map((lawyer) => {
              const stats = getMockStats(lawyer.id);
              return (
              <Pressable 
                key={lawyer.id} 
                style={[styles.lawyerProfileCard, selectedLawyerId === lawyer.id && styles.selectedLawyerCard]}
                onPress={() => setSelectedLawyerId(lawyer.id)}
              >
                {lawyer.selfie_url ? (
                  <Image source={{ uri: lawyer.selfie_url }} style={styles.lawyerAvatarModern} />
                ) : (
                  <View style={[styles.lawyerAvatarModern, { backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={28} color={theme.colors.primary} />
                  </View>
                )}
                
                <View style={styles.lawyerInfo}>
                  <Text style={styles.lawyerName}>Atty. {lawyer.first_name} {lawyer.last_name}</Text>
                  <Text style={styles.lawyerFirm}>{lawyer.firm_name || 'Independent Counsel'}</Text>
                  
                  <View style={styles.lawyerStatsRow}>
                    <View style={styles.lawyerLocationBadge}>
                      <Ionicons name="location" size={12} color={theme.colors.primary} />
                      <Text style={styles.lawyerLocationText}>{lawyer.city_municipality || 'Pilipinas'}</Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.statText}>{stats.rating}</Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Ionicons name="briefcase" size={12} color={theme.colors.primary} />
                      <Text style={styles.statText}>{stats.cases} Cases</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.modernRadio, selectedLawyerId === lawyer.id && styles.modernRadioSelected]}>
                  {selectedLawyerId === lawyer.id && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
            )})}
            
            <Pressable 
              style={[styles.lawyerProfileCard, selectedLawyerId === null && styles.selectedLawyerCard]}
              onPress={() => setSelectedLawyerId(null)}
            >
              <View style={[styles.lawyerAvatarModern, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="globe-outline" size={28} color="#64748B" />
              </View>
              <View style={styles.lawyerInfo}>
                <Text style={styles.lawyerName}>I-post sa Open Network</Text>
                <Text style={styles.lawyerFirm}>Para makita ng lahat ng abogado.</Text>
              </View>
              <View style={[styles.modernRadio, selectedLawyerId === null && styles.modernRadioSelected]}>
                {selectedLawyerId === null && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyLawyerState}>
            <Ionicons name="earth" size={48} color={theme.colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyLawyerTitle}>I-post ang Kaso sa Network</Text>
            <Text style={styles.emptyLawyerDesc}>Walang direktang match na abogado sa ngayon, ngunit maaari nating i-post ito sa aming network para makita ng lahat ng abogado.</Text>
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

  lawyerListContainer: { marginTop: 8 },
  sectionHeaderTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionHeaderDesc: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 22 },
  
  lawyerProfileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12, ...theme.shadows.soft },
  selectedLawyerCard: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  
  lawyerAvatarModern: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.colors.surface, ...theme.shadows.soft },
  
  lawyerInfo: { flex: 1 },
  lawyerName: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  lawyerFirm: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  
  lawyerStatsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  lawyerLocationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.md, gap: 4 },
  lawyerLocationText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  statBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.md, gap: 4 },
  statText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },

  modernRadio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  modernRadioSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary, borderWidth: 0 },
  
  emptyLawyerState: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft, marginTop: 8 },
  emptyLawyerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptyLawyerDesc: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 24, textAlign: 'center' },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium },
  btnPrimaryText: { color: theme.colors.surface, fontSize: 16, fontWeight: '800' },
  btnDisabled: { backgroundColor: theme.colors.textSecondary, shadowOpacity: 0 },
  btnSecondary: { backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '700' },
});
