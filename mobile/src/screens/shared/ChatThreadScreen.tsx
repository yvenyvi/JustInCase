import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatThreadRouteProp = RouteProp<RootStackParamList, 'ChatThread'>;

type MessageItem = {
  id: string;
  text: string;
  sender: 'me' | 'other';
  time: string;
  created_at: string;
};

export default function ChatThreadScreen() {
  const navigation = useNavigation();
  const route = useRoute<ChatThreadRouteProp>();
  const { threadId, threadName } = route.params;
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [resolvedThreadId, setResolvedThreadId] = useState<string>(threadId);

  useEffect(() => {
    fetchMessages();

    const channel = mobileSupabase.channel(`room:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, payload => {
        const newMsg = payload.new;
        if (newMsg) {
          mobileSupabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              setMessages(prev => {
                // Check if we already have it to avoid duplicates
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.content,
                  sender: (newMsg.sender_id === user.id ? 'me' : 'other') as 'me' | 'other',
                  time: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                  created_at: newMsg.created_at
                }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              });
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
          });
        }
      })
      .subscribe();

    return () => {
      mobileSupabase.removeChannel(channel);
    };
  }, [threadId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // threadId from navigation may be a case_id — find or create the real message_thread
      let resolvedThreadId = threadId;

      // Check if threadId is a direct message_thread id
      const { data: directThread } = await mobileSupabase
        .from('message_threads')
        .select('id')
        .eq('id', threadId)
        .maybeSingle();

      if (!directThread) {
        // threadId is a case_id — look up or create the message thread
        const { data: existingThread } = await mobileSupabase
          .from('message_threads')
          .select('id')
          .eq('case_id', threadId)
          .maybeSingle();

        if (existingThread) {
          resolvedThreadId = existingThread.id;
        } else {
          // Create new thread for this case
          const { data: newThread, error: threadErr } = await mobileSupabase
            .from('message_threads')
            .insert({ case_id: threadId })
            .select('id')
            .single();
          if (threadErr) throw threadErr;
          resolvedThreadId = newThread.id;
        }
      }

      // Ensure current user is a thread participant (upsert)
      await mobileSupabase
        .from('thread_participants')
        .upsert({ thread_id: resolvedThreadId, user_id: user.id }, { onConflict: 'thread_id,user_id', ignoreDuplicates: true });

      const { data, error } = await mobileSupabase
        .from('messages')
        .select('*')
        .eq('thread_id', resolvedThreadId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mapped = data.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          sender: (msg.sender_id === user.id ? 'me' : 'other') as 'me' | 'other',
          time: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          created_at: msg.created_at
        }));
        setMessages(mapped);
      }

      // Store resolved thread id so handleSend uses the right one
      setResolvedThreadId(resolvedThreadId);

    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
    }
  };

  const handleSend = async () => {
    if (message.trim() && userId) {
      const msgText = message.trim();
      setMessage('');
      try {
        // User message — use resolvedThreadId (the real message_thread id)
        const { error: sendError } = await mobileSupabase.from('messages').insert({
          thread_id: resolvedThreadId,
          sender_id: userId,
          content: msgText
        });

        if (sendError) throw sendError;

        // Simulate attorney typing and replying (Auto-Responder for Demo)
        setTimeout(async () => {
          const autoReplies = [
            "Salamat sa iyong mensahe. Binabasa ko na ito ngayon.",
            "Naiintindihan ko ang iyong sitwasyon. Hayaan mong pag-aralan ko ang mga dokumento.",
            "Makakaasa ka, babalikan kita mamaya pagkatapos ng aking hearing.",
            "Noted ito. May mga karagdagang dokumento ka pa bang maipapadala?",
            "Salamat sa detalye. Mag-set tayo ng maikling tawag bukas kung maaari."
          ];
          const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
          
          await mobileSupabase.from('messages').insert({
            thread_id: threadId,
            sender_id: '00000000-0000-0000-0000-000000000000', // Mock system/attorney ID
            content: randomReply
          });
        }, 2000);

      } catch (err: any) {
        console.error('Error sending message:', err);
        Toast.show({
          type: 'error',
          text1: 'Failed to send',
          text2: err.message || 'May error na naganap. Subukang muli.',
        });
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{threadName}</Text>
          <Text style={styles.headerSubtitle}>Active Case</Text>
        </View>
        <Pressable style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={24} color="#0D9488" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateSeparator}>Today</Text>
          
          {messages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {!isMe && (
                  <View style={styles.avatarSmall}>
                    <Ionicons name="person" size={12} color="#0D9488" />
                  </View>
                )}
                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>{msg.text}</Text>
                  <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeOther]}>{msg.time}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.attachBtn}>
          <Ionicons name="attach" size={24} color="#64748B" />
        </Pressable>
        <TextInput 
          style={styles.textInput}
          placeholder="Mag-type ng mensahe..."
          placeholderTextColor="#94A3B8"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <Pressable style={[styles.sendBtn, message.trim() ? styles.sendBtnActive : {}]} onPress={handleSend}>
          <Ionicons name="send" size={20} color={message.trim() ? '#FFFFFF' : '#94A3B8'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#0D9488', fontSize: 12, fontWeight: '600', marginTop: 2 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 24 },
  dateSeparator: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', marginBottom: 24 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageBubbleMe: { backgroundColor: '#0D9488', borderBottomRightRadius: 4, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  messageBubbleOther: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextMe: { color: '#FFFFFF' },
  messageTextOther: { color: '#1E293B' },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255, 255, 255, 0.7)' },
  messageTimeOther: { color: '#94A3B8' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  textInput: { flex: 1, backgroundColor: '#F8FAFC', color: '#1E293B', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtnActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
});
