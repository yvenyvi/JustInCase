import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileAuth } from '../../shared/MobileAuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DocumentGeneratorScreen() {
  const navigation = useNavigation<any>();
  const { session } = useMobileAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Magandang araw! Anong uri ng legal na dokumento ang kailangan mong gawin? Ilarawan lamang ang iyong sitwasyon at tutulungan kitang buuin ito.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(300);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.21:8000';
      const token = session?.access_token || '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}/api/documents/interactive-draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ history: newMessages })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const reply = data.response || '';

      if (reply.startsWith('DOCUMENT:')) {
        const documentMarkdown = reply.replace(/^DOCUMENT:\s*/i, '');
        navigation.navigate('PublicDocumentResult', { result: { content: documentMarkdown, templateSlug: 'interactive-draft' } });
      } else {
        const questionText = reply.replace(/^QUESTION:\s*/i, '');
        setMessages(prev => [...prev, { role: 'assistant', content: questionText }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Paumanhin, mayroong error sa system ngayon. Pakisubukang muli.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isLoading]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e.endCoordinates.height;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    // Snap to 0 instantly before/when it hides to prevent the huge gap
    const willHideSub = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    const didHideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    
    return () => { showSub.remove(); willHideSub.remove(); didHideSub.remove(); };
  }, []);

  const handleInputFocus = () => setKeyboardHeight(keyboardHeightRef.current);

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>AI Document Drafter</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color="#0D9488" />
          </View>
          <Text style={styles.heroTitle}>Bumuo ng Dokumento</Text>
          <Text style={styles.heroSubtitle}>Sabihin sa akin ang iyong sitwasyon, at bubuuin natin ang nararapat na dokumento para sa iyo. Hindi mo na kailangan pumili ng template.</Text>
        </View>

        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.messageBubbleWrapper, msg.role === 'user' ? styles.wrapperUser : styles.wrapperAssistant]}>
            <View style={[styles.messageBubble, msg.role === 'user' ? styles.messageUser : styles.messageAssistant]}>
              <Text style={[styles.messageText, msg.role === 'user' ? styles.messageTextUser : styles.messageTextAssistant]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageBubbleWrapper, styles.wrapperAssistant]}>
            <View style={[styles.messageBubble, styles.messageAssistant, { padding: 16 }]}>
              <ActivityIndicator color="#0D9488" size="small" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder="Ilarawan ang iyong sitwasyon..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          onFocus={handleInputFocus}
          multiline
          maxLength={1000}
        />
        <Pressable style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} onPress={sendMessage} disabled={!inputText.trim() || isLoading}>
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  chatScrollView: { flex: 1 },
  chatScroll: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: '#1E293B', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { color: '#64748B', fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 20 },
  messageBubbleWrapper: { width: '100%', marginBottom: 16, flexDirection: 'row' },
  wrapperUser: { justifyContent: 'flex-end' },
  wrapperAssistant: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageUser: { backgroundColor: '#0D9488', borderBottomRightRadius: 4 },
  messageAssistant: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#FFFFFF' },
  messageTextAssistant: { color: '#1E293B' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  textInput: { flex: 1, backgroundColor: '#F1F5F9', color: '#1E293B', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
});
