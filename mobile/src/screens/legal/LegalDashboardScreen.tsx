import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';
import { NotificationBell } from '../../components/ui/NotificationBell';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LegalDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['legalDashboard'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Fetch user name
      const { data: userData } = await mobileSupabase
        .from('users')
        .select('first_name')
        .eq('id', user.id)
        .single();
      
      const firstName = userData?.first_name || 'Attorney';

      // Fetch active cases for this attorney
      const { data: activeData, count, error: activeError } = await mobileSupabase
        .from('cases')
        .select(`
          id, 
          title, 
          status, 
          lawyer_preference,
          updated_at,
          created_at,
          description
        `, { count: 'exact' })
        .eq('attorney_id', user.id)
        .in('status', ['Pending Acceptance', 'In Progress', 'Hearing Scheduled', 'Demand Sent'])
        .order('updated_at', { ascending: false });
      
      const activeCasesCount = activeError ? 0 : (count || 0);
      const activeCases = activeError ? [] : (activeData || []);

      // Fetch Direct Requests
      const { data: directData } = await mobileSupabase
        .from('cases')
        .select(`
          id, 
          title, 
          status, 
          lawyer_preference,
          updated_at,
          created_at,
          description
        `)
        .eq('attorney_id', user.id)
        .eq('status', 'Pending Triage')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch Unassigned Cases
      const { data: unassignedData } = await mobileSupabase
        .from('cases')
        .select(`
          id, 
          title, 
          status, 
          lawyer_preference,
          updated_at,
          created_at,
          description
        `)
        .is('attorney_id', null)
        .eq('status', 'Pending Triage')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch time logs for hours
      let pBono = 0;
      let pPrivate = 0;
      try {
        const { data: logsData } = await mobileSupabase
          .from('pro_bono_logs')
          .select('hours, case_id, cases!inner(lawyer_preference)')
          .eq('attorney_id', user.id)
          .eq('is_verified', true);
        
        if (logsData) {
          logsData.forEach((log: any) => {
            const preference = log.cases?.lawyer_preference;
            if (preference === 'Private') {
              pPrivate += (log.hours || 0);
            } else {
              pBono += (log.hours || 0);
            }
          });
        }
      } catch (logErr) {
        console.error('Error fetching pro bono logs:', logErr);
      }

      return {
        firstName,
        activeCasesCount,
        activeCases,
        directRequests: directData || [],
        unassignedCases: unassignedData || [],
        proBonoHours: pBono,
        privateHours: pPrivate
      };
    }
  });

  const {
    firstName = '',
    activeCasesCount = 0,
    activeCases = [],
    directRequests = [],
    unassignedCases = [],
    proBonoHours = 0,
    privateHours = 0
  } = dashboardData || {};

  useEffect(() => {
    const subscription = mobileSupabase
      .channel('legal-dashboard-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['legalDashboard'] });
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

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            {isLoading ? (
               <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : (
              <Text style={styles.name}>Atty. {firstName}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <NotificationBell />
            <Pressable style={styles.avatarContainer} onPress={() => navigation.navigate('Profile' as any)}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>
        <View style={styles.tipBox}>
          <Ionicons name="scale-outline" size={20} color="#047857" style={{ marginRight: 8 }} />
          <Text style={styles.tipText}>Thank you for providing accessible justice.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="briefcase" size={20} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{activeCasesCount}</Text>
            <Text style={styles.statLabel}>Active Cases</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="heart" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{proBonoHours}</Text>
            <Text style={styles.statLabel}>Pro Bono Hours</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#E9D5FF' }]}>
              <Ionicons name="cash" size={20} color="#9333EA" />
            </View>
            <Text style={styles.statValue}>{privateHours}</Text>
            <Text style={styles.statLabel}>Private Hours</Text>
          </View>
        </View>

        {/* My Active Cases Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>MY ACTIVE CASES</Text>
          <Pressable onPress={() => navigation.navigate('Cases' as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {activeCases.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.casesScroll}>
            {activeCases.map((c) => {
              let parsedDesc = null;
              try {
                parsedDesc = JSON.parse(c.description || '{}');
              } catch (e) {}

              return (
                <View key={c.id} style={styles.caseCard}>
                  <View style={styles.caseHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status).bg, borderColor: getStatusColor(c.status).border }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(c.status).dot }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(c.status).text }]}>{getStatusColor(c.status).label}</Text>
                    </View>
                    <View style={[styles.typeBadge, c.lawyer_preference === 'Private' ? styles.privateBadge : styles.proBonoBadge]}>
                      <Ionicons name={c.lawyer_preference === 'Private' ? "cash-outline" : "heart-outline"} size={12} color={c.lawyer_preference === 'Private' ? "#9333EA" : theme.colors.primary} />
                      <Text style={[styles.typeText, c.lawyer_preference === 'Private' ? styles.privateText : styles.proBonoText]}>
                        {c.lawyer_preference}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(c.updated_at || c.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.casePreview} numberOfLines={2}>
                    {parsedDesc?.summary || parsedDesc?.rawInput?.description || c.description || 'No description provided'}
                  </Text>
                  <View style={styles.caseFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.locationText}>{parsedDesc?.location || parsedDesc?.rawInput?.province || 'Location Unspecified'}</Text>
                    </View>
                  </View>
                  <Pressable 
                    style={[styles.reviewBtn, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}
                    onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}
                  >
                    <Text style={[styles.reviewBtnText, { color: theme.colors.primary }]}>Manage Case</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No active cases</Text>
          </View>
        )}

        {/* Action Needed */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>DIRECT REQUESTS FOR YOU</Text>
        </View>

        {directRequests.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.casesScroll}>
            {directRequests.map((c) => {
              let parsedDesc = null;
              try {
                parsedDesc = JSON.parse(c.description || '{}');
              } catch (e) {}

              return (
                <View key={c.id} style={styles.caseCard}>
                  <View style={styles.caseHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status).bg, borderColor: getStatusColor(c.status).border }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(c.status).dot }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(c.status).text }]}>{getStatusColor(c.status).label}</Text>
                    </View>
                    <View style={[styles.typeBadge, c.lawyer_preference === 'Private' ? styles.privateBadge : styles.proBonoBadge]}>
                      <Ionicons name={c.lawyer_preference === 'Private' ? "cash-outline" : "heart-outline"} size={12} color={c.lawyer_preference === 'Private' ? "#9333EA" : theme.colors.primary} />
                      <Text style={[styles.typeText, c.lawyer_preference === 'Private' ? styles.privateText : styles.proBonoText]}>
                        {c.lawyer_preference}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(c.created_at || c.updated_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.casePreview} numberOfLines={2}>
                    {parsedDesc?.summary || parsedDesc?.rawInput?.description || c.description || 'No description provided'}
                  </Text>
                  <View style={styles.caseFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.locationText}>{parsedDesc?.location || parsedDesc?.rawInput?.province || 'Location Unspecified'}</Text>
                    </View>
                  </View>
                  <Pressable 
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}
                  >
                    <Text style={styles.reviewBtnText}>Review & Accept</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No direct requests at the moment</Text>
          </View>
        )}

        {/* Unassigned Cases Section */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>UNASSIGNED CASES</Text>
          <Pressable onPress={() => navigation.navigate('Cases' as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {unassignedCases.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.casesScroll}>
            {unassignedCases.map((c) => {
              let parsedDesc = null;
              try {
                parsedDesc = JSON.parse(c.description || '{}');
              } catch (e) {}

              return (
                <View key={c.id} style={styles.caseCard}>
                  <View style={styles.caseHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status).bg, borderColor: getStatusColor(c.status).border }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(c.status).dot }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(c.status).text }]}>{getStatusColor(c.status).label}</Text>
                    </View>
                    <View style={[styles.typeBadge, c.lawyer_preference === 'Private' ? styles.privateBadge : styles.proBonoBadge]}>
                      <Ionicons name={c.lawyer_preference === 'Private' ? "cash-outline" : "heart-outline"} size={12} color={c.lawyer_preference === 'Private' ? "#9333EA" : theme.colors.primary} />
                      <Text style={[styles.typeText, c.lawyer_preference === 'Private' ? styles.privateText : styles.proBonoText]}>
                        {c.lawyer_preference}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(c.created_at || c.updated_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.casePreview} numberOfLines={2}>
                    {parsedDesc?.summary || parsedDesc?.rawInput?.description || c.description || 'No description provided'}
                  </Text>
                  <View style={styles.caseFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.locationText}>{parsedDesc?.location || parsedDesc?.rawInput?.province || 'Location Unspecified'}</Text>
                    </View>
                  </View>
                  <Pressable 
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate('LegalCaseDetails', { caseId: c.id })}
                  >
                    <Text style={styles.reviewBtnText}>Review & Accept</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No unassigned cases available</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: 'transparent' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800' },
  avatarContainer: { width: 48, height: 48, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  tipBox: { flexDirection: 'row', backgroundColor: '#D1FAE5', padding: 12, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  tipText: { flex: 1, color: '#065F46', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  
  scrollContent: { paddingBottom: 40 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32, paddingHorizontal: 24 },
  statCard: { flex: 1, borderRadius: theme.borderRadius.xl, padding: 16, borderWidth: 1, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 24 },
  sectionTitle: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  viewAllText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  
  casesScroll: { paddingHorizontal: 24, gap: 16 },
  caseCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, width: 300 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: '#FFEDD5' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EA580C', marginRight: 6 },
  statusText: { color: '#EA580C', fontSize: 12, fontWeight: '700' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.md, gap: 4 },
  proBonoBadge: { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  privateBadge: { backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#F3E8FF' },
  typeText: { fontSize: 12, fontWeight: '700' },
  proBonoText: { color: theme.colors.primary },
  privateText: { color: '#9333EA' },
  dateText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  casePreview: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  caseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.secondary, paddingTop: 16, marginBottom: 16 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reviewBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 12, alignItems: 'center' },
  reviewBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },
  emptyState: { padding: 24, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 24, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontWeight: '500' }
});
