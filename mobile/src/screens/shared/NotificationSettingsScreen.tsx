import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);


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

        <View style={styles.list}>
          <View style={styles.listItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Push Notifications</Text>
              <Text style={styles.listDesc}>Makatanggap ng alerts direkta sa iyong cellphone.</Text>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#CCFBF1' }}
              thumbColor={pushNotifs ? '#0D9488' : '#F8FAFC'}
              onValueChange={setPushNotifs}
              value={pushNotifs}
            />
          </View>

          <View style={styles.listItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.listTitle}>Email Notifications</Text>
              <Text style={styles.listDesc}>Updates sa kaso na ipapadala sa iyong email inbox.</Text>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: '#CCFBF1' }}
              thumbColor={emailNotifs ? '#0D9488' : '#F8FAFC'}
              onValueChange={setEmailNotifs}
              value={emailNotifs}
            />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  instructions: { color: '#64748B', fontSize: 15, marginBottom: 24, lineHeight: 22 },
  list: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemTextContainer: { flex: 1, paddingRight: 16 },
  listTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  listDesc: { color: '#64748B', fontSize: 13, lineHeight: 18 },
});
