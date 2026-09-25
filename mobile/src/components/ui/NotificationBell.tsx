import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';
import { useMobileAuth } from '../../shared/MobileAuthContext';

export function NotificationBell() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { role, user } = useMobileAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelInstanceId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const fetchUnreadCount = useCallback(async (userId?: string) => {
    try {
      const resolvedUserId = userId || user?.id;
      if (!resolvedUserId) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await mobileSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', resolvedUserId)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFocused) void fetchUnreadCount();
  }, [fetchUnreadCount, isFocused]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = mobileSupabase
      .channel(`notifications-bell:${user.id}:${channelInstanceId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        void fetchUnreadCount(user.id);
      })
      .subscribe();

    return () => {
      void mobileSupabase.removeChannel(channel);
    };
  }, [fetchUnreadCount, user?.id]);

  const navigateToNotifications = () => {
    navigation.navigate(role === 'legal' ? 'LegalNotifications' : 'PublicNotifications');
  };

  return (
    <Pressable style={styles.iconContainer} onPress={navigateToNotifications} accessibilityRole="button" accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} accessibilityHint="Opens your notifications">
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
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
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
