import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type CaseItem = {
  id: string;
  title: string;
  status: string;
  assignedTo: string | null;
  updatedAt: string;
};

export default function PublicCasesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;

      const { data, error } = await mobileSupabase
        .from('cases')
        .select(`
          id, 
          title, 
          status, 
          updated_at, 
          attorney:users!cases_attorney_id_fkey(first_name, last_name)
        `)
        .eq('client_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mappedCases = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          assignedTo: c.attorney ? `Atty. ${c.attorney.first_name} ${c.attorney.last_name}`.trim() : null,
          updatedAt: new Date(c.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        }));
        setCases(mappedCases);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Closed') || status === 'Withdrawn') return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    if (status === 'In Progress') return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mga Kaso Ko</Text>
          <Text style={styles.headerSubtitle}>Lahat ng iyong legal cases.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('PublicNotifications' as any)} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#64748B" />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={24} color="#64748B" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Wala kang kaso</Text>
          <Text style={styles.emptySubtitle}>Pumunta sa Triage para makahanap ng abogado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {cases.map((c) => {
            const colors = getStatusColor(c.status);
            return (
              <Pressable key={c.id} style={styles.caseCard} onPress={() => navigation.navigate('CaseDetails', { caseId: c.id })}>
                <View style={styles.cardHeader}>
                  <Text style={styles.caseTitle}>{c.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>{c.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#94A3B8" />
                    <Text style={styles.infoText}>{c.assignedTo || 'Unassigned'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                    <Text style={styles.infoText}>Updated: {c.updatedAt}</Text>
                  </View>
                </View>

                <View style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>Tingnan ang Kaso</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0D9488" />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { color: '#1E293B', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: '#64748B', fontSize: 15 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: '#1E293B', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  caseCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  caseTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardBody: { marginBottom: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#64748B', fontSize: 14 },
  viewBtn: { backgroundColor: '#F0FDFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#CCFBF1' },
  viewBtnText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },
});

