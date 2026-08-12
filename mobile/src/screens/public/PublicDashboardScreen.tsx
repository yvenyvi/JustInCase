import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { Card } from '../../components/ui/Card';
import { theme } from '../../shared/theme';
import { NotificationBell } from '../../components/ui/NotificationBell';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PublicDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [firstName, setFirstName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [randomTip, setRandomTip] = useState<string>('');
  const [activeCase, setActiveCase] = useState<any>(null);

  const TIPS = [
    "Did you know? You have the right to a safe working environment under the Labor Code.",
    "Did you know? You have the right to remain silent when being questioned by authorities.",
    "Did you know? Your employer must pay your final pay within 30 days of resignation.",
    "Did you know? Maternity leave in the Philippines is 105 days with full pay.",
    "Did you know? You have the right to seek legal counsel of your own choice."
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!isMounted) return;
      try {
        const { data: { user } } = await mobileSupabase.auth.getUser();
        if (!user) return;

        // Fetch user name
        const { data: userData } = await mobileSupabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single();
        
        setFirstName(userData?.first_name || 'Citizen');

        // Fetch most recent active case for this user
        const { data: caseData } = await mobileSupabase
          .from('cases')
          .select(`
            id, 
            title, 
            status, 
            updated_at, 
            attorney:users!cases_attorney_id_fkey(first_name, last_name)
          `)
          .eq('client_id', user.id)
          .in('status', ['Pending Triage', 'Pending Acceptance', 'In Progress', 'Hearing Scheduled', 'Demand Sent'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (isMounted) {
          if (caseData) setActiveCase(caseData);
          else setActiveCase(null);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setFirstName('Citizen');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    setRandomTip(TIPS[Math.floor(Math.random() * TIPS.length)]);

    const subscription = mobileSupabase
      .channel('public-dashboard-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        if (isMounted) fetchData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress': case 'in progress': return { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', text: '#16A34A', label: 'In Progress' };
      case 'demand sent': case 'hearing scheduled': return { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', text: '#2563EB', label: status };
      case 'pending': return { bg: '#FFF7ED', border: '#FED7AA', dot: '#EA580C', text: '#EA580C', label: 'Pending' };
      case 'closed': case 'resolved': return { bg: theme.colors.secondary, border: '#CBD5E1', dot: theme.colors.textSecondary, text: theme.colors.textSecondary, label: 'Closed' };
      default: return { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', text: '#16A34A', label: status || 'Active' };
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
            <Text style={styles.greeting}>Magandang Araw,</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : (
              <Text style={styles.name}>{firstName}</Text>
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
          <Ionicons name="bulb-outline" size={20} color={theme.colors.warning} style={{ marginRight: 8 }} />
          <Text style={styles.tipText}>{randomTip}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero CTA */}
        <Pressable 
          style={styles.heroCard}
          onPress={() => navigation.navigate('PublicTriage')}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Kailangan mo ba ng legal na tulong?</Text>
            <Text style={styles.heroSubtitle}>Sagutin ang ilang katanungan para mahanap ang tamang abogado para sa iyo.</Text>
            <View style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>Simulan Ngayon</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
            </View>
          </View>
          <Ionicons name="shield-checkmark" size={64} color="rgba(255,255,255,0.2)" style={styles.heroIconBg} />
        </Pressable>

        {/* Quick Tools */}
        <Text style={styles.sectionTitle}>MGA TOOLS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickToolsScroll}>
          <Card style={styles.toolCard}>
            <Pressable onPress={() => navigation.navigate('PublicDocumentGenerator')} style={styles.toolCardInner}>
              <View style={[styles.toolIconContainer, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="document-text" size={24} color="#16A34A" />
              </View>
              <Text style={styles.toolText}>Legal Docs</Text>
            </Pressable>
          </Card>
          <Card style={styles.toolCard}>
            <Pressable onPress={() => navigation.navigate('PublicRightsLibrary')} style={styles.toolCardInner}>
              <View style={[styles.toolIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="library" size={24} color="#2563EB" />
              </View>
              <Text style={styles.toolText}>Rights Library</Text>
            </Pressable>
          </Card>
          <Card style={styles.toolCard}>
            <Pressable onPress={() => navigation.navigate('PublicNotifications')} style={styles.toolCardInner}>
              <View style={[styles.toolIconContainer, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="notifications" size={24} color="#EA580C" />
              </View>
              <Text style={styles.toolText}>Updates</Text>
            </Pressable>
          </Card>
        </ScrollView>

        {/* Active Case Widget */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE CASE</Text>
          <Pressable onPress={() => navigation.navigate('Cases' as any)}>
            <Text style={styles.seeAllText}>Tingnan Lahat</Text>
          </Pressable>
        </View>

        {activeCase ? (
          <Card style={styles.caseWidget}>
            <Pressable onPress={() => navigation.navigate('CaseDetails', { caseId: activeCase.id })}>
              <View style={styles.caseWidgetHeader}>
                <View style={[styles.statusPill, { backgroundColor: getStatusColor(activeCase.status).bg, borderColor: getStatusColor(activeCase.status).border }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(activeCase.status).dot }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(activeCase.status).text }]}>{getStatusColor(activeCase.status).label}</Text>
                </View>
                <Text style={styles.caseDate}>
                  {activeCase.updated_at ? `Updated ${new Date(activeCase.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                </Text>
              </View>
              <Text style={styles.caseTitle}>{activeCase.title}</Text>
              <View style={styles.caseWidgetFooter}>
                <View style={styles.caseAtty}>
                  <Ionicons name="person-circle-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.attyName}>
                    {activeCase.attorney ? `Atty. ${activeCase.attorney.first_name} ${activeCase.attorney.last_name}`.trim() : 'Pending Assignment'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
              </View>
            </Pressable>
          </Card>
        ) : (
          <Card style={[styles.caseWidget, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="folder-open-outline" size={40} color={theme.colors.border} style={{ marginBottom: 12 }} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>No Active Cases</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>Your cases will appear here once you file a request.</Text>
          </Card>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.xl, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: 'transparent' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800' },
  avatarContainer: { width: 48, height: 48, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  tipBox: { flexDirection: 'row', backgroundColor: 'rgba(254, 243, 199, 0.7)', padding: 12, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  tipText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  heroCard: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, padding: 24, position: 'relative', overflow: 'hidden', marginBottom: 32, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  heroContent: { position: 'relative', zIndex: 2 },
  heroTitle: { color: theme.colors.surface, fontSize: 22, fontWeight: '800', marginBottom: 8, width: '80%' },
  heroSubtitle: { color: '#CCFBF1', fontSize: 14, lineHeight: 20, marginBottom: 24, width: '85%' },
  heroBtn: { backgroundColor: theme.colors.surface, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  heroIconBg: { position: 'absolute', right: -10, bottom: -10, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  seeAllText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  quickToolsScroll: { gap: 12, paddingBottom: 32 },
  toolCard: { width: 110, padding: 0, marginRight: 12 },
  toolCardInner: { padding: 16, alignItems: 'center' },
  toolIconContainer: { width: 48, height: 48, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  toolText: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  caseWidget: { padding: 0 },
  caseWidgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 20, paddingBottom: 0 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: '#BBF7D0' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', marginRight: 6 },
  statusText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },
  caseDate: { color: theme.colors.textSecondary, fontSize: 12 },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16, paddingHorizontal: 20 },
  caseWidgetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.secondary },
  caseAtty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attyName: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
});