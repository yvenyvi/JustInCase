import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Image, Platform, ImageBackground } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);

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
        <ImageBackground 
          source={require('../../assets/auth_bg.png')} 
          style={styles.topSection}
          imageStyle={styles.topSectionBackground}
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>JUSTICELINK</Text>
        </ImageBackground>

        <View style={styles.bottomSection}>
          <Text style={styles.formTitle}>Reset Password</Text>
          <Text style={styles.formSubtitle}>Enter your email to receive recovery instructions.</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="example@email.com"
              placeholderTextColor="#94A3B8"
              style={[styles.input, isFocusedEmail && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsFocusedEmail(true)}
              onBlur={() => setIsFocusedEmail(false)}
            />
          </View>

          <Pressable 
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]} 
          >
            <Text style={styles.primaryButtonText}>SEND RESET LINK</Text>
          </Pressable>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A111F',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 200,
  },
  topSectionBackground: {
    opacity: 0.6,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 12,
    borderRadius: 16,
  },
  brandTitle: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  formTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#D4AF37',
    borderWidth: 2,
    paddingHorizontal: 19,
    paddingVertical: 15,
  },
  primaryButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    backgroundColor: '#B99320',
  },
  primaryButtonText: {
    color: '#0A111F',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#64748B',
    fontSize: 14,
  },
  loginLink: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});