import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';

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
  firm_name?: string;
  ibp_number?: string;
  roll_number?: string;
  pro_bono_period_start?: string;
  role?: string;
  created_at?: string;
}

export default function LegalProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await mobileSupabase.auth.getUser();
        if (user) {
          const { data, error } = await mobileSupabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setProfile({ ...data, email: user.email || data.email });
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attorney Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your practitioner account.</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.first_name?.[0]}{profile.last_name?.[0]}</Text>
            </View>
            <Text style={styles.name}>Atty. {fullName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.handle}>@{profile.handle}</Text>

            <View style={[styles.verificationBadge, isVerified ? styles.badgeVerified : styles.badgeUnverified]}>
              <Ionicons name={isVerified ? "shield-checkmark" : "shield-half"} size={14} color={isVerified ? "#15803D" : "#B45309"} />
              <Text style={[styles.verificationText, isVerified ? styles.textVerified : styles.textUnverified]}>
                {isVerified ? 'Verified Attorney' : 'Unverified Attorney'}
              </Text>
            </View>
          </View>

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
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
            <View style={styles.card}>
              <InfoRow icon="call-outline" label="Phone Number" value={profile.phone_number || 'Not specified'} />
              <View style={styles.divider} />
              <InfoRow icon="mail-outline" label="Email Address" value={profile.email} />
              <View style={styles.divider} />
              <InfoRow icon="location-outline" label="Office Location" value={`${profile.city_municipality || ''}, ${profile.province || ''}`.replace(/^, | , $/g, '') || 'Not specified'} />
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <Pressable style={styles.menuItem} onPress={() => navigation.navigate('Settings' as any)}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="settings-outline" size={20} color="#0D9488" />
              </View>
              <Text style={styles.menuText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { color: '#1E293B', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: '#64748B', fontSize: 15 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#64748B', fontSize: 16 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  name: { color: '#1E293B', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  email: { color: '#64748B', fontSize: 15, marginBottom: 2 },
  handle: { color: '#0D9488', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  
  verificationBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  badgeVerified: { backgroundColor: '#DCFCE7' },
  badgeUnverified: { backgroundColor: '#FEF3C7' },
  verificationText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  textVerified: { color: '#15803D' },
  textUnverified: { color: '#B45309' },

  section: { marginBottom: 28 },
  sectionTitle: { color: '#0D9488', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 16 },
  flex1: { flex: 1 },
  infoLabel: { color: '#64748B', fontSize: 13, marginBottom: 4 },
  infoValue: { color: '#1E293B', fontSize: 16, fontWeight: '500', lineHeight: 24 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },

  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuText: { flex: 1, color: '#1E293B', fontSize: 16, fontWeight: '500' },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', gap: 12, marginTop: 8 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
