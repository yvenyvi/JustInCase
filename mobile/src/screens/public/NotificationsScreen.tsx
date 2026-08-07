import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchNotifications();
    }
  }, [isFocused]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;

      const { data, error } = await mobileSupabase
        .from('notifications')
        .select('id, title, body, created_at, is_read')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          desc: n.body,
          time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: n.is_read
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string, readStatus: boolean) => {
    if (readStatus) return; // already read
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await mobileSupabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Mga Notification</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Walang notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {notifications.map((notif) => (
            <Pressable key={notif.id} style={[styles.notifCard, !notif.read && styles.notifCardUnread]} onPress={() => markAsRead(notif.id, notif.read)}>
              <View style={styles.iconCol}>
                <View style={[styles.iconContainer, !notif.read && styles.iconContainerUnread]}>
                  <Ionicons name="notifications" size={20} color={notif.read ? theme.colors.textSecondary : theme.colors.primary} />
                </View>
              </View>
              <View style={styles.contentCol}>
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifDesc}>{notif.desc}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  notifCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  notifCardUnread: { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' },
  iconCol: { marginRight: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  iconContainerUnread: { backgroundColor: '#CCFBF1' },
  contentCol: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600' },
  notifTitleUnread: { color: theme.colors.textPrimary, fontWeight: '700' },
  notifTime: { color: theme.colors.textSecondary, fontSize: 12 },
  notifDesc: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
