import 'react-native-gesture-handler';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { MobileAuthProvider } from './src/shared/MobileAuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const toastConfig = {
  success: (props: any) => (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, marginHorizontal: 20, borderWidth: 1.5, borderColor: '#F0FDFA' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark-circle" size={24} color="#0D9488" />
      </View>
      <View style={{ marginLeft: 16, flex: 1 }}>
        <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>{props.text1}</Text>
        {props.text2 ? <Text style={{ color: '#475569', fontSize: 13, marginTop: 2, lineHeight: 18 }}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
  error: (props: any) => (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#F87171', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, marginHorizontal: 20, borderWidth: 1.5, borderColor: '#FEF2F2' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="alert-circle" size={24} color="#EF4444" />
      </View>
      <View style={{ marginLeft: 16, flex: 1 }}>
        <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800' }}>{props.text1}</Text>
        {props.text2 ? <Text style={{ color: '#475569', fontSize: 13, marginTop: 2, lineHeight: 18 }}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
};
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <MobileAuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </MobileAuthProvider>
      <Toast config={toastConfig} position="bottom" bottomOffset={60} />
    </SafeAreaProvider>
  );
}