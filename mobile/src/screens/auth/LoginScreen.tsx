import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, Image, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as SecureStore from 'expo-secure-store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { mobileSupabase } from '../../shared/supabase';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { Card } from '../../components/ui/Card';
import { theme } from '../../shared/theme';

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
          <Text style={styles.brandTitle}>LAYA</Text>
        </View>

        <Card style={styles.bottomSection}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to access your secure dashboard.</Text>
          
          <InputField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
          />

          <InputField
            label="Password"
            placeholder="••••••"
            isPassword
            value={password}
            onChangeText={setPassword}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.forgotPasswordContainer}>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Button 
            title={isSubmitting ? 'SIGNING IN...' : 'LOGIN'} 
            onPress={handleLogin} 
            disabled={isSubmitting}
            style={{ marginBottom: 16 }}
          />

          <Button 
            title="SIGNUP" 
            variant="outline"
            onPress={() => navigation.navigate('Register')}
            style={{ marginBottom: 32 }}
          />

        </Card>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.primaryLight, transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 300, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.primaryLight, opacity: 0.5 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  
  topSection: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  logoContainer: { marginBottom: 20 },
  logoOuter: { width: 110, height: 110, borderRadius: 35, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', ...theme.shadows.soft },
  logoInner: { width: 80, height: 80, borderRadius: 25, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  brandTitle: { ...theme.typography.heading, color: theme.colors.textPrimary, fontSize: 26, letterSpacing: 2 },
  
  bottomSection: { borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: 40, paddingHorizontal: 32, paddingBottom: 40, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  formTitle: { ...theme.typography.heading, fontSize: 32, marginBottom: 8, letterSpacing: -1 },
  formSubtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: 40 },
  
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 32 },
  forgotPasswordText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  error: { color: theme.colors.error, marginBottom: 20, textAlign: 'center', fontSize: 14, fontWeight: '500' },
});
