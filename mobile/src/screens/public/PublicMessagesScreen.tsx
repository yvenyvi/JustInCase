import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';
import { MessageThreadSkeleton } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ThreadItem = {
  id: string;
  name: string;
  caseTitle: string;
  preview: string;
  time: string;
  unread: number;
};

export default function PublicMessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['publicMessageThreads'],
    queryFn: async () => {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: threadsData, error: threadsError } = await mobileSupabase
        .from('message_threads')
        .select(`
          id,
          cases (
            title,
            client_id,
            attorney:users!cases_attorney_id_fkey(first_name, last_name)
          )
        `)
        .eq('cases.client_id', user.id);

      if (threadsError) throw threadsError;
      
      const validThreads = (threadsData || []).filter(t => t.cases);
      
      const enrichedThreads = await Promise.all(
        validThreads.map(async (t: any) => {
          const { data: lastMsg } = await mobileSupabase
            .from('messages')
            .select('content, created_at')
            .eq('thread_id', t.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const attorney = t.cases.attorney;
          const name = attorney ? `Atty. ${attorney.first_name} ${attorney.last_name}`.trim() : 'LAYA Support';
          
          return {
            id: t.id,
            name,
            caseTitle: t.cases.title,
            preview: lastMsg ? lastMsg.content : 'No messages yet.',
            time: lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            unread: 0
          };
        })
      );

      return enrichedThreads;
    }
  });

  useEffect(() => {
    const subscription = mobileSupabase
      .channel('public-messages-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['publicMessageThreads'] });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleLogout = async () => {
    await mobileSupabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mga Mensahe</Text>
          <Text style={styles.headerSubtitle}>Kausapin ang iyong abogado.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('PublicNotifications' as any)} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#64748B" />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={24} color="#64748B" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MessageThreadSkeleton />
          <MessageThreadSkeleton />
          <MessageThreadSkeleton />
        </ScrollView>
      ) : threads.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Walang mensahe</Text>
          <Text style={styles.emptySubtitle}>Wala ka pang thread ng mensahe sa ngayon.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {threads.map((thread) => (
            <Pressable 
              key={thread.id} 
              style={[styles.threadCard, thread.unread > 0 && styles.threadCardUnread]}
              onPress={() => navigation.navigate('ChatThread', { threadId: thread.id, threadName: thread.name })}
            >
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={24} color={theme.colors.primary} />
                {thread.unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{thread.unread}</Text></View>}
              </View>
              <View style={styles.threadContent}>
                <View style={styles.threadHeader}>
                  <Text style={[styles.threadName, thread.unread > 0 && styles.threadNameUnread]}>{thread.name}</Text>
                  <Text style={[styles.threadTime, thread.unread > 0 && styles.threadTimeUnread]}>{thread.time}</Text>
                </View>
                <Text style={styles.threadCase}>{thread.caseTitle}</Text>
                <Text style={[styles.threadPreview, thread.unread > 0 && styles.threadPreviewUnread]} numberOfLines={1}>
                  {thread.preview}
                </Text>
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
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: theme.colors.textSecondary, fontSize: 15 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  threadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  threadCardUnread: { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.error, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surface },
  unreadText: { color: theme.colors.surface, fontSize: 10, fontWeight: '800' },
  threadContent: { flex: 1, marginLeft: 16 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  threadName: { color: '#334155', fontSize: 16, fontWeight: '600' },
  threadNameUnread: { color: theme.colors.textPrimary, fontWeight: '800' },
  threadTime: { color: theme.colors.textSecondary, fontSize: 12 },
  threadTimeUnread: { color: theme.colors.primary, fontWeight: '700' },
  threadCase: { color: theme.colors.primary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  threadPreview: { color: theme.colors.textSecondary, fontSize: 14 },
  threadPreviewUnread: { color: theme.colors.textPrimary, fontWeight: '600' },
});
