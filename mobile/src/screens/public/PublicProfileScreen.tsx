import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  id_number?: string;
  expiration_date?: string;
  role?: string;
  created_at?: string;
}

export default function PublicProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['publicProfile'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const authMeta = user.user_metadata || {};
      const { data, error } = await mobileSupabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;

      return {
        profile: { ...data, email: user.email || data.email } as UserProfile,
        authMeta
      };
    }
  });

  const profile = profileData?.profile || null;
  const authMeta = profileData?.authMeta || null;

  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

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

  const fullAddress = [
    profile?.street_address,
    profile?.barangay,
    profile?.city_municipality,
    profile?.province,
    profile?.region,
  ].filter(Boolean).join(', ') || 'Not specified';

  // Some fields like sex, id_number, expiration_date may only be in auth metadata
  const sex = profile?.sex || authMeta?.sex;
  const idNumber = profile?.id_number || authMeta?.id_number;
  const expirationDate = profile?.expiration_date || authMeta?.expiration_date;

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
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Pamahalaan ang iyong account.</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.first_name?.[0]}{profile.last_name?.[0]}</Text>
            </View>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.handle}>@{profile.handle}</Text>

            <View style={[styles.verificationBadge, isVerified ? styles.badgeVerified : styles.badgeUnverified]}>
              <Ionicons name={isVerified ? "shield-checkmark" : "shield-half"} size={14} color={isVerified ? "#15803D" : "#B45309"} />
              <Text style={[styles.verificationText, isVerified ? styles.textVerified : styles.textUnverified]}>
                {isVerified ? 'Verified Account' : 'Unverified Account'}
              </Text>
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
            <View style={styles.card}>
              <InfoRow icon="person-outline" label="Full Name" value={fullName} />
              <View style={styles.divider} />
              <InfoRow icon="calendar-outline" label="Date of Birth" value={formatDate(profile.date_of_birth)} />
              {sex && (
                <>
                  <View style={styles.divider} />
                  <InfoRow icon="male-female-outline" label="Sex" value={sex} />
                </>
              )}
              <View style={styles.divider} />
              <InfoRow icon="call-outline" label="Phone Number" value={profile.phone_number || 'Not specified'} />
              <View style={styles.divider} />
              <InfoRow icon="mail-outline" label="Email Address" value={profile.email} />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS</Text>
            <View style={styles.card}>
              {profile.street_address && (
                <>
                  <InfoRow icon="home-outline" label="Street / House No." value={profile.street_address} />
                  <View style={styles.divider} />
                </>
              )}
              <InfoRow icon="location-outline" label="Barangay" value={profile.barangay || 'Not specified'} />
              <View style={styles.divider} />
              <InfoRow icon="business-outline" label="City / Municipality" value={profile.city_municipality || 'Not specified'} />
              <View style={styles.divider} />
              <InfoRow icon="map-outline" label="Province" value={profile.province || 'Not specified'} />
              <View style={styles.divider} />
              <InfoRow icon="globe-outline" label="Region" value={profile.region || 'Not specified'} />
            </View>
          </View>

          {/* ID Details */}
          {(idNumber || expirationDate) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ID DETAILS</Text>
              <View style={styles.card}>
                {idNumber && (
                  <InfoRow icon="card-outline" label="ID Number / Code" value={idNumber} />
                )}
                {idNumber && expirationDate && <View style={styles.divider} />}
                {expirationDate && (
                  <InfoRow icon="time-outline" label="ID Expiration Date" value={formatDate(expirationDate)} />
                )}
              </View>
            </View>
          )}

          {/* Uploaded Documents */}
          {(profile.id_picture_url || profile.selfie_url) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>UPLOADED DOCUMENTS</Text>
              <View style={styles.card}>
                {profile.id_picture_url && (
                  <View style={styles.documentItem}>
                    <Text style={styles.infoLabel}>Valid ID</Text>
                    <Image source={{ uri: profile.id_picture_url }} style={styles.documentImage} resizeMode="cover" />
                  </View>
                )}
                {profile.id_picture_url && profile.selfie_url && <View style={styles.divider} />}
                {profile.selfie_url && (
                  <View style={styles.documentItem}>
                    <Text style={styles.infoLabel}>Selfie Verification</Text>
                    <Image source={{ uri: profile.selfie_url }} style={styles.documentImage} resizeMode="cover" />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            
            <Pressable style={styles.menuItem} onPress={() => navigation.navigate('PublicMyDocuments' as any)}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuText}>My Documents</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
            
            <Pressable style={styles.menuItem} onPress={() => navigation.navigate('Settings' as any)}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="settings-outline" size={20} color="#64748B" />
              </View>
              <Text style={styles.menuText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>
            <View style={styles.card}>
              <InfoRow icon="shield-outline" label="Role" value={profile.role || 'Citizen'} />
              <View style={styles.divider} />
              <InfoRow icon="calendar-number-outline" label="Member Since" value={formatDate(profile.created_at)} />
            </View>
          </View>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
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
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, backgroundColor: 'transparent' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: theme.colors.textSecondary, fontSize: 15 },
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

  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: theme.borderRadius.lg, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  menuIconContainer: { width: 40, height: 40, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuText: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, fontWeight: '500' },
  
  documentItem: { gap: 12 },
  documentImage: { width: '100%', height: 200, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.secondary },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', paddingVertical: 18, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: '#FECACA', gap: 12, marginTop: 8 },
  logoutText: { color: theme.colors.error, fontSize: 16, fontWeight: '700' },
});
