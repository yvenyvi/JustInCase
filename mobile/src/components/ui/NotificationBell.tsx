import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';

export function NotificationBell() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new notifications for this user
    let channel: any = null;
    mobileSupabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        channel = mobileSupabase.channel('public:notifications')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
            fetchUnreadCount(); // Refresh count on any insert/update
          })
          .subscribe();
      }
    });

    return () => {
      if (channel) {
        mobileSupabase.removeChannel(channel);
      }
    };
  }, [isFocused]); // Refresh count when the screen comes into focus too

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;

      const { count } = await mobileSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const navigateToNotifications = () => {
    // Navigate based on the current context, assuming we're inside a stack that has access to Notifications
    // The screen name is mapped in RootNavigator
    navigation.navigate('PublicNotifications');
  };

  return (
    <Pressable style={styles.iconContainer} onPress={navigateToNotifications}>
      <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.surface
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
