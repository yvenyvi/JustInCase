import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { Card } from '../../components/ui/Card';
import { theme } from '../../shared/theme';

type Props = NativeStackScreenProps<any>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');

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
              <Ionicons name="key-outline" size={40} color="#FFFFFF" />
            </View>
          </View>
        </View>
        <Text style={styles.brandTitle}>JUSTICELINK</Text>
      </View>

      <Card style={styles.bottomSection}>
        <Text style={styles.formTitle}>Reset Password</Text>
        <Text style={styles.formSubtitle}>Enter your email to receive recovery instructions.</Text>
        
        <InputField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="example@email.com"
          value={email}
          onChangeText={setEmail}
        />

        <Button 
          title="SEND RESET LINK"
          onPress={() => {}}
          style={{ marginTop: 8, marginBottom: 24 }}
        />

        <Button 
          title="BACK TO LOGIN"
          variant="outline"
          onPress={() => navigation.goBack()}
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
  
  bottomSection: { borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: 40, paddingHorizontal: 32, paddingBottom: 40, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, flex: 1 },
  formTitle: { ...theme.typography.heading, fontSize: 32, marginBottom: 8, letterSpacing: -1 },
  formSubtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: 40 },
});