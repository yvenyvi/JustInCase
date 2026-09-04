import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Image, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';
import { ProfileSkeleton } from '../../components/ui/Skeleton';
import * as ImagePicker from 'expo-image-picker';

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
  expertise?: string[];
  created_at?: string;
  rating?: string | null;
  review_count?: number;
  reviews?: any[];
}

export default function LegalProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const EXPERTISE_OPTIONS = [
    'Civil Law', 'Criminal Law', 'Family Law', 
    'Corporate and Commercial Law', 'Labor and Employment Law', 
    'Taxation Law', 'Intellectual Property Law', 'Environmental Law', 
    'Public Interest and Human Rights Law', 
    'International Law and Emerging Legal Trends'
  ];
  const [isEditExpertiseVisible, setIsEditExpertiseVisible] = useState(false);
  const [editingExpertise, setEditingExpertise] = useState<string[]>([]);
  const [isSavingExpertise, setIsSavingExpertise] = useState(false);
  const [isReviewsModalVisible, setIsReviewsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'about'>('overview');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['legalProfile'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data, error } = await mobileSupabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const { data: casesData } = await mobileSupabase
        .from('cases')
        .select('feedback_rating, client_feedback, title, created_at')
        .eq('attorney_id', user.id)
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

      return { ...data, email: user.email || data.email, rating, review_count, reviews } as UserProfile;
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

  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

  const openExpertiseModal = () => {
    setEditingExpertise(profile?.expertise || []);
    setIsEditExpertiseVisible(true);
  };

  const saveExpertise = async () => {
    if (!profile) return;
    setIsSavingExpertise(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      
      const { error } = await mobileSupabase
        .from('users')
        .update({ expertise: editingExpertise })
        .eq('id', user.id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['legalProfile'] });
      setIsEditExpertiseVisible(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save expertise');
    } finally {
      setIsSavingExpertise(false);
    }
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

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const changeAvatar = async () => {
    if (!profile) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('We need gallery access to upload your avatar.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setIsUploadingAvatar(true);
      try {
        const { data: { user } } = await mobileSupabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.100.144:8000';
        const formData = new FormData();
        formData.append('email', profile.email);
        formData.append('kind', 'selfie');
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(`${API_BASE_URL}/api/legal-registration/upload-proof`, {
          method: 'POST',
          body: formData,
        });
        
        const payload = await response.json();
        if (!response.ok) {
           throw new Error(payload?.detail || 'Upload Failed');
        }

        const newAvatarUrl = payload.url;
        
        const { error } = await mobileSupabase
          .from('users')
          .update({ selfie_url: newAvatarUrl })
          .eq('id', user.id);
          
        if (error) throw error;
        
        await refetch();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to update profile picture');
      } finally {
        setIsUploadingAvatar(false);
      }
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
        <Text style={styles.headerTitle}>Attorney Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your practitioner account.</Text>
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
            <Pressable style={styles.avatar} onPress={changeAvatar} disabled={isUploadingAvatar}>
              {profile.selfie_url ? (
                <Image source={{ uri: profile.selfie_url }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
              ) : (
                <Text style={styles.avatarText}>{profile.first_name?.[0]}{profile.last_name?.[0]}</Text>
              )}
              {isUploadingAvatar ? (
                <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', borderRadius: 999, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator color="#FFF" />
                </View>
              ) : (
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primary, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: '#FFFFFF' }}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
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
                        <Pressable style={styles.editBtn} onPress={openExpertiseModal}>
                          <Ionicons name="pencil" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                      </View>
                      {profile.expertise && profile.expertise.length > 0 ? (
                        <View style={styles.expertiseContainer}>
                          {profile.expertise.map(exp => (
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

              {/* Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <Pressable style={styles.menuItem} onPress={() => navigation.navigate('Settings' as any)}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#F0FDFA' }]}>
                    <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.menuText}>Settings</Text>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Log Out</Text>
              </Pressable>
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {/* Client Reviews */}
              {(!profile.reviews || profile.reviews.length === 0) ? (
                <View style={[styles.card, { alignItems: 'center', padding: 32 }]}>
                  <Ionicons name="star-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>No Reviews Yet</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' }}>You haven't received any client reviews on your resolved cases.</Text>
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

          {/* Edit Expertise Modal */}
          <Modal visible={isEditExpertiseVisible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Your Expertise</Text>
                <Text style={styles.modalSubtitle}>Tap to select the areas of law you specialize in. This helps us match you with the right clients.</Text>
                
                <View style={styles.modalExpertiseContainer}>
                  {EXPERTISE_OPTIONS.map(opt => {
                    const isSelected = editingExpertise.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.modalExpertiseChip, isSelected && styles.modalExpertiseChipSelected]}
                        onPress={() => {
                          if (isSelected) setEditingExpertise(editingExpertise.filter(e => e !== opt));
                          else setEditingExpertise([...editingExpertise, opt]);
                        }}
                      >
                        {isSelected && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
                        <Text style={[styles.modalExpertiseChipText, isSelected && styles.modalExpertiseChipTextSelected]}>{opt}</Text>
                      </Pressable>
                    )
                  })}
                </View>

                <View style={styles.modalFooter}>
                  <Pressable style={styles.modalBtnCancel} onPress={() => setIsEditExpertiseVisible(false)}>
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.modalBtnSave} onPress={saveExpertise} disabled={isSavingExpertise}>
                    {isSavingExpertise ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnSaveText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

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
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', paddingVertical: 18, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: '#FECACA', gap: 12, marginTop: 8 },
  logoutText: { color: theme.colors.error, fontSize: 16, fontWeight: '700' },
  
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  expertiseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  expertiseBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  expertiseBadgeText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.borderRadius.md },
  tabButtonActive: { backgroundColor: '#F0FDFA' },
  tabText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  modalExpertiseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  modalExpertiseChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  modalExpertiseChipSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  modalExpertiseChipText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  modalExpertiseChipTextSelected: { color: '#FFFFFF' },
  modalFooter: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalBtnCancelText: { color: '#475569', fontWeight: '700', fontSize: 15 },
  modalBtnSave: { flex: 1, paddingVertical: 16, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  modalBtnSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
