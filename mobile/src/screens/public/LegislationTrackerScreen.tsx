import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';

export default function LegislationTrackerScreen() {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'house' | 'senate'>('house');
  
  const [stats, setStats] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await fetch('https://open-congress-api.bettergov.ph/api/stats');
        if (statsRes.ok) {
          const statsResult = await statsRes.json();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchBills = async () => {
      setIsLoading(true);
      try {
        const typeParam = activeTab === 'house' ? 'HB' : 'SB';
        let url = `https://open-congress-api.bettergov.ph/api/documents?type=${typeParam}&limit=20&sort=date_filed&dir=desc`;
        
        if (searchTerm.trim() !== '') {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            const mappedBills = result.data.map((b: any) => ({
              id: b.id,
              displayId: b.name || b.id,
              title: b.title || b.long_title || b.congress_website_title || b.name || 'Untitled Bill',
              status: b.status || 'Pending',
              date: b.date_filed ? b.date_filed.split('T')[0] : 'Unknown Date',
              type: activeTab
            }));
            setBills(mappedBills);
          }
        }
      } catch (err) {
        console.error('Error fetching bills:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchBills();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [activeTab, searchTerm]);

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  const filteredBills = bills;

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Legislation Tracker</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainerWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Search pending House or Senate bills..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <Text style={styles.searchHintText}>
          Data provided by the Open Congress API (BetterGov.ph)
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {stats && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_bills?.toLocaleString() || 0}</Text>
                <Text style={styles.statLabel}>Total Bills</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }]}>
                <Text style={styles.statValue}>{stats.total_house_bills?.toLocaleString() || 0}</Text>
                <Text style={styles.statLabel}>House Bills</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: theme.colors.secondary, borderLeftWidth: 4 }]}>
                <Text style={styles.statValue}>{stats.total_senate_bills?.toLocaleString() || 0}</Text>
                <Text style={styles.statLabel}>Senate Bills</Text>
              </View>
            </ScrollView>
          )}

          <View style={styles.tabsContainer}>
            <Pressable 
              style={[styles.tab, activeTab === 'house' && styles.tabActive]}
              onPress={() => setActiveTab('house')}
            >
              <Text style={[styles.tabText, activeTab === 'house' && styles.tabTextActive]}>House Bills</Text>
            </Pressable>
            <Pressable 
              style={[styles.tab, activeTab === 'senate' && styles.tabActive]}
              onPress={() => setActiveTab('senate')}
            >
              <Text style={[styles.tabText, activeTab === 'senate' && styles.tabTextActive]}>Senate Bills</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <Pressable 
                  key={bill.id} 
                  style={styles.billCard}
                  onPress={() => openUrl(`https://open-congress-api.bettergov.ph/view/documents/${bill.id}`)}
                >
                  <View style={styles.billHeader}>
                    <Text style={styles.billId}>{bill.displayId}</Text>
                    <Text style={styles.billDate}>{bill.date}</Text>
                  </View>
                  <Text style={styles.billTitle}>{bill.title}</Text>
                  <View style={styles.statusBadge}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.statusText}>{bill.status}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No bills found</Text>
                <Text style={styles.emptySubtitle}>Try searching for a different keyword or checking the other chamber.</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  searchContainerWrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: theme.colors.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, height: '100%', paddingVertical: 0 },
  searchHintText: { color: theme.colors.primary, fontSize: 12, marginTop: 8, lineHeight: 16, fontWeight: '600' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { paddingHorizontal: 24, paddingVertical: 16, gap: 12, maxHeight: 110 },
  statCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 16, minWidth: 120, borderWidth: 1, borderColor: theme.colors.border },
  statValue: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60, gap: 16 },
  billCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billId: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  billDate: { color: theme.colors.textSecondary, fontSize: 12 },
  billTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.sm, gap: 6 },
  statusText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
});
