import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function SecurityScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Security & Password</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput style={styles.input} secureTextEntry placeholder="••••••" placeholderTextColor="#94A3B8" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput style={styles.input} secureTextEntry placeholder="••••••" placeholderTextColor="#94A3B8" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput style={styles.input} secureTextEntry placeholder="••••••" placeholderTextColor="#94A3B8" />
        </View>

        <Pressable style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Update Password</Text>
        </Pressable>


      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { color: '#64748B', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FFFFFF', color: '#1E293B', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  saveBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  saveBtnText: { color: '#1E293B', fontWeight: '800', fontSize: 16, letterSpacing: 1 },

});
