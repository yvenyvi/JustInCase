import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';
import { theme } from '../../shared/theme';

export default function TriageLawyerSelectionScreen() {
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
          let sorted = [...resultData.lawyers];
          
          // Sort by recommended lawyer first, then location match
          sorted.sort((a: any, b: any) => {
            if (result.recommended_lawyer_id) {
              if (a.id === result.recommended_lawyer_id) return -1;
              if (b.id === result.recommended_lawyer_id) return 1;
            }
            const aLocMatch = a.city_municipality && result.location && a.city_municipality.toLowerCase().includes(result.location.toLowerCase());
            const bLocMatch = b.city_municipality && result.location && b.city_municipality.toLowerCase().includes(result.location.toLowerCase());
            if (aLocMatch && !bLocMatch) return -1;
            if (!aLocMatch && bLocMatch) return 1;
            return 0;
          });

          // Take top 3
          const topLawyers = sorted.slice(0, 3);
          setLawyers(topLawyers);
          
          // Auto-select recommended lawyer if present in top 3, else select the first one
          if (result.recommended_lawyer_id && topLawyers.find(l => l.id === result.recommended_lawyer_id)) {
            setSelectedLawyerId(result.recommended_lawyer_id);
          } else {
            setSelectedLawyerId(topLawyers[0].id);
          }
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
        lawyer_preference: result.lawyer_preference,
        ai_assessment: result.ai_assessment
      };

      // The database enum is ONLY 'Pro Bono' or 'Private'. If 'Any', we store null.
      const validPreferences = ['Pro Bono', 'Private'];
      let dbPreference = null;
      if (validPreferences.includes(result.lawyer_preference)) {
        dbPreference = result.lawyer_preference;
      }

      const caseData = {
        title: caseTitle,
        client_id: user.id,
        category: result.category_of_law || 'General Practice',
        description: JSON.stringify(fullDescriptionObject),
        status: 'Pending Triage',
        attorney_id: selectedLawyerId || null,
        lawyer_preference: dbPreference,
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
        <Text style={styles.headerTitle}>Pumili ng Abogado</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {lawyers.length > 0 ? (
          <View style={styles.lawyerListContainer}>
            <Text style={styles.sectionHeaderTitle}>Pumili ng Inyong Abogado</Text>
            <Text style={styles.sectionHeaderDesc}>Ayon sa pagsusuri ng aming AI, heto ang mga abogadong pinaka-angkop na hawakan ang iyong kaso.</Text>
            
            {lawyers.map((lawyer) => {
              const stats = getMockStats(lawyer.id);
              const hasValidImage = lawyer.selfie_url && lawyer.selfie_url.includes('http');
              const initial = (lawyer.first_name && lawyer.first_name.length > 0) ? lawyer.first_name[0].toUpperCase() : 'A';
              const isSelected = selectedLawyerId === lawyer.id;
              const isRecommended = result.recommended_lawyer_id === lawyer.id;
              
              return (
              <Pressable 
                key={lawyer.id} 
                style={[styles.lawyerProfileCard, isSelected && styles.selectedLawyerCard]}
                onPress={() => setSelectedLawyerId(lawyer.id)}
              >
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    <Text style={styles.recommendedBadgeText}>AI Recommended Match</Text>
                  </View>
                )}
                
                <View style={styles.cardHeader}>
                  {hasValidImage ? (
                    <Image source={{ uri: lawyer.selfie_url }} style={styles.lawyerAvatarModern} />
                  ) : (
                    <View style={[styles.lawyerAvatarModern, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>{initial}</Text>
                    </View>
                  )}
                  
                  <View style={styles.lawyerInfo}>
                    <Text style={[styles.lawyerName, isSelected && styles.selectedTextPrimary]}>Atty. {lawyer.first_name} {lawyer.last_name}</Text>
                    <Text style={styles.lawyerFirm}>{lawyer.firm_name || 'Independent Counsel'}</Text>
                    
                    <View style={styles.lawyerStatsRow}>
                      <View style={[styles.statBadge, styles.locationBadge]}>
                        <Ionicons name="location" size={12} color="#3B82F6" />
                        <Text style={[styles.statText, { color: '#1D4ED8' }]}>{lawyer.city_municipality || 'Pilipinas'}</Text>
                      </View>
                      <View style={[styles.statBadge, styles.ratingBadge]}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={[styles.statText, { color: '#B45309' }]}>{stats.rating}</Text>
                      </View>
                      <View style={[styles.statBadge, styles.casesBadge]}>
                        <Ionicons name="briefcase" size={12} color="#10B981" />
                        <Text style={[styles.statText, { color: '#047857' }]}>{stats.cases} Cases</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.modernRadio, isSelected && styles.modernRadioSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </View>

                {isRecommended && result.recommendation_reason && (
                  <View style={styles.reasonContainer}>
                    <Ionicons name="chatbubbles-outline" size={16} color="#4F46E5" />
                    <Text style={styles.reasonText}>{result.recommendation_reason}</Text>
                  </View>
                )}
              </Pressable>
            )})}
            
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O KAYA NAMAN</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable 
              style={[styles.networkCard, selectedLawyerId === null && styles.selectedLawyerCard]}
              onPress={() => setSelectedLawyerId(null)}
            >
              <View style={[styles.lawyerAvatarModern, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 0 }]}>
                <Ionicons name="earth" size={32} color="#64748B" />
              </View>
              <View style={styles.lawyerInfo}>
                <Text style={[styles.lawyerName, selectedLawyerId === null && styles.selectedTextPrimary]}>I-post sa Open Network</Text>
                <Text style={styles.lawyerFirm}>Hayaang makita ng lahat ng registered na abogado sa JusticeLink ang iyong kaso.</Text>
              </View>
              <View style={[styles.modernRadio, selectedLawyerId === null && styles.modernRadioSelected]}>
                {selectedLawyerId === null && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyLawyerState}>
            <Ionicons name="earth" size={48} color={theme.colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyLawyerTitle}>I-post sa Open Network</Text>
            <Text style={styles.emptyLawyerDesc}>Walang direktang abogado na nahanap ang AI para sa lokasyon at isyu na ito. Huwag mag-alala, maaari natin itong i-post sa buong network upang makita ng mga available na abogado.</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  lawyerListContainer: { marginTop: 4 },
  sectionHeaderTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  sectionHeaderDesc: { color: '#64748B', fontSize: 15, marginBottom: 24, lineHeight: 22 },
  
  lawyerProfileCard: { flexDirection: 'column', padding: 20, paddingTop: 24, borderRadius: 24, backgroundColor: '#FFFFFF', marginBottom: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, borderWidth: 2, borderColor: '#FFFFFF', position: 'relative' },
  networkCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24, backgroundColor: '#FFFFFF', marginBottom: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, borderWidth: 2, borderColor: '#FFFFFF' },
  selectedLawyerCard: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF', shadowColor: '#3B82F6', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  
  recommendedBadge: { position: 'absolute', top: -12, left: 24, backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 },
  recommendedBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  lawyerAvatarModern: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avatarFallback: { backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 24, fontWeight: '800', color: '#4F46E5' },
  
  lawyerInfo: { flex: 1 },
  lawyerName: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  selectedTextPrimary: { color: '#1E3A8A' },
  lawyerFirm: { color: '#64748B', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  
  lawyerStatsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  locationBadge: { backgroundColor: '#DBEAFE' },
  ratingBadge: { backgroundColor: '#FEF3C7' },
  casesBadge: { backgroundColor: '#D1FAE5' },
  statText: { fontSize: 12, fontWeight: '700' },

  modernRadio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  modernRadioSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F6', borderWidth: 0 },
  
  reasonContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', gap: 8 },
  reasonText: { flex: 1, fontSize: 14, color: '#4F46E5', fontStyle: 'italic', lineHeight: 20 },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, marginHorizontal: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },

  emptyLawyerState: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, marginTop: 8 },
  emptyLawyerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptyLawyerDesc: { color: '#64748B', fontSize: 15, lineHeight: 24, textAlign: 'center' },

  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: '#4F46E5', borderRadius: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  btnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0, elevation: 0 },
  btnSecondary: { backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: '#475569', fontSize: 16, fontWeight: '700' },
});
