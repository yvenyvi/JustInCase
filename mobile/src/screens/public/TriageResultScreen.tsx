import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';

export default function TriageResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const result = route.params?.result || {};
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lawyer, setLawyer] = useState<any>(null);

  useEffect(() => {
    const fetchLawyer = async () => {
      if (result.recommended_lawyer_id) {
        const { data } = await mobileSupabase
          .from('users')
          .select('id, first_name, last_name, firm_name, city_municipality, selfie_url')
          .eq('id', result.recommended_lawyer_id)
          .single();
        if (data) setLawyer(data);
      }
    };
    fetchLawyer();
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
        attorney_id: lawyer?.id || null,
        lawyer_preference: result.lawyer_preference || 'Any',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await mobileSupabase
        .from('cases')
        .insert(caseData);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Success', text2: 'Naipadala na ang iyong kaso.' });
      navigation.navigate('PublicDashboard');
    } catch (error: any) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Nabigo ang pag-submit ng kaso.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('PublicHome');
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
            <Ionicons name="bulb-outline" size={24} color="#0D9488" />
            <Text style={styles.aiResultTitle}>Legal Assessment Summary</Text>
          </View>
          
          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Kategorya ng Batas:</Text>
            <Text style={styles.aiDetailValue}>{result.category_of_law}</Text>
          </View>
          
          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Pangunahing Isyu:</Text>
            <Text style={styles.aiDetailValue}>{result.primary_issue}</Text>
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Urgency:</Text>
            <Text style={styles.aiDetailValue}>{result.urgency}</Text>
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>AI Assessment:</Text>
            <Text style={styles.aiDetailValue}>{result.ai_assessment}</Text>
          </View>

          {result.missing_details && result.missing_details.toLowerCase() !== "none" && (
            <View style={[styles.aiDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.aiDetailLabel}>Mga Kulang na Detalye:</Text>
              <Text style={[styles.aiDetailValue, { color: '#D97706' }]}>{result.missing_details}</Text>
            </View>
          )}
        </View>

        {lawyer ? (
          <View style={styles.lawyerCard}>
            <Text style={styles.lawyerCardTitle}>💡 Recommended na Abogado para sa Iyo</Text>
            <View style={styles.lawyerProfileRow}>
              {lawyer.selfie_url ? (
                <Image source={{ uri: lawyer.selfie_url }} style={styles.lawyerAvatar} />
              ) : (
                <View style={[styles.lawyerAvatar, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={24} color="#94A3B8" />
                </View>
              )}
              <View style={styles.lawyerInfo}>
                <Text style={styles.lawyerName}>Atty. {lawyer.first_name} {lawyer.last_name}</Text>
                <Text style={styles.lawyerFirm}>{lawyer.firm_name || 'Independent Counsel'}</Text>
                <View style={styles.lawyerLocationBadge}>
                  <Ionicons name="location" size={12} color="#0D9488" />
                  <Text style={styles.lawyerLocationText}>{lawyer.city_municipality || 'Pilipinas'}</Text>
                </View>
              </View>
            </View>
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
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>{lawyer ? `Ipadala ang Kaso kay Atty. ${lawyer.last_name}` : 'I-post ang Kaso'}</Text>}
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
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  resultHeader: { alignItems: 'center', marginBottom: 24 },
  resultTitle: { color: '#1E293B', fontSize: 24, fontWeight: '800', marginTop: 12 },
  
  aiResultCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  aiResultTitle: { color: '#0F766E', fontSize: 16, fontWeight: '800' },
  aiDetailRow: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 16 },
  aiDetailLabel: { color: '#64748B', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  aiDetailValue: { color: '#1E293B', fontSize: 15, lineHeight: 22, fontWeight: '500' },

  lawyerCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  lawyerCardTitle: { color: '#1E293B', fontSize: 16, fontWeight: '800', marginBottom: 16 },
  lawyerCardDesc: { color: '#64748B', fontSize: 14, lineHeight: 22 },
  lawyerProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lawyerAvatar: { width: 64, height: 64, borderRadius: 32 },
  lawyerInfo: { flex: 1 },
  lawyerName: { color: '#1E293B', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  lawyerFirm: { color: '#475569', fontSize: 14, marginBottom: 6 },
  lawyerLocationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  lawyerLocationText: { color: '#0D9488', fontSize: 12, fontWeight: '700' },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: '#0D9488', borderRadius: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  btnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  btnSecondary: { backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
});
