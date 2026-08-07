import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LegalCasesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'my_cases' | 'available'>('my_cases');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [myCases, setMyCases] = useState<any[]>([]);
  const [availableCases, setAvailableCases] = useState<any[]>([]);

  const fetchCases = async () => {
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;

      // Fetch My Cases (attorney_id = user.id)
      const { data: myData } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, status, updated_at, created_at,
          client:users!cases_client_id_fkey(first_name, last_name)
        `)
        .eq('attorney_id', user.id)
        .order('updated_at', { ascending: false });

      if (myData) setMyCases(myData);

      // Fetch Available Cases (attorney_id is null)
      const { data: availData } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, description, status, lawyer_preference, updated_at, created_at,
          client:users!cases_client_id_fkey(first_name, last_name, city_municipality)
        `)
        .is('attorney_id', null)
        .order('created_at', { ascending: false });

      if (availData) setAvailableCases(availData);

    } catch (err) {
      console.error('Error fetching legal cases:', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await fetchCases();
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchCases();
    setIsRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in progress':
      case 'in_progress':
      case 'accepted':
        return { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', text: '#16A34A', label: 'Active' };
      case 'pending triage':
      case 'pending':
        return { bg: '#FFF7ED', border: '#FED7AA', dot: '#EA580C', text: '#EA580C', label: 'Pending' };
      case 'closed':
      case 'resolved':
        return { bg: theme.colors.secondary, border: '#CBD5E1', dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: 'Closed' };
      default:
        return { bg: theme.colors.background, border: theme.colors.border, dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: status || 'Unknown' };
    }
  };

  return (
    <View style={styles.container}>
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
              {myCases.length > 0 ? (
                myCases.map(c => (
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
                          Client: {c.client?.first_name} {c.client?.last_name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTitle}>No Active Cases</Text>
                  <Text style={styles.emptyDesc}>You are currently not handling any active cases. Check the Available Cases tab to find someone who needs help.</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'available' && (
            <>
              {availableCases.length > 0 ? (
                availableCases.map(c => (
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
                    {c.description && (
                      <Text style={styles.caseDesc} numberOfLines={3}>{c.description}</Text>
                    )}
                    
                    <View style={[styles.caseWidgetFooter, { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.attyName}>
                          {c.client?.city_municipality ? `${c.client.city_municipality} Resident` : 'Location not provided'}
                        </Text>
                      </View>
                      
                      <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}>
                        <Text style={styles.primaryBtnText}>Review & Accept</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
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
  header: { backgroundColor: theme.colors.surface, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
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
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
