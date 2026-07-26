import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          <Pressable style={styles.listItem} onPress={() => navigation.navigate('Security' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#D97706" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Security</Text>
              <Text style={styles.listDesc}>Update your password and security settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
          <View style={styles.divider} />
          
          <Pressable style={styles.listItem} onPress={() => navigation.navigate('NotificationSettings' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="notifications" size={20} color="#9333EA" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Notifications</Text>
              <Text style={styles.listDesc}>Manage alerts, emails, and pushes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.list}>
          <Pressable style={styles.listItem} onPress={() => {}}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="help-buoy" size={20} color="#0284C7" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Help & Support</Text>
              <Text style={styles.listDesc}>FAQs and customer service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.listItem} onPress={() => navigation.navigate('TermsOfService' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="document-text" size={20} color="#475569" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Terms of Service</Text>
              <Text style={styles.listDesc}>Read our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.listItem} onPress={() => navigation.navigate('PrivacyPolicy' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="shield-half" size={20} color="#475569" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Privacy Policy</Text>
              <Text style={styles.listDesc}>How we handle your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
        </View>

        <Text style={styles.versionText}>JusticeLink v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  sectionTitle: { color: '#0D9488', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4, marginTop: 24 },
  list: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemTextContainer: { flex: 1 },
  listTitle: { color: '#1E293B', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  listDesc: { color: '#64748B', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 56 },
  versionText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 32 },
});
