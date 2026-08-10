import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(300);

  useEffect(() => {
    fetchMessages();
  }, [threadId]);

  useEffect(() => {
    if (!resolvedThreadId) return;
    
    const channel = mobileSupabase.channel(`room:${resolvedThreadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${resolvedThreadId}` }, payload => {
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
  }, [resolvedThreadId]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e.endCoordinates.height;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const willHideSub = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    const didHideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    
    return () => { showSub.remove(); willHideSub.remove(); didHideSub.remove(); };
  }, []);

  const handleInputFocus = () => setKeyboardHeight(keyboardHeightRef.current);

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
    <View style={[styles.container, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{threadName}</Text>
          <Text style={styles.headerSubtitle}>Active Case</Text>
        </View>
        <Pressable style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.dateSeparator}>Today</Text>
          
          {messages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {!isMe && (
                  <View style={styles.avatarSmall}>
                    <Ionicons name="person" size={12} color={theme.colors.primary} />
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
          onFocus={handleInputFocus}
          multiline
        />
        <Pressable style={[styles.sendBtn, message.trim() ? styles.sendBtnActive : {}]} onPress={handleSend}>
          <Ionicons name="send" size={20} color={message.trim() ? theme.colors.surface : theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  infoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: theme.colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 24 },
  dateSeparator: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', marginBottom: 24 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  avatarSmall: { width: 24, height: 24, borderRadius: theme.borderRadius.md, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.borderRadius.xl },
  messageBubbleMe: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  messageBubbleOther: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextMe: { color: theme.colors.surface },
  messageTextOther: { color: theme.colors.textPrimary },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255, 255, 255, 0.7)' },
  messageTimeOther: { color: theme.colors.textSecondary },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  textInput: { flex: 1, backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderRadius: theme.borderRadius.xl, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 16, borderWidth: 1, borderColor: theme.colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1, borderColor: theme.colors.border },
  sendBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
});
