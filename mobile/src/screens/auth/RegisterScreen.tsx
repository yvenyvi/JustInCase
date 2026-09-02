import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as SecureStore from 'expo-secure-store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import { mobileSupabase } from '../../shared/supabase';
import { createClient } from '@supabase/supabase-js';
import AddressPicker from '../../components/AddressPicker';
import { theme } from '../../shared/theme';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<any>;

// Step 1: Email + Password
// Step 2: ID Scan instructions (before launching Didit)
// Step 3: Didit waiting / polling screen
// Step 4: Review OCR-extracted details + finalize
// Step 4: Review OCR-extracted details + finalize
// Step 5: Success screen
type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 4;

export default function RegisterScreen({ navigation, route }: Props) {
  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'citizen' | 'lawyer'>('citizen');
  const [rollNumber, setRollNumber] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const EXPERTISE_OPTIONS = ['Labor Law', 'Family Law', 'Criminal Defense', 'Civil Law', 'Property Law', 'Corporate Law'];

  // ── Didit / flow state ─────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isStartingDidit, setIsStartingDidit] = useState(false);
  const [diditStatus, setDiditStatus] = useState<'idle' | 'pending' | 'verified' | 'failed'>('idle');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── OCR / Step 4 state ─────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [imageUrls, setImageUrls] = useState<any>(null);

  // ── Lawyer Upload State ────────────────────────────────────────────────────
  const [localIdImage, setLocalIdImage] = useState<string | null>(null);
  const [localSelfieImage, setLocalSelfieImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Validation State ───────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Resume logic (if app crashed and restarted during verification) ────────
  useEffect(() => {
    const resumeState = route.params?.resumeState as any;
    if (resumeState) {
      setAttemptId(resumeState.attemptId);
      setEmail(resumeState.email);
      setPassword(resumeState.password);
      setAccountType(resumeState.accountType);
      setRollNumber(resumeState.rollNumber || '');
      setExpertise(resumeState.expertise || []);
      setVerificationUrl(resumeState.verificationUrl || '');
      setStep(resumeState.step || 3);
      setDiditStatus('pending');
      pollDiditStatus(resumeState.attemptId);
    }
  }, [route.params?.resumeState]);

  // Backend URL — uses .env or current LAN IP for physical devices + emulators
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.21:8000';

  // ── Deep-link listener: app re-opened from external browser ───────────────
  useEffect(() => {
    const handleURL = (event: { url: string }) => {
      // When the user taps "Return to App" in the browser redirect page,
      // app is foregrounded. If we already have a pending poll, just let
      // it resolve on its own. The listener is the safety net for triggering
      // a manual re-poll immediately.
      if (attemptId && diditStatus === 'pending') {
        pollDiditStatus(attemptId, 0);
      }
    };
    const sub = Linking.addEventListener('url', handleURL);
    return () => sub.remove();
  }, [attemptId, diditStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // ── Step 1 → 2: Start session, navigate to Scan Instructions ──────────────
  const handleStepOne = async () => {
    let newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = 'Invalid email format';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    if (accountType === 'lawyer') {
      setStep(2);
      return;
    }

    setIsStartingDidit(true);
    try {
      const returnUrl = Linking.createURL('register');
      const response = await fetch(`${apiBaseUrl}/api/public-registration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), returnUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Could not start verification.');
      setAttemptId(payload.attemptId);
      if (payload.verificationUrl) setVerificationUrl(payload.verificationUrl);
      setStep(2);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setIsStartingDidit(false);
    }
  };

  // ── Step 2 → 3: Open external browser, start polling ──────────────────────
  const handleLaunchDidit = async () => {
    if (!verificationUrl || !attemptId) return;
    try {
      await SecureStore.setItemAsync('didit_registration_state', JSON.stringify({
        attemptId, email, password, accountType, rollNumber, expertise, step: 3, verificationUrl
      }));
      await Linking.openURL(verificationUrl);
      setDiditStatus('pending');
      setStep(3);
      pollDiditStatus(attemptId);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Browser Error', text2: 'Could not open verification browser.' });
    }
  };

  // ── Lawyer Specific Upload Handlers ────────────────────────────────────────
  const handleLawyerPickId = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'We need gallery access to upload your ID.' });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLocalIdImage(result.assets[0].uri);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'id.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(`${apiBaseUrl}/api/legal-registration/ocr`, {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
           throw new Error(payload?.detail || 'OCR Failed');
        }

        const ocr = payload.data || {};
        setFirstName(ocr.firstName || '');
        setLastName(ocr.lastName || '');
        setMiddleName(ocr.middleName || '');
        setDob(ocr.dob || '');
        setIdNumber(ocr.idNumber || '');
        setExpirationDate(ocr.expirationDate || '');
        setSex(ocr.sex || '');
        setStreetAddress(ocr.streetAddress || '');
        setCity(ocr.city || '');
        setProvince(ocr.province || '');

        setStep(3);
      } catch (e: any) {
        Toast.show({ type: 'info', text1: 'OCR Unavailable', text2: 'Could not extract details automatically. Please enter them manually.' });
        setStep(3);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLawyerPickSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'We need camera access for the selfie.' });
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0].uri) {
      setLocalSelfieImage(result.assets[0].uri);
      setStep(4);
    }
  };

  // ── Polling loop ───────────────────────────────────────────────────────────
  const pollDiditStatus = async (currentAttemptId: string, attempt = 0) => {
    if (attempt > 200) {
      setDiditStatus('failed');
      Toast.show({ type: 'error', text1: 'Session Timed Out', text2: 'Please start registration again.' });
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/public-registration/status/${currentAttemptId}`);

      if (response.status === 404) {
        setDiditStatus('failed');
        Toast.show({ type: 'error', text1: 'Session Expired', text2: 'The server was restarted. Please begin again.' });
        return;
      }
      if (!response.ok) {
        pollingRef.current = setTimeout(() => pollDiditStatus(currentAttemptId, attempt + 1), 4000);
        return;
      }

      const payload = await response.json();

      if (payload.status === 'verified' || payload.status === 'approved') {
        // Success! Remove the crash-recovery state since we're back safely
        SecureStore.deleteItemAsync('didit_registration_state').catch(() => {});
        setDiditStatus('verified');

        const ocr = payload.ocrData || {};
        let fName = ocr.firstName || '';
        let mName = ocr.middleName || '';
        let lName = ocr.lastName || '';

        if (ocr.fullName && (!fName || !lName)) {
          const parts = ocr.fullName.split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            if (!fName) fName = parts[0];
            if (!lName) lName = parts[parts.length - 1];
            if (!mName && parts.length > 2) mName = parts.slice(1, -1).join(' ');
          }
        }

        setFirstName(fName);
        setMiddleName(mName);
        setLastName(lName);
        setDob(ocr.dob || '');
        setIdNumber(ocr.idNumber || '');
        setExpirationDate(ocr.expirationDate || '');
        setSex(ocr.sex || '');

        const address = ocr.address || {};
        setRegion(address.region || '');
        setProvince(address.province || '');
        setCity(address.city || '');
        setBarangay(address.barangay || '');
        const street = address.street || address.streetAddress || address.addressLine1 || '';
        setStreetAddress(street);

        setImageUrls(payload.imageUrls || {});
        setStep(4);
      } else if (payload.status === 'failed') {
        setDiditStatus('failed');
      } else {
        pollingRef.current = setTimeout(() => pollDiditStatus(currentAttemptId, attempt + 1), 3000);
      }
    } catch {
      const delay = Math.min(3000 + attempt * 500, 10000);
      pollingRef.current = setTimeout(() => pollDiditStatus(currentAttemptId, attempt + 1), delay);
    }
  };

  // ── Step 4: Finalize ───────────────────────────────────────────────────────
  const finalizeRegistration = async () => {
    let newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (!phone.trim()) newErrors.phone = 'Mobile number is required.';
    if (accountType === 'lawyer' && !rollNumber.trim()) newErrors.rollNumber = 'Roll Number is required.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please check the highlighted fields.' });
      return;
    }

    if (accountType === 'citizen' && !attemptId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Verification session not found. Please restart.' });
      return;
    }

    setIsFinalizing(true);
    try {
      let finalIdUrl = imageUrls?.idPictureUrl || null;
      let finalSelfieUrl = imageUrls?.selfieUrl || null;

      if (accountType === 'lawyer' && (localIdImage || localSelfieImage)) {
        if (localIdImage) {
           const fdId = new FormData();
           fdId.append('email', email.trim().toLowerCase());
           fdId.append('kind', 'ibp');
           fdId.append('file', { uri: localIdImage, name: 'id.jpg', type: 'image/jpeg' } as any);
           const rId = await fetch(`${apiBaseUrl}/api/legal-registration/upload-proof`, { method: 'POST', body: fdId });
           const dId = await rId.json();
           if (dId.ok) finalIdUrl = dId.url;
        }
        if (localSelfieImage) {
           const fdS = new FormData();
           fdS.append('email', email.trim().toLowerCase());
           fdS.append('kind', 'selfie');
           fdS.append('file', { uri: localSelfieImage, name: 'selfie.jpg', type: 'image/jpeg' } as any);
           const rS = await fetch(`${apiBaseUrl}/api/legal-registration/upload-proof`, { method: 'POST', body: fdS });
           const dS = await rS.json();
           if (dS.ok) finalSelfieUrl = dS.url;
        }
      }

      if (accountType === 'citizen') {
        const response = await fetch(`${apiBaseUrl}/api/public-registration/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            email: email.trim().toLowerCase(),
            password,
            phoneNumber: phone,
            address: { region, province, city, barangay },
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || 'Failed to finalize.');
      }

      // 2. Create the Supabase account with full metadata
      const baseHandle = `${firstName.trim()}_${lastName.trim()}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_');
      const randomSuffix = Math.random().toString(36).slice(2, 7);
      const handle = (baseHandle || 'user') + '_' + randomSuffix;

      // We use a temporary client to sign up so it doesn't trigger the app's global onAuthStateChange and auto-login
      const tempSupabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            phone_number: phone,
            street_address: streetAddress,
            region,
            province,
            city_municipality: city,
            barangay,
            is_didit_verified: accountType === 'citizen',
            status_verification: accountType === 'lawyer' ? 'unverified' : 'verified',
            role: accountType === 'lawyer' ? 'Volunteer Attorney' : 'Citizen',
            date_of_birth: dob || null,
            id_number: idNumber || null,
            expiration_date: expirationDate || null,
            sex: sex || null,
            handle,
            roll_number: accountType === 'lawyer' ? rollNumber : null,
            expertise: accountType === 'lawyer' ? expertise : null,
            id_picture_url: finalIdUrl,
            selfie_url: finalSelfieUrl,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);

      // Safety net: explicitly upsert the profile via the backend in case the DB trigger
      // failed silently (e.g. handle conflict, constraint error, or email-confirm timing).
      if (signUpData?.user?.id) {
        const profileData: Record<string, any> = {
          id: signUpData.user.id,
          email: email.trim().toLowerCase(),
          handle,
          first_name: firstName || 'User',
          middle_name: middleName || null,
          last_name: lastName || 'Account',
          phone_number: phone || null,
          street_address: streetAddress || null,
          region: region || null,
          province: province || null,
          city_municipality: city || null,
          barangay: barangay || null,
          is_didit_verified: accountType === 'citizen',
          status_verification: accountType === 'lawyer' ? 'unverified' : 'verified',
          role: accountType === 'lawyer' ? 'Volunteer Attorney' : 'Citizen',
          date_of_birth: dob || null,
          roll_number: accountType === 'lawyer' ? rollNumber : null,
          expertise: accountType === 'lawyer' ? expertise : null,
          id_picture_url: finalIdUrl || null,
          selfie_url: finalSelfieUrl || null,
        };

        try {
          await fetch(`${apiBaseUrl}/api/registration/upsert-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
          });
        } catch (_) {
          // Non-fatal: trigger may have already inserted the profile
        }
      }

      setStep(5);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    } finally {
      setIsFinalizing(false);
    }
  };

  // ── Step counter dots ──────────────────────────────────────────────────────
  const renderStepDots = () => (
    <View style={styles.stepDotRow}>
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
          {step > s ? (
            <Ionicons name="checkmark" size={10} color="#fff" />
          ) : (
            <Text style={[styles.stepDotLabel, step === s && styles.stepDotLabelActive]}>{s}</Text>
          )}
        </View>
      ))}
      {([1, 2, 3] as Step[]).map((s) => (
        <View
          key={`line-${s}`}
          style={[styles.stepLine, step > s && styles.stepLineActive,
            // Position lines between dots (via absolute positioning handled by container)
          ]}
        />
      ))}
    </View>
  );

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

      {/* Header */}
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={styles.appLogo} />
          </View>
          <Text style={styles.brandTitle}>LAYA</Text>
          <Text style={styles.brandSlogan}>Empower Your Rights. Free Your Future.</Text>
        </View>

        {/* Content card */}
        <View style={styles.bottomSection}>
          {step < 5 && (
            <>
              {/* Step counter */}
              <View style={styles.stepIndicatorRow}>
                <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
              </View>

              {/* Step dots */}
              <View style={styles.stepDotsContainer}>
                {([1, 2, 3, 4] as Step[]).map((s, i) => (
                  <React.Fragment key={s}>
                    <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                      {step > s
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Text style={[styles.stepDotNum, step === s && styles.stepDotNumActive]}>{s}</Text>
                      }
                    </View>
                    {i < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          {/* ─── STEP 1: Account credentials ─────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Let's get you set up securely.</Text>

              <View style={styles.typeSelector}>
                <Pressable
                  style={[styles.typeBtn, accountType === 'citizen' && styles.typeBtnActive]}
                  onPress={() => setAccountType('citizen')}
                >
                  <Ionicons name="person" size={18} color={accountType === 'citizen' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.typeBtnText, accountType === 'citizen' && styles.typeBtnTextActive]}>Citizen</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, accountType === 'lawyer' && styles.typeBtnActive]}
                  onPress={() => setAccountType('lawyer')}
                >
                  <Ionicons name="briefcase" size={18} color={accountType === 'lawyer' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.typeBtnText, accountType === 'lawyer' && styles.typeBtnTextActive]}>Legal Professional</Text>
                </Pressable>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="example@email.com" placeholderTextColor="#94A3B8" style={[styles.input, errors.email ? styles.inputError : null]} value={email} onChangeText={(text) => { setEmail(text); setErrors(e => ({ ...e, email: '' })); }} />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput 
                    placeholder="••••••••" 
                    placeholderTextColor="#94A3B8" 
                    secureTextEntry={!showPassword} 
                    style={[styles.input, { paddingRight: 50 }, errors.password ? styles.inputError : null]} 
                    value={password} 
                    onChangeText={(text) => { setPassword(text); setErrors(e => ({ ...e, password: '' })); }} 
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 16, height: '100%', justifyContent: 'center' }}
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#94A3B8" />
                  </Pressable>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isStartingDidit && styles.primaryButtonDisabled]}
                onPress={handleStepOne}
                disabled={isStartingDidit}
              >
                {isStartingDidit ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>NEXT STEP</Text>}
              </Pressable>
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Pressable testID="login-link" onPress={() => navigation.goBack()}>
                  <Text style={styles.loginLink}>Login</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ─── STEP 2: ID Scan instructions / Upload ────────────────────────────── */}
          {step === 2 && (
            <View style={styles.instructionsContainer}>
              {accountType === 'citizen' ? (
                <>
                  <Text style={styles.formTitle}>Verify Your Identity</Text>
                  <Text style={styles.formSubtitle}>You'll be redirected to our secure ID verification partner to complete this step.</Text>
    
                  <View style={styles.instructionCard}>
                    <View style={styles.instructionRow}>
                      <View style={styles.instructionIconBox}>
                        <Ionicons name="id-card-outline" size={28} color={theme.colors.primary} />
                      </View>
                      <View style={styles.instructionTextBox}>
                        <Text style={styles.instructionTitle}>Government-issued ID</Text>
                        <Text style={styles.instructionBody}>Have your valid Philippine ID ready. The camera will capture both sides.</Text>
                      </View>
                    </View>
                    <View style={styles.instructionDivider} />
                    <View style={styles.instructionRow}>
                      <View style={styles.instructionIconBox}>
                        <Ionicons name="camera-outline" size={28} color={theme.colors.primary} />
                      </View>
                      <View style={styles.instructionTextBox}>
                        <Text style={styles.instructionTitle}>Selfie / Face Scan</Text>
                        <Text style={styles.instructionBody}>You'll take a short selfie to match against your ID photo.</Text>
                      </View>
                    </View>
                    <View style={styles.instructionDivider} />
                    <View style={styles.instructionRow}>
                      <View style={styles.instructionIconBox}>
                        <Ionicons name="arrow-back-outline" size={28} color={theme.colors.primary} />
                      </View>
                      <View style={styles.instructionTextBox}>
                        <Text style={styles.instructionTitle}>Return to App</Text>
                        <Text style={styles.instructionBody}>After completing verification, tap "Return to App" in the browser to continue.</Text>
                      </View>
                    </View>
                  </View>
    
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                    onPress={handleLaunchDidit}
                  >
                    <Ionicons name="scan-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>START ID SCAN</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.formTitle}>Upload Your ID</Text>
                  <Text style={styles.formSubtitle}>Please provide a clear photo of your professional ID (e.g., IBP ID).</Text>
                  
                  {localIdImage ? (
                     <Image source={{ uri: localIdImage }} style={[styles.previewImage, { marginBottom: 20 }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.instructionCard, { alignItems: 'center', paddingVertical: 32 }]}>
                      <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.primary} />
                      <Text style={[styles.instructionBody, { textAlign: 'center', marginTop: 12 }]}>Upload a clear image of your ID from your gallery.</Text>
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isUploading && styles.primaryButtonDisabled]}
                    onPress={handleLawyerPickId}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                       <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryButtonText}>{localIdImage ? 'RE-UPLOAD ID' : 'SELECT ID IMAGE'}</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              <Pressable style={styles.backButton} onPress={() => setStep(1)} disabled={isUploading}>
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </Pressable>
            </View>
          )}

          {/* ─── STEP 3: Didit waiting / Selfie ─────────────────────────── */}
          {step === 3 && (
            <View style={styles.diditContainer}>
              {accountType === 'citizen' ? (
                <>
                  <View style={styles.diditIconBox}>
                    {diditStatus === 'verified' ? (
                      <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                    ) : diditStatus === 'failed' ? (
                      <Ionicons name="close-circle" size={80} color="#EF4444" />
                    ) : (
                      <Ionicons name="scan-circle" size={80} color={theme.colors.primary} />
                    )}
                  </View>
    
                  <Text style={styles.formTitle}>
                    {diditStatus === 'verified' ? 'Identity Verified!' : diditStatus === 'failed' ? 'Verification Failed' : 'Waiting for Verification'}
                  </Text>
                  <Text style={[styles.formSubtitle, { textAlign: 'center', marginTop: 12 }]}>
                    {diditStatus === 'verified'
                      ? 'Great! We are preparing your review screen...'
                      : diditStatus === 'failed'
                      ? 'Verification could not be completed. Please try again.'
                      : 'Complete the ID scan and selfie in your browser, then tap "Return to App" or come back here.'}
                  </Text>
    
                  {diditStatus === 'pending' && (
                    <>
                      <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
                      <Pressable
                        style={[styles.secondaryButton, { marginTop: 24 }]}
                        onPress={() => attemptId && pollDiditStatus(attemptId, 0)}
                      >
                        <Ionicons name="refresh" size={16} color={theme.colors.primary} />
                        <Text style={styles.secondaryButtonText}>Check Status Now</Text>
                      </Pressable>
                    </>
                  )}
    
                  {diditStatus === 'failed' && (
                    <Pressable style={[styles.primaryButton, { marginTop: 24 }]} onPress={() => { setStep(1); setDiditStatus('idle'); }}>
                      <Text style={styles.primaryButtonText}>TRY AGAIN</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={{ width: '100%' }}>
                  <Text style={styles.formTitle}>Take a Selfie</Text>
                  <Text style={styles.formSubtitle}>We need to match your face with the ID you provided for manual verification.</Text>
                  
                  {localSelfieImage ? (
                     <Image source={{ uri: localSelfieImage }} style={[styles.previewImage, { marginBottom: 20 }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.instructionCard, { alignItems: 'center', paddingVertical: 32 }]}>
                      <Ionicons name="camera-outline" size={48} color={theme.colors.primary} />
                      <Text style={[styles.instructionBody, { textAlign: 'center', marginTop: 12 }]}>Ensure good lighting and remove glasses or hats.</Text>
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, { width: '100%' }]}
                    onPress={handleLawyerPickSelfie}
                  >
                    <Ionicons name="camera-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>{localSelfieImage ? 'RE-TAKE SELFIE' : 'TAKE A SELFIE'}</Text>
                  </Pressable>
                  
                  <Pressable style={styles.backButton} onPress={() => setStep(2)}>
                    <Ionicons name="arrow-back" size={16} color="#64748B" />
                    <Text style={styles.backButtonText}>Go Back</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* ─── STEP 4: Review OCR Details ───────────────────────────────── */}
          {step === 4 && (
            <View>
              <Text style={styles.formTitle}>Review Details</Text>
              <Text style={styles.formSubtitle}>We extracted this from your ID. Correct any mistakes before proceeding.</Text>

              {/* Personal Information */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput style={[styles.input, errors.firstName ? styles.inputError : null]} value={firstName} onChangeText={(t) => { setFirstName(t); setErrors(e => ({ ...e, firstName: '' })); }} placeholder="e.g. Juan" placeholderTextColor="#94A3B8" />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Middle Name</Text>
                  <TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} placeholder="e.g. Dela" placeholderTextColor="#94A3B8" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput style={[styles.input, errors.lastName ? styles.inputError : null]} value={lastName} onChangeText={(t) => { setLastName(t); setErrors(e => ({ ...e, lastName: '' })); }} placeholder="e.g. Cruz" placeholderTextColor="#94A3B8" />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Date of Birth</Text>
                    <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Sex</Text>
                    <TextInput style={styles.input} value={sex} onChangeText={setSex} placeholder="Male / Female" placeholderTextColor="#94A3B8" />
                  </View>
                </View>
                <View style={[styles.inputContainer, { marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <TextInput style={[styles.input, errors.phone ? styles.inputError : null]} value={phone} onChangeText={(t) => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }} keyboardType="phone-pad" placeholder="09XXXXXXXXX" placeholderTextColor="#94A3B8" />
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>
              </View>

              {/* Address */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="location-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Address</Text>
                </View>
                <AddressPicker
                  region={region} setRegion={setRegion}
                  province={province} setProvince={setProvince}
                  city={city} setCity={setCity}
                  barangay={barangay} setBarangay={setBarangay}
                />
                <View style={[styles.inputContainer, { marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>Street / House No.</Text>
                  <TextInput style={styles.input} value={streetAddress} onChangeText={setStreetAddress} placeholder="Unit/House No., Building, Street" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              {/* ID Details */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="card-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>ID Details</Text>
                </View>
                
                {accountType === 'lawyer' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Roll of Attorneys No. *</Text>
                      <TextInput placeholder="12345" placeholderTextColor="#94A3B8" keyboardType="numeric" style={[styles.input, errors.rollNumber ? styles.inputError : null]} value={rollNumber} onChangeText={(t) => { setRollNumber(t); setErrors(e => ({ ...e, rollNumber: '' })); }} />
                      {errors.rollNumber && <Text style={styles.errorText}>{errors.rollNumber}</Text>}
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Areas of Expertise</Text>
                      <View style={styles.expertiseContainer}>
                        {EXPERTISE_OPTIONS.map(opt => {
                          const isSelected = expertise.includes(opt);
                          return (
                            <Pressable
                              key={opt}
                              style={[styles.expertiseChip, isSelected && styles.expertiseChipSelected]}
                              onPress={() => {
                                if (isSelected) setExpertise(expertise.filter(e => e !== opt));
                                else setExpertise([...expertise, opt]);
                              }}
                            >
                              <Text style={[styles.expertiseChipText, isSelected && styles.expertiseChipTextSelected]}>{opt}</Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    </View>
                  </>
                )}

                {((imageUrls?.idPictureUrl || imageUrls?.selfieUrl) || (localIdImage || localSelfieImage)) && (
                  <View style={styles.imageRow}>
                    {(imageUrls?.idPictureUrl || localIdImage) && (
                      <View style={styles.imageBox}>
                        <Text style={styles.inputLabel}>Scanned ID</Text>
                        <Image source={{ uri: imageUrls?.idPictureUrl || localIdImage! }} style={styles.previewImage} resizeMode="cover" />
                      </View>
                    )}
                    {(imageUrls?.selfieUrl || localSelfieImage) && (
                      <View style={styles.imageBox}>
                        <Text style={styles.inputLabel}>Selfie</Text>
                        <Image source={{ uri: imageUrls?.selfieUrl || localSelfieImage! }} style={styles.previewImage} resizeMode="cover" />
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>ID Number / Code</Text>
                  <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} placeholder="e.g. 123-456-789" placeholderTextColor="#94A3B8" />
                </View>
                <View style={[styles.inputContainer, { marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>ID Expiration Date</Text>
                  <TextInput style={styles.input} value={expirationDate} onChangeText={setExpirationDate} placeholder="e.g. 2030-12-31" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { marginTop: 8 },
                  pressed && styles.primaryButtonPressed,
                  isFinalizing && styles.primaryButtonDisabled,
                ]}
                onPress={finalizeRegistration}
                disabled={isFinalizing}
              >
                {isFinalizing
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryButtonText}>COMPLETE REGISTRATION</Text>
                }
              </Pressable>
            </View>
          )}

          {/* ─── STEP 5: Success ───────────────────────────────────────────────────── */}
          {step === 5 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Ionicons name="checkmark-circle" size={40} color={theme.colors.primary} />
              </View>
              <Text style={[styles.formTitle, { textAlign: 'center' }]}>Registration Complete!</Text>
              <Text style={[styles.formSubtitle, { textAlign: 'center', marginTop: 8 }]}>
                {accountType === 'lawyer' 
                  ? 'Your account is currently under review.\n\nPlease wait until an admin confirms and verifies your credentials before you can log in. This usually takes a few days (maximum of 7 days).' 
                  : 'Your account has been successfully created.\n\nYou can now log in with your email and password.'}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, { marginTop: 32, width: '100%' }]}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.primaryButtonText}>GO TO LOGIN</Text>
              </Pressable>
            </View>
          )}
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.primaryLight, transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 300, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.primaryLight, opacity: 0.5 },
  scrollContent: { flexGrow: 1 },

  // ── Header ─────────────────────────────────────────────────────────────────
  topSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  logoContainer: { marginBottom: 12 },
  appLogo: { width: 130, height: 130, resizeMode: 'contain' },
  brandTitle: { ...theme.typography.heading, color: theme.colors.textPrimary, fontSize: 32, letterSpacing: 2 },
  brandSlogan: { ...theme.typography.body, color: theme.colors.textSecondary, fontSize: 16, marginTop: 4, letterSpacing: 0.5 },

  // ── Content card ───────────────────────────────────────────────────────────
  bottomSection: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: 36, paddingHorizontal: 28, paddingBottom: 48, ...theme.shadows.soft, flex: 1 },

  // ── Step progress ──────────────────────────────────────────────────────────
  stepIndicatorRow: { marginBottom: 12, alignItems: 'center' },
  stepLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },

  // ── Step dots ──────────────────────────────────────────────────────────────
  stepDotsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepDotNum: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  stepDotNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 3, backgroundColor: theme.colors.border },
  stepLineActive: { backgroundColor: theme.colors.primary },

  // ── Step dot row (legacy, keep for safety) ─────────────────────────────────
  stepDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  stepDotLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  stepDotLabelActive: { color: '#fff' },

  // ── Typography ─────────────────────────────────────────────────────────────
  formTitle: { ...theme.typography.heading, color: theme.colors.textPrimary, fontSize: 28, marginBottom: 6, letterSpacing: -0.5 },
  formSubtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: 16 },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  inputContainer: { marginBottom: 20 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: theme.colors.secondary, color: theme.colors.textPrimary, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 16, fontSize: 15 },
  inputError: { borderColor: theme.colors.error, backgroundColor: '#FEF2F2' },
  errorText: { color: theme.colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  row: { flexDirection: 'row' },

  // ── Buttons ────────────────────────────────────────────────────────────────
  primaryButton: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 16, ...theme.shadows.medium },
  primaryButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  primaryButtonDisabled: { backgroundColor: theme.colors.textSecondary, shadowOpacity: 0 },
  primaryButtonText: { color: theme.colors.surface, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 15, fontWeight: '800' },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  backButtonText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // ── Account type ───────────────────────────────────────────────────────────
  typeSelector: { flexDirection: 'row', backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.xl, padding: 5, marginBottom: 28 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: theme.borderRadius.lg, gap: 6 },
  typeBtnActive: { backgroundColor: theme.colors.primary, ...theme.shadows.soft },
  typeBtnText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  typeBtnTextActive: { color: theme.colors.surface },

  // ── Login link ─────────────────────────────────────────────────────────────
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginText: { color: theme.colors.textSecondary, fontSize: 14 },
  dobPickerBtnText: { color: theme.colors.textPrimary, fontSize: 16 },
  expertiseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  expertiseChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  expertiseChipSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  expertiseChipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  expertiseChipTextSelected: { color: '#FFFFFF' },
  loginLink: { color: theme.colors.primary, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },

  // ── Instructions (Step 2) ──────────────────────────────────────────────────
  instructionsContainer: {},
  instructionCard: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.xl, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  instructionIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  instructionTextBox: { flex: 1 },
  instructionTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  instructionBody: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  instructionDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },

  // ── Didit waiting (Step 3) ─────────────────────────────────────────────────
  diditContainer: { alignItems: 'center', paddingVertical: 20 },
  diditIconBox: { marginBottom: 20 },

  // ── Section cards (Step 4) ─────────────────────────────────────────────────
  sectionCard: { backgroundColor: theme.colors.background, padding: 20, borderRadius: theme.borderRadius.xl, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },

  // ── ID photos (Step 4) ─────────────────────────────────────────────────────
  imageRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  imageBox: { flex: 1 },
  previewImage: { width: '100%', aspectRatio: 1.6, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.border },
});
