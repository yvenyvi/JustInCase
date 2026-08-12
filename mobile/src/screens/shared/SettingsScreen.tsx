import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../shared/theme';

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
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondary }]}>
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
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondary }]}>
              <Ionicons name="shield-half" size={20} color="#475569" />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Privacy Policy</Text>
              <Text style={styles.listDesc}>How we handle your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </Pressable>
        </View>

        <Text style={styles.versionText}>LAYA v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: theme.colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  sectionTitle: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4, marginTop: 24 },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.border },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemTextContainer: { flex: 1 },
  listTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  listDesc: { color: theme.colors.textSecondary, fontSize: 13 },
  divider: { height: 1, backgroundColor: theme.colors.secondary, marginLeft: 56 },
  versionText: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 13, marginTop: 32 },
});
