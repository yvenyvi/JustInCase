import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';

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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  saveBtn: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, paddingVertical: 18, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  saveBtnText: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 16, letterSpacing: 1 },

});
