import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import { mobileSupabase } from '../../shared/supabase';
import { useMobileAuth } from '../../shared/MobileAuthContext';
import Toast from 'react-native-toast-message';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { user } = useMobileAuth();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await mobileSupabase
        .from('notification_preferences')
        .select('push_enabled,email_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Hindi ma-load ang notification settings.' });
      } else if (data) {
        setPushNotifs(data.push_enabled);
        setEmailNotifs(data.email_enabled);
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id]);

  const savePreferences = async (pushEnabled: boolean, emailEnabled: boolean) => {
    if (!user?.id) return;
    setIsSaving(true);
    const { error } = await mobileSupabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    setIsSaving(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: 'Pakisubukang muli.' });
    }
  };

  const changePush = (value: boolean) => {
    setPushNotifs(value);
    savePreferences(value, emailNotifs);
  };

  const changeEmail = (value: boolean) => {
    setEmailNotifs(value);
    savePreferences(pushNotifs, value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructions}>Piliin kung paano mo gusto makatanggap ng mga updates at paalala.</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : <View style={styles.list}>
          <View style={styles.listItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Push Notifications</Text>
              <Text style={styles.listDesc}>Makatanggap ng alerts direkta sa iyong cellphone.</Text>
            </View>
            <Switch
              trackColor={{ false: theme.colors.border, true: '#CCFBF1' }}
              thumbColor={pushNotifs ? theme.colors.primary : theme.colors.background}
              onValueChange={changePush}
              value={pushNotifs}
              disabled={isSaving}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Email Notifications</Text>
              <Text style={styles.listDesc}>Updates sa kaso na ipapadala sa iyong email inbox.</Text>
            </View>
            <Switch
              trackColor={{ false: theme.colors.border, true: '#CCFBF1' }}
              thumbColor={emailNotifs ? theme.colors.primary : theme.colors.background}
              onValueChange={changeEmail}
              value={emailNotifs}
              disabled={isSaving}
            />
          </View>

        </View>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  instructions: { color: theme.colors.textSecondary, fontSize: 15, marginBottom: 24, lineHeight: 22 },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
  itemTextContainer: { flex: 1, paddingRight: 16 },
  listTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  listDesc: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
