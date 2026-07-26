import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useMobileAuth } from '../shared/MobileAuthContext';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

import TriageScreen from '../screens/public/TriageScreen';
import DocumentGeneratorScreen from '../screens/public/DocumentGeneratorScreen';
import DocumentFormScreen from '../screens/public/DocumentFormScreen';
import DocumentResultScreen from '../screens/public/DocumentResultScreen';
import RightsLibraryScreen from '../screens/public/RightsLibraryScreen';
import NotificationsScreen from '../screens/public/NotificationsScreen';
import ChatThreadScreen from '../screens/shared/ChatThreadScreen';
import CaseDetailsScreen from '../screens/shared/CaseDetailsScreen';
import LegalCaseDetailsScreen from '../screens/legal/LegalCaseDetailsScreen';
import PersonalInfoScreen from '../screens/shared/PersonalInfoScreen';
import SecurityScreen from '../screens/shared/SecurityScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import TermsOfServiceScreen from '../screens/shared/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/shared/PrivacyPolicyScreen';
import NotificationSettingsScreen from '../screens/shared/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isBootstrapping, role } = useMobileAuth();

  if (isBootstrapping) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role ? (
        <Stack.Group>
          {/* Role-specific Home Navigators */}
          {role === 'public' && <Stack.Screen name="PublicHome" component={AppNavigator} />}
          {role === 'legal' && <Stack.Screen name="LegalHome" component={AppNavigator} />}
          {role === 'admin' && <Stack.Screen name="AdminHome" component={AppNavigator} />}
          
          {/* Public Only Screens */}
          {role === 'public' && (
            <Stack.Group>
              <Stack.Screen name="PublicTriage" component={TriageScreen} />
              <Stack.Screen name="PublicDocumentGenerator" component={DocumentGeneratorScreen} />
              <Stack.Screen name="PublicDocumentForm" component={DocumentFormScreen} />
              <Stack.Screen name="PublicDocumentResult" component={DocumentResultScreen} />
              <Stack.Screen name="PublicRightsLibrary" component={RightsLibraryScreen} />
              <Stack.Screen name="PublicNotifications" component={NotificationsScreen} />
            </Stack.Group>
          )}

          {/* Shared Screens (Public, Legal, Admin) */}
          <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
          <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
          <Stack.Screen name="LegalCaseDetails" component={LegalCaseDetailsScreen} />
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        </Stack.Group>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}