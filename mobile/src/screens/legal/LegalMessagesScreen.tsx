import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ThreadItem = {
  id: string;
  name: string;
  caseTitle: string;
  preview: string;
  time: string;
  unread: number;
};

export default function LegalMessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchThreads();
    }
  }, [isFocused]);

  const fetchThreads = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;

      const { data: threadsData, error: threadsError } = await mobileSupabase
        .from('message_threads')
        .select(`
          id,
          cases (
            title,
            attorney_id,
            client:users!cases_client_id_fkey(first_name, last_name)
          )
        `)
        .eq('cases.attorney_id', user.id);

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
            .single();

          const client = t.cases.client;
          const name = client ? `${client.first_name} ${client.last_name}`.trim() : 'Unknown Client';
          
          return {
            id: t.id,
            name,
            caseTitle: t.cases.title,
            preview: lastMsg ? lastMsg.content : 'No messages yet.',
            time: lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            unread: 0 // Simplification for now
          };
        })
      );

      setThreads(enrichedThreads);
    } catch (err) {
      console.error('Error fetching legal threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Communicate with your clients.</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Messages</Text>
          <Text style={styles.emptySubtitle}>You do not have any active client conversations.</Text>
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
                <Ionicons name="person" size={24} color="#0D9488" />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { color: '#1E293B', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: '#64748B', fontSize: 15 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: '#1E293B', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  threadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  threadCardUnread: { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  threadContent: { flex: 1, marginLeft: 16 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  threadName: { color: '#334155', fontSize: 16, fontWeight: '600' },
  threadNameUnread: { color: '#0F172A', fontWeight: '800' },
  threadTime: { color: '#94A3B8', fontSize: 12 },
  threadTimeUnread: { color: '#0D9488', fontWeight: '700' },
  threadCase: { color: '#0D9488', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  threadPreview: { color: '#64748B', fontSize: 14 },
  threadPreviewUnread: { color: '#1E293B', fontWeight: '600' },
});
