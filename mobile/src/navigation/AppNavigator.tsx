import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useMobileAuth } from '../shared/MobileAuthContext';
import ScreenShell from '../components/ScreenShell';
import PublicDashboardScreen from '../screens/public/PublicDashboardScreen';
import PublicCasesScreen from '../screens/public/PublicCasesScreen';
import PublicMessagesScreen from '../screens/public/PublicMessagesScreen';
import PublicProfileScreen from '../screens/public/PublicProfileScreen';

import LegalDashboardScreen from '../screens/legal/LegalDashboardScreen';
import LegalCasesScreen from '../screens/legal/LegalCasesScreen';
import LegalMessagesScreen from '../screens/legal/LegalMessagesScreen';
import LegalNotificationsScreen from '../screens/legal/LegalNotificationsScreen';
import LegalProfileScreen from '../screens/legal/LegalProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../shared/theme';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { role } = useMobileAuth();

  if (role === 'legal') {
    return (
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            paddingTop: 10,
            height: Platform.OS === 'ios' ? 88 : 68,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any = 'home';
            if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Cases') iconName = focused ? 'briefcase' : 'briefcase-outline';
            else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={LegalDashboardScreen} />
        <Tab.Screen name="Cases" component={LegalCasesScreen} />
        <Tab.Screen name="Messages" component={LegalMessagesScreen} />
        <Tab.Screen name="Notifications" component={LegalNotificationsScreen} />
        <Tab.Screen name="Profile" component={LegalProfileScreen} />
      </Tab.Navigator>
    );
  }

  if (role === 'admin') {
    return (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" children={() => <ScreenShell title="Admin Dashboard" subtitle="Admin overview will be wired here." />} />
        <Tab.Screen name="Verifications" children={() => <ScreenShell title="Attorney Verifications" subtitle="Review queue goes here." />} />
        <Tab.Screen name="Cases" children={() => <ScreenShell title="Case Management" subtitle="Admin case management goes here." />} />
        <Tab.Screen name="Settings" children={() => <ScreenShell title="Settings" subtitle="System settings go here." />} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 : 68,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Cases') iconName = focused ? 'briefcase' : 'briefcase-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PublicDashboardScreen} />
      <Tab.Screen name="Cases" component={PublicCasesScreen} />
      <Tab.Screen name="Messages" component={PublicMessagesScreen} />
      <Tab.Screen name="Profile" component={PublicProfileScreen} />
    </Tab.Navigator>
  );
}
