import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileAuth } from '../../shared/MobileAuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
}

export default function TriageScreen() {
  const navigation = useNavigation<any>();
  const { session } = useMobileAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Magandang araw! Ako ay isang AI legal intake assistant. Ilarawan ang iyong legal na problema at tutulungan kitang i-assess ito at ihanap ng angkop na abogado.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(300);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hindi mabuksan ang dokumento.' });
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;
    
    const userMessage = inputText.trim();
    const fileName = selectedFile?.name;
    setInputText('');
    const currentFile = selectedFile;
    setSelectedFile(null);
    Keyboard.dismiss();

    const displayContent = currentFile ? `${userMessage}\n[Attached: ${fileName}]` : userMessage;
    const newMessages: Message[] = [...messages, { role: 'user', content: displayContent, fileName }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.15.5.96:8000';
      const token = session?.access_token || '';

      const formData = new FormData();
      const historyToSend = newMessages.map(m => ({ role: m.role, content: m.content }));
      formData.append('history', JSON.stringify(historyToSend));

      if (currentFile) {
        formData.append('files', {
          uri: currentFile.uri,
          name: currentFile.name,
          type: currentFile.mimeType || 'application/pdf',
        } as any);
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}/api/triage/interactive`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const reply = data.response || '';

      if (reply.startsWith('TRIAGE_RESULT:')) {
        const jsonStr = reply.replace(/^TRIAGE_RESULT:\s*/i, '');
        try {
          const triageData = JSON.parse(jsonStr);
          navigation.navigate('PublicTriageResult', { result: triageData });
        } catch (e) {
          console.error("Failed to parse triage JSON", e);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Nagkaproblema sa pagproseso ng iyong kaso. Pakisubukang muli.' }]);
        }
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
        <Text style={styles.headerTitle}>AI Triage Intake</Text>
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
            <Ionicons name="scale-outline" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>Case Assessment</Text>
          <Text style={styles.heroSubtitle}>Magbigay ng detalye tungkol sa iyong kaso, at mag-upload ng ebidensya kung meron. Susuriin ito ng AI.</Text>
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
              <ActivityIndicator color="#4F46E5" size="small" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputAreaWrapper}>
        {selectedFile && (
          <View style={styles.filePreviewRow}>
            <Ionicons name="document-attach" size={16} color="#64748B" />
            <Text style={styles.filePreviewText} numberOfLines={1} ellipsizeMode="tail">{selectedFile.name}</Text>
            <Pressable onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </Pressable>
          </View>
        )}
        <View style={styles.inputArea}>
          <Pressable style={styles.attachBtn} onPress={handlePickDocument}>
            <Ionicons name="document-attach-outline" size={24} color="#64748B" />
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="Ilarawan ang iyong problema..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onFocus={handleInputFocus}
            multiline
            maxLength={1000}
          />
          <Pressable style={[styles.sendBtn, (!inputText.trim() && !selectedFile) && { opacity: 0.5 }]} onPress={sendMessage} disabled={(!inputText.trim() && !selectedFile) || isLoading}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  chatScroll: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: '#1E293B', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { color: '#64748B', fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 20 },
  messageBubbleWrapper: { width: '100%', marginBottom: 16, flexDirection: 'row' },
  wrapperUser: { justifyContent: 'flex-end' },
  wrapperAssistant: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageUser: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  messageAssistant: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#FFFFFF' },
  messageTextAssistant: { color: '#1E293B' },
  inputAreaWrapper: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  filePreviewRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filePreviewText: { flex: 1, color: '#475569', fontSize: 13 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 12 },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  textInput: { flex: 1, backgroundColor: '#F1F5F9', color: '#1E293B', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
});
