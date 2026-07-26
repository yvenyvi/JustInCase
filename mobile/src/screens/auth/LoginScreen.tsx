import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Platform, Image, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as SecureStore from 'expo-secure-store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { mobileSupabase } from '../../shared/supabase';

type Props = NativeStackScreenProps<any>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    SecureStore.getItemAsync('didit_registration_state').then((data) => {
      if (data) {
        // Clear it so it doesn't loop forever if they back out
        SecureStore.deleteItemAsync('didit_registration_state');
        navigation.replace('Register', { resumeState: JSON.parse(data) });
      }
    }).catch(() => {});
  }, []);



  const handleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await mobileSupabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <KeyboardAwareScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent} 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />

      <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Ionicons name="link" size={32} color="#FFFFFF" style={{ position: 'absolute', transform: [{ rotate: '45deg' }] }} />
                <Ionicons name="shield-checkmark-outline" size={48} color="#FFFFFF" />
              </View>
            </View>
          </View>
          <Text style={styles.brandTitle}>JUSTICELINK</Text>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to access your secure dashboard.</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="example@email.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 50 }]}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 16, height: '100%', justifyContent: 'center' }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.forgotPasswordContainer}>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable 
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isSubmitting && styles.primaryButtonDisabled]} 
            onPress={handleLogin} 
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'SIGNING IN...' : 'LOGIN'}</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>SIGNUP</Text>
          </Pressable>


        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(13, 148, 136, 0.1)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 300, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.06)' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  
  topSection: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  logoContainer: { marginBottom: 20 },
  logoOuter: { width: 110, height: 110, borderRadius: 35, backgroundColor: 'rgba(13, 148, 136, 0.1)', alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  logoInner: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  brandTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  
  bottomSection: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: 40, paddingHorizontal: 32, paddingBottom: 40, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 20 },
  formTitle: { color: '#0F172A', fontSize: 32, fontWeight: '900', marginBottom: 8, letterSpacing: -1 },
  formSubtitle: { color: '#64748B', fontSize: 16, marginBottom: 40 },
  
  inputContainer: { marginBottom: 24 },
  inputLabel: { color: '#64748B', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#FFFFFF', color: '#0F172A', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, paddingVertical: 18, fontSize: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 32 },
  forgotPasswordText: { color: '#0D9488', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  error: { color: '#EF4444', marginBottom: 20, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  primaryButton: { backgroundColor: '#0D9488', borderRadius: 20, paddingVertical: 20, alignItems: 'center', marginBottom: 16, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  primaryButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  primaryButtonDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginBottom: 32, borderWidth: 1.5, borderColor: '#E2E8F0' },
  secondaryButtonPressed: { backgroundColor: '#F8FAFC' },
  secondaryButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  
  quickLoginContainer: { marginTop: 16, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  quickLoginTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  quickLoginScroll: { paddingBottom: 16, gap: 12 },
  quickLoginChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  quickLoginChipText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
});