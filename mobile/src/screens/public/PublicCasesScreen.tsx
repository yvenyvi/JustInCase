import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';

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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'Active' | 'Completed' | 'Withdrawn'>('Active');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['publicAllCases'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

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

      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        assignedTo: c.attorney ? `Atty. ${c.attorney.first_name} ${c.attorney.last_name}`.trim() : null,
        updatedAt: new Date(c.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }));
    }
  });

  useEffect(() => {
    const subscription = mobileSupabase
      .channel('public-cases-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['publicAllCases'] });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in progress':
      case 'in_progress':
      case 'accepted':
        return { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', text: '#16A34A', label: 'Active' };
      case 'demand sent':
      case 'hearing scheduled':
        return { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#2563EB', label: status };
      case 'pending triage':
      case 'pending':
        return { bg: '#FFF7ED', border: '#FED7AA', dot: '#EA580C', text: '#EA580C', label: 'Pending' };
      case 'closed':
      case 'closed - won':
      case 'closed - lost':
      case 'withdrawn':
      case 'dropped':
      case 'resolved':
        return { bg: theme.colors.secondary, border: '#CBD5E1', dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: 'Closed' };
      default:
        return { bg: theme.colors.background, border: theme.colors.border, dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: status || 'Unknown' };
    }
  };

  const activeCases = cases.filter(c => !c.status.includes('Closed') && c.status !== 'Withdrawn' && c.status !== 'Dropped');
  const completedCases = cases.filter(c => c.status.includes('Closed') || c.status === 'Resolved');
  const withdrawnCases = cases.filter(c => c.status === 'Withdrawn' || c.status === 'Dropped');
  
  let filteredCases = activeCases;
  if (filter === 'Completed') filteredCases = completedCases;
  else if (filter === 'Withdrawn') filteredCases = withdrawnCases;

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
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

      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, filter === 'Active' && styles.activeTab]}
          onPress={() => setFilter('Active')}
        >
          <Text style={[styles.tabText, filter === 'Active' && styles.activeTabText]}>Active Cases</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, filter === 'Completed' && styles.activeTab]}
          onPress={() => setFilter('Completed')}
        >
          <Text style={[styles.tabText, filter === 'Completed' && styles.activeTabText]}>Completed Cases</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, filter === 'Withdrawn' && styles.activeTab]}
          onPress={() => setFilter('Withdrawn')}
        >
          <Text style={[styles.tabText, filter === 'Withdrawn' && styles.activeTabText]}>Withdrawn</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Wala kang kaso</Text>
          <Text style={styles.emptySubtitle}>Pumunta sa Triage para makahanap ng abogado.</Text>
        </View>
      ) : filteredCases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No {filter.toLowerCase()} cases</Text>
          <Text style={styles.emptySubtitle}>You do not have any {filter.toLowerCase()} cases at the moment.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredCases.map((c) => {
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
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: theme.colors.textSecondary, fontSize: 15 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  activeTabText: { color: theme.colors.primary },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  caseCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.md, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardBody: { marginBottom: 20, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: theme.colors.textSecondary, fontSize: 14 },
  viewBtn: { backgroundColor: '#F0FDFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: theme.borderRadius.md, gap: 8, borderWidth: 1, borderColor: '#CCFBF1' },
  viewBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
});

