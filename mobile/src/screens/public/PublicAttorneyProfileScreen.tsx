import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../shared/theme';
import { ProfileSkeleton } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AttorneyProfileRouteProp = RouteProp<RootStackParamList, 'PublicAttorneyProfile'>;

interface UserProfile {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  handle: string;
  date_of_birth?: string;
  sex?: string;
  phone_number?: string;
  region?: string;
  province?: string;
  city_municipality?: string;
  barangay?: string;
  street_address?: string;
  is_didit_verified?: boolean;
  status_verification?: string;
  id_picture_url?: string;
  selfie_url?: string;
  firm_name?: string;
  ibp_number?: string;
  roll_number?: string;
  pro_bono_period_start?: string;
  role?: string;
  expertise?: string[];
  created_at?: string;
  rating?: string | null;
  review_count?: number;
  reviews?: any[];
}

export default function PublicAttorneyProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AttorneyProfileRouteProp>();
  const attorneyId = route.params.attorneyId;

  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'about'>('overview');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['publicAttorneyProfile', attorneyId],
    queryFn: async () => {
      const { data, error } = await mobileSupabase
        .from('users')
        .select('*')
        .eq('id', attorneyId)
        .single();
      
      const { data: casesData } = await mobileSupabase
        .from('cases')
        .select('feedback_rating, client_feedback, title, created_at')
        .eq('attorney_id', attorneyId)
        .not('feedback_rating', 'is', null)
        .order('created_at', { ascending: false });

      let rating = null;
      let review_count = 0;
      let reviews: any[] = [];
      if (casesData && casesData.length > 0) {
        review_count = casesData.length;
        const sum = casesData.reduce((acc, curr) => acc + (curr.feedback_rating || 0), 0);
        rating = (sum / review_count).toFixed(1);
        reviews = casesData;
      }

      return { ...data, rating, review_count, reviews } as UserProfile;
    }
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isVerified = profile?.is_didit_verified || profile?.status_verification === 'verified';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not specified';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name, profile?.suffix]
    .filter(Boolean).join(' ');

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#64748B" style={styles.infoIcon} />
      <View style={styles.flex1}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Attorney Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ProfileSkeleton />
        </ScrollView>
      ) : profile ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {profile.selfie_url ? (
                <Image source={{ uri: profile.selfie_url }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
              ) : (
                <Text style={styles.avatarText}>{profile.first_name?.[0]}{profile.last_name?.[0]}</Text>
              )}
            </View>
            <Text style={styles.name}>Atty. {fullName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.handle}>@{profile.handle}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={[styles.verificationBadge, isVerified ? styles.badgeVerified : styles.badgeUnverified, { marginTop: 0 }]}>
                <Ionicons name={isVerified ? "shield-checkmark" : "shield-half"} size={14} color={isVerified ? "#15803D" : "#B45309"} />
                <Text style={[styles.verificationText, isVerified ? styles.textVerified : styles.textUnverified]}>
                  {isVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
              
              {profile.rating ? (
                <View style={[styles.verificationBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', marginTop: 0 }]}>
                  <Ionicons name="star" size={14} color="#D97706" />
                  <Text style={[styles.verificationText, { color: '#92400E' }]}>{profile.rating} ({profile.review_count})</Text>
                </View>
              ) : (
                <View style={[styles.verificationBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', marginTop: 0 }]}>
                  <Ionicons name="star-outline" size={14} color="#64748B" />
                  <Text style={[styles.verificationText, { color: '#475569' }]}>New</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <Pressable style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]} onPress={() => setActiveTab('overview')}>
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
            </Pressable>
            <Pressable style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]} onPress={() => setActiveTab('reviews')}>
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>Reviews</Text>
            </Pressable>
            <Pressable style={[styles.tabButton, activeTab === 'about' && styles.tabButtonActive]} onPress={() => setActiveTab('about')}>
              <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text>
            </Pressable>
          </View>

          {activeTab === 'overview' && (
            <View>
              {/* Professional Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFESSIONAL DETAILS</Text>
                <View style={styles.card}>
                  <InfoRow icon="business-outline" label="Law Firm" value={profile.firm_name || 'Independent Practice'} />
                  <View style={styles.divider} />
                  <InfoRow icon="ribbon-outline" label="Roll of Attorneys No." value={profile.roll_number || 'Not specified'} />
                  <View style={styles.divider} />
                  <InfoRow icon="card-outline" label="IBP Number" value={profile.ibp_number || 'Not specified'} />
                  <View style={styles.divider} />
                  <InfoRow icon="time-outline" label="Pro-Bono Period Start" value={formatDate(profile.pro_bono_period_start)} />
                  <View style={styles.divider} />
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={20} color="#64748B" style={styles.infoIcon} />
                    <View style={styles.flex1}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={styles.infoLabel}>Areas of Expertise</Text>
                      </View>
                      {profile.expertise && profile.expertise.length > 0 ? (
                        <View style={styles.expertiseContainer}>
                          {profile.expertise.map((exp: string) => (
                            <View key={exp} style={styles.expertiseBadge}>
                              <Text style={styles.expertiseBadgeText}>{exp}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.infoValue}>Not specified</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {/* Client Reviews */}
              {(!profile.reviews || profile.reviews.length === 0) ? (
                <View style={[styles.card, { alignItems: 'center', padding: 32 }]}>
                  <Ionicons name="star-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>No Reviews Yet</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' }}>This attorney hasn't received any client reviews yet.</Text>
                </View>
              ) : (
                <View style={styles.section}>
                  {profile.reviews.map((rev, index) => (
                    <View key={index} style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="person" size={20} color="#94A3B8" />
                          </View>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{rev.title}</Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{formatDate(rev.created_at)}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Ionicons name="star" size={12} color="#D97706" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E', marginLeft: 4 }}>{rev.feedback_rating}.0</Text>
                        </View>
                      </View>
                      {rev.client_feedback && (
                        <View style={{ position: 'relative', marginTop: 4 }}>
                          <Ionicons name="chatbox-ellipses" size={24} color="#E2E8F0" style={{ position: 'absolute', top: -4, left: -4, opacity: 0.8 }} />
                          <Text style={{ fontSize: 14, color: '#334155', lineHeight: 22, fontStyle: 'italic', paddingLeft: 10, paddingTop: 6, zIndex: 1 }}>
                            "{rev.client_feedback}"
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'about' && (
            <View>
              {/* Personal Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CONTACT DETAILS</Text>
                <View style={styles.card}>
                  <InfoRow icon="call-outline" label="Phone Number" value={profile.phone_number || 'Not specified'} />
                  <View style={styles.divider} />
                  <InfoRow icon="mail-outline" label="Email Address" value={profile.email} />
                  <View style={styles.divider} />
                  <InfoRow icon="location-outline" label="Office Location" value={[profile.street_address, profile.barangay, profile.city_municipality, profile.province].filter(Boolean).join(', ') || 'Not specified'} />
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      ) : (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Unable to load profile data.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.textSecondary, fontSize: 16 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  avatarText: { color: theme.colors.surface, fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  name: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  email: { color: theme.colors.textSecondary, fontSize: 15, marginBottom: 2 },
  handle: { color: theme.colors.primary, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  
  verificationBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.xl, gap: 6 },
  badgeVerified: { backgroundColor: '#DCFCE7' },
  badgeUnverified: { backgroundColor: '#FEF3C7' },
  verificationText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  textVerified: { color: '#15803D' },
  textUnverified: { color: '#B45309' },

  section: { marginBottom: 28 },
  sectionTitle: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 20, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 16 },
  flex1: { flex: 1 },
  infoLabel: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 4 },
  infoValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },

  expertiseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  expertiseBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  expertiseBadgeText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.borderRadius.md },
  tabButtonActive: { backgroundColor: '#F0FDFA' },
  tabText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '700' },
});
