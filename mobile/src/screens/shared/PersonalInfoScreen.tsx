import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';

export default function PersonalInfoScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('Juan Dela Cruz');
  const [email, setEmail] = useState('juan.delacruz@justice.link');
  const [phone, setPhone] = useState('+63 912 345 6789');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Personal Information</Text>
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
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <Pressable style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
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
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: 18, alignItems: 'center', marginTop: 24, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: theme.colors.surface, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});
