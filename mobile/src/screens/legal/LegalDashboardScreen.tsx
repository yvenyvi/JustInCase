import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LegalDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [firstName, setFirstName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [proBonoHours, setProBonoHours] = useState(0);
  const [privateHours, setPrivateHours] = useState(0);
  const [directRequests, setDirectRequests] = useState<any[]>([]);
  const [unassignedCases, setUnassignedCases] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await mobileSupabase.auth.getUser();
        if (!user) return;

        // Fetch user name
        const { data: userData } = await mobileSupabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single();
        
        setFirstName(userData?.first_name || 'Attorney');

        // Fetch active cases for this attorney
        const { count } = await mobileSupabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('attorney_id', user.id)
          .in('status', ['In Progress', 'in_progress', 'Accepted']);
        
        setActiveCasesCount(count || 0);

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
        
        if (directData) {
          setDirectRequests(directData);
        }

        // Fetch Unassigned Cases (Open Pool)
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
        
        if (unassignedData) {
          setUnassignedCases(unassignedData);
        }

        // Fetch time logs for hours
        const { data: logsData } = await mobileSupabase
          .from('pro_bono_logs')
          .select(`
            hours, 
            cases (lawyer_preference)
          `)
          .eq('attorney_id', user.id);
        
        let pBono = 0;
        let pPrivate = 0;
        
        if (logsData) {
          logsData.forEach((log: any) => {
            const pref = log.cases?.lawyer_preference;
            if (pref === 'Private') {
              pPrivate += (log.hours || 0);
            } else {
              pBono += (log.hours || 0);
            }
          });
        }
        setProBonoHours(pBono);
        setPrivateHours(pPrivate);

      } catch (err) {
        console.error('Error fetching legal dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
               <ActivityIndicator size="small" color="#0D9488" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : (
              <Text style={styles.name}>Atty. {firstName}</Text>
            )}
          </View>
          <Pressable style={styles.avatarContainer} onPress={() => navigation.navigate('Profile' as any)}>
            <Ionicons name="person" size={24} color="#0D9488" />
          </Pressable>
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

        {/* Action Needed */}
        <View style={styles.sectionHeader}>
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
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{c.status}</Text>
                    </View>
                    <View style={[styles.typeBadge, c.lawyer_preference === 'Private' ? styles.privateBadge : styles.proBonoBadge]}>
                      <Ionicons name={c.lawyer_preference === 'Private' ? "cash-outline" : "heart-outline"} size={12} color={c.lawyer_preference === 'Private' ? "#9333EA" : "#0D9488"} />
                      <Text style={[styles.typeText, c.lawyer_preference === 'Private' ? styles.privateText : styles.proBonoText]}>
                        {c.lawyer_preference}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(c.created_at || c.updated_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.casePreview} numberOfLines={2}>
                    {parsedDesc && parsedDesc.isJsonFormat ? parsedDesc.rawInput.description : c.description || 'No description provided'}
                  </Text>
                  <View style={styles.caseFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.locationText}>{parsedDesc?.rawInput?.province || 'Location Unspecified'}</Text>
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
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{c.status}</Text>
                    </View>
                    <View style={[styles.typeBadge, c.lawyer_preference === 'Private' ? styles.privateBadge : styles.proBonoBadge]}>
                      <Ionicons name={c.lawyer_preference === 'Private' ? "cash-outline" : "heart-outline"} size={12} color={c.lawyer_preference === 'Private' ? "#9333EA" : "#0D9488"} />
                      <Text style={[styles.typeText, c.lawyer_preference === 'Private' ? styles.privateText : styles.proBonoText]}>
                        {c.lawyer_preference}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(c.created_at || c.updated_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.casePreview} numberOfLines={2}>
                    {parsedDesc && parsedDesc.isJsonFormat ? parsedDesc.rawInput.description : c.description || 'No description provided'}
                  </Text>
                  <View style={styles.caseFooter}>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.locationText}>{parsedDesc?.rawInput?.province || 'Location Unspecified'}</Text>
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
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: 'transparent' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: '#64748B', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: '#1E293B', fontSize: 24, fontWeight: '800' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  tipBox: { flexDirection: 'row', backgroundColor: '#D1FAE5', padding: 12, borderRadius: 12, alignItems: 'center' },
  tipText: { flex: 1, color: '#065F46', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  
  scrollContent: { paddingBottom: 40 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32, paddingHorizontal: 24 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 24 },
  sectionTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  viewAllText: { color: '#0D9488', fontSize: 13, fontWeight: '700' },
  
  casesScroll: { paddingHorizontal: 24, gap: 16 },
  caseCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, width: 300 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EA580C', marginRight: 6 },
  statusText: { color: '#EA580C', fontSize: 12, fontWeight: '700' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  proBonoBadge: { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  privateBadge: { backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#F3E8FF' },
  typeText: { fontSize: 12, fontWeight: '700' },
  proBonoText: { color: '#0D9488' },
  privateText: { color: '#9333EA' },
  dateText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  caseTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  casePreview: { color: '#475569', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  caseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginBottom: 16 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  reviewBtn: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  reviewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyState: { padding: 24, alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { color: '#64748B', marginTop: 12, fontWeight: '500' }
});
