import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LegalCasesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'my_cases' | 'available'>('my_cases');
  const [myCasesFilter, setMyCasesFilter] = useState<'Active' | 'Completed' | 'Withdrawn'>('Active');

  const { data: myCases = [], isLoading: isLoadingMy, isRefetching: isRefetchingMy } = useQuery({
    queryKey: ['legalMyCases'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: myData } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, status, updated_at, created_at,
          client:users!cases_client_id_fkey(first_name, last_name)
        `)
        .eq('attorney_id', user.id)
        .order('updated_at', { ascending: false });

      return myData || [];
    }
  });

  const { data: availableCases = [], isLoading: isLoadingAvail, isRefetching: isRefetchingAvail } = useQuery({
    queryKey: ['legalAvailableCases'],
    queryFn: async () => {
      const { data: availData } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, description, status, lawyer_preference, updated_at, created_at,
          client:users!cases_client_id_fkey(first_name, last_name, city_municipality)
        `)
        .is('attorney_id', null)
        .order('created_at', { ascending: false });

      return availData || [];
    }
  });

  const isLoading = isLoadingMy || isLoadingAvail;
  const isRefreshing = isRefetchingMy || isRefetchingAvail;

  const onRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['legalMyCases'] }),
      queryClient.invalidateQueries({ queryKey: ['legalAvailableCases'] })
    ]);
  };

  useEffect(() => {
    const subscription = mobileSupabase
      .channel('legal-cases-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['legalMyCases'] });
        queryClient.invalidateQueries({ queryKey: ['legalAvailableCases'] });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
      case 'resolved':
      case 'closed - won':
      case 'closed - lost':
      case 'withdrawn':
      case 'dropped':
        return { bg: theme.colors.secondary, border: '#CBD5E1', dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: 'Closed' };
      default:
        return { bg: theme.colors.background, border: theme.colors.border, dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: status || 'Unknown' };
    }
  };

  const myActiveCases = myCases.filter(c => !c.status.includes('Closed') && c.status !== 'Withdrawn' && c.status !== 'Dropped');
  const myCompletedCases = myCases.filter(c => c.status.includes('Closed') || c.status === 'Resolved');
  const myWithdrawnCases = myCases.filter(c => c.status === 'Withdrawn' || c.status === 'Dropped');
  
  let displayedMyCases = myActiveCases;
  if (myCasesFilter === 'Completed') displayedMyCases = myCompletedCases;
  else if (myCasesFilter === 'Withdrawn') displayedMyCases = myWithdrawnCases;

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Case Management</Text>
        </View>

        {/* Segmented Control */}
        <View style={styles.tabContainer}>
          <Pressable 
            style={[styles.tab, activeTab === 'my_cases' && styles.tabActive]}
            onPress={() => setActiveTab('my_cases')}
          >
            <Text style={[styles.tabText, activeTab === 'my_cases' && styles.tabTextActive]}>My Cases</Text>
            {activeTab === 'my_cases' && <View style={styles.tabIndicator} />}
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>Available Cases</Text>
            {activeTab === 'available' && <View style={styles.tabIndicator} />}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        >
          
          {activeTab === 'my_cases' && (
            <>
              {/* Sub-Filter for My Cases */}
              <View style={styles.subFilterContainer}>
                <Pressable
                  style={[styles.subFilterBtn, myCasesFilter === 'Active' && styles.subFilterBtnActive]}
                  onPress={() => setMyCasesFilter('Active')}
                >
                  <Text style={[styles.subFilterText, myCasesFilter === 'Active' && styles.subFilterTextActive]}>Active</Text>
                </Pressable>
                <Pressable
                  style={[styles.subFilterBtn, myCasesFilter === 'Completed' && styles.subFilterBtnActive]}
                  onPress={() => setMyCasesFilter('Completed')}
                >
                  <Text style={[styles.subFilterText, myCasesFilter === 'Completed' && styles.subFilterTextActive]}>Completed</Text>
                </Pressable>
                <Pressable
                  style={[styles.subFilterBtn, myCasesFilter === 'Withdrawn' && styles.subFilterBtnActive]}
                  onPress={() => setMyCasesFilter('Withdrawn')}
                >
                  <Text style={[styles.subFilterText, myCasesFilter === 'Withdrawn' && styles.subFilterTextActive]}>Withdrawn</Text>
                </Pressable>
              </View>

              {displayedMyCases.length > 0 ? (
                displayedMyCases.map(c => {
                  const clientObj: any = Array.isArray(c.client) ? c.client[0] : c.client;
                  return (
                  <Pressable 
                    key={c.id} 
                    style={styles.caseWidget}
                    onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}
                  >
                    <View style={styles.caseWidgetHeader}>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(c.status).bg, borderColor: getStatusColor(c.status).border }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(c.status).dot }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(c.status).text }]}>{getStatusColor(c.status).label}</Text>
                      </View>
                      <Text style={styles.caseDate}>
                        {new Date(c.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.caseTitle}>{c.title}</Text>
                    <View style={styles.caseWidgetFooter}>
                      <View style={styles.caseAtty}>
                        <Ionicons name="person-circle-outline" size={20} color="#64748B" />
                        <Text style={styles.attyName}>
                          Client: {clientObj?.first_name} {clientObj?.last_name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </View>
                  </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTitle}>No {myCasesFilter} Cases</Text>
                  <Text style={styles.emptyDesc}>
                    {myCasesFilter === 'Active' 
                      ? "You are currently not handling any active cases. Check the Available Cases tab to find someone who needs help."
                      : myCasesFilter === 'Completed'
                      ? "You haven't completed any cases yet."
                      : "You don't have any withdrawn cases."}
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'available' && (
            <>
              {availableCases.length > 0 ? (
                availableCases.map(c => {
                  let parsedDesc: any = null;
                  try { parsedDesc = JSON.parse(c.description || '{}'); } catch(e) {}
                  const clientObj: any = Array.isArray(c.client) ? c.client[0] : c.client;
                  
                  return (
                  <View key={c.id} style={styles.caseWidget}>
                    <View style={styles.caseWidgetHeader}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={[styles.statusPill, { backgroundColor: getStatusColor(c.status).bg, borderColor: getStatusColor(c.status).border }]}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(c.status).dot }]} />
                          <Text style={[styles.statusText, { color: getStatusColor(c.status).text }]}>Pending Request</Text>
                        </View>
                        {c.lawyer_preference === 'Private' ? (
                          <View style={[styles.statusPill, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
                            <Ionicons name="cash-outline" size={12} color="#9333EA" style={{ marginRight: 4 }} />
                            <Text style={[styles.statusText, { color: '#9333EA' }]}>Private</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusPill, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                            <Ionicons name="heart-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                            <Text style={[styles.statusText, { color: '#0284C7' }]}>Pro Bono</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.caseDate}>
                        Filed {new Date(c.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <Text style={styles.caseTitle}>{c.title}</Text>
                    {parsedDesc?.summary || parsedDesc?.rawInput?.description || c.description ? (
                      <Text style={styles.caseDesc} numberOfLines={3}>{parsedDesc?.summary || parsedDesc?.rawInput?.description || c.description}</Text>
                    ) : null}
                    
                    <View style={[styles.caseWidgetFooter, { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.attyName}>
                          {parsedDesc?.location || parsedDesc?.rawInput?.province || clientObj?.city_municipality || 'Location not provided'}
                        </Text>
                      </View>
                      
                      <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}>
                        <Text style={styles.primaryBtnText}>Review & Accept</Text>
                      </Pressable>
                    </View>
                  </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTitle}>No Pending Requests</Text>
                  <Text style={styles.emptyDesc}>There are currently no cases waiting for an attorney. Check back later.</Text>
                </View>
              )}
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { backgroundColor: 'transparent', paddingTop: 60 },
  headerTop: { paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800' },
  
  tabContainer: { flexDirection: 'row' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', position: 'relative' },
  tabActive: { backgroundColor: theme.colors.background },
  tabText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  caseWidget: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 16 },
  caseWidgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.md, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  caseDate: { color: theme.colors.textSecondary, fontSize: 12 },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  caseDesc: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 16 },
  caseWidgetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.secondary },
  caseAtty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attyName: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
  
  primaryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  primaryBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Sub-filter styling
  subFilterContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 999, padding: 4, marginBottom: 16, width: '100%' },
  subFilterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999 },
  subFilterBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  subFilterText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  subFilterTextActive: { color: theme.colors.primary }
});
