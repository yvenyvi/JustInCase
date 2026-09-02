import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type?: string;
  reference_id?: string;
  rawDate: string;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
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
        .select('id, title, body, created_at, is_read, type, reference_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          desc: n.body,
          time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: n.is_read,
          type: n.type,
          reference_id: n.reference_id,
          rawDate: n.created_at
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationPress = async (notif: NotificationItem) => {
    // Mark as read
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      try {
        await mobileSupabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }

    // Route
    if (notif.type === 'message' && notif.reference_id) {
      navigation.navigate('ChatThread', { threadId: notif.reference_id, threadName: 'Message Thread' });
    } else if (['verify_hours', 'case_accepted', 'case_closed'].includes(notif.type || '') && notif.reference_id) {
      navigation.navigate('CaseDetails', { caseId: notif.reference_id });
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (user) {
        await mobileSupabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const groupedNotifications = {
    today: notifications.filter(n => isSameDay(new Date(n.rawDate), today)),
    yesterday: notifications.filter(n => isSameDay(new Date(n.rawDate), yesterday)),
    older: notifications.filter(n => !isSameDay(new Date(n.rawDate), today) && !isSameDay(new Date(n.rawDate), yesterday))
  };

  const renderNotificationGroup = (title: string, data: NotificationItem[]) => {
    if (data.length === 0) return null;
    return (
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
        {data.map(notif => {
          let iconName = "notifications";
          if (notif.type === 'message') iconName = "chatbubble";
          if (notif.type === 'verify_hours') iconName = "time";
          if (notif.type === 'case_accepted') iconName = "briefcase";
          
          return (
            <Pressable key={notif.id} style={[styles.notifCard, !notif.read && styles.notifCardUnread]} onPress={() => handleNotificationPress(notif)}>
              <View style={styles.iconCol}>
                <View style={[styles.iconContainer, !notif.read && styles.iconContainerUnread]}>
                  <Ionicons name={iconName as any} size={20} color={notif.read ? theme.colors.textSecondary : theme.colors.primary} />
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
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Mga Notification</Text>
        <Pressable onPress={markAllAsRead} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-done" size={24} color={theme.colors.primary} />
        </Pressable>
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
          {renderNotificationGroup('Today', groupedNotifications.today)}
          {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
          {renderNotificationGroup('Older', groupedNotifications.older)}
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
