import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileAuth } from '../../shared/MobileAuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { theme } from '../../shared/theme';
import { API_BASE_URL } from '../../shared/api';
import { WorkflowProgress } from '../../components/ui/WorkflowProgress';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  options?: string[];
}

class TriageRequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`Triage request failed with status ${status}`);
    this.status = status;
  }
}

export function getTriageErrorMessage(error: unknown): string {
  if (error instanceof TriageRequestError) {
    if (error.status === 401 || error.status === 403) {
      return 'Nag-expire ang inyong session. Mag-login muli bago ipagpatuloy ang assessment.';
    }
    if (error.status === 400 || error.status === 422) {
      return 'Hindi namin maproseso ang impormasyong ipinadala. Pakisuri ito at subukang muli.';
    }
    if (error.status === 429) {
      return 'Maraming gumagamit ng AI assessment ngayon. Maghintay sandali at subukang muli.';
    }
    if (error.status >= 500) {
      return 'Pansamantalang hindi available ang AI assessment. Naka-save ang usapan sa screen; pakisubukang muli makalipas ang ilang sandali.';
    }
  }
  return 'Hindi makakonekta sa assessment service. Tingnan ang inyong internet connection at subukang muli.';
}

export default function TriageScreen() {
  const navigation = useNavigation<any>();
  const { session } = useMobileAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Magandang araw po! Nandito po ako para makinig at tumulong sa inyo. Kung may legal na problema po kayo, huwag kayong mag-atubiling mag-kwento — ligtas po kayo dito. Ano po ang maitutulong ko sa inyo?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
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
    } catch {
      console.log('[Triage] Document picker unavailable');
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hindi mabuksan ang dokumento.' });
    }
  };

  const sendMessage = async (overrideText?: string | any) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
    if (!textToSend.trim() && !selectedFile) return;
    
    const userMessage = textToSend.trim();
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
      const baseUrl = API_BASE_URL;
      const token = session?.access_token || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let response;
      if (currentFile) {
        const formData = new FormData();
        const historyToSend = newMessages.map(m => ({ role: m.role, content: m.content }));
        formData.append('history', JSON.stringify(historyToSend));
        formData.append('files', {
          uri: currentFile.uri,
          name: currentFile.name,
          type: currentFile.mimeType || 'application/pdf',
        } as any);

        response = await fetch(`${baseUrl}/api/triage/interactive`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        const historyToSend = newMessages.map(m => ({ role: m.role, content: m.content }));
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const encodedBody = `history=${encodeURIComponent(JSON.stringify(historyToSend))}`;
        
        response = await fetch(`${baseUrl}/api/triage/interactive`, {
          method: 'POST',
          headers,
          body: encodedBody,
        });
      }

      if (!response.ok) throw new TriageRequestError(response.status);

      const data = await response.json();
      const reply = data.response || '';

      if (reply.includes('TRIAGE_RESULT:')) {
        let jsonStr = reply.substring(reply.indexOf('TRIAGE_RESULT:') + 14).trim();
        try {
          // Use regex to extract just the JSON object in case the AI added trailing text
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }
          const triageData = JSON.parse(jsonStr);
          navigation.navigate('PublicTriageResult', { result: triageData });
        } catch {
          console.log('[Triage] Invalid assessment response received');
          setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Nagkaproblema sa pagproseso ng iyong kaso. Pakisubukang muli.' }]);
        }
      } else {
        let questionText = reply.replace(/^QUESTION:\s*/i, '');
        let extractedOptions: string[] = [];
        const optionsMatch = questionText.match(/OPTIONS:\s*(\[.*?\])/i);
        if (optionsMatch) {
          try {
            extractedOptions = JSON.parse(optionsMatch[1]);
          } catch {
            console.log('[Triage] Invalid response options received');
          }
        }
        // Always strip OPTIONS from the text so it never shows to the user
        questionText = questionText.replace(/OPTIONS:\s*\[.*?\]/gi, '').trim();
        
        setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: questionText, options: extractedOptions.length > 0 ? extractedOptions : undefined }]);
      }
    } catch (error) {
      const status = error instanceof TriageRequestError ? error.status : 'connection';
      console.log(`[Triage] Request unavailable (${status})`);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: getTriageErrorMessage(error) }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isLoading]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => showSub.remove();
  }, []);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={() => navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] })} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Legal Help Assessment</Text>
        <Pressable onPress={() => {
          setMessages([{ role: 'assistant', content: 'Magandang araw! Ako ay isang AI legal intake assistant. Ilarawan ang iyong legal na problema at tutulungan kitang i-assess ito at ihanap ng angkop na abogado.' }]);
          setInputText('');
          setSelectedFile(null);
        }} style={styles.resetBtn}>
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
      <WorkflowProgress steps={['Describe concern', 'Review assessment', 'Choose attorney']} current={0} />

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="scale-outline" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>Case Assessment</Text>
          <Text style={styles.heroSubtitle}>Magbigay ng detalye tungkol sa iyong kaso, at mag-upload ng ebidensya kung meron. Susuriin ito ng AI.</Text>
        </View>

        {messages.map((msg: Message, idx: number) => (
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

      <View style={[styles.inputAreaWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].options && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer} contentContainerStyle={styles.optionsContent}>
            {messages[messages.length - 1].options!.map((opt: string, idx: number) => (
              <Pressable key={idx} style={styles.optionBtn} onPress={() => sendMessage(opt)}>
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
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
            multiline
            maxLength={1000}
          />
          <Pressable testID="send-button" style={[styles.sendBtn, (!inputText.trim() && !selectedFile) && { opacity: 0.5 }]} onPress={sendMessage} disabled={(!inputText.trim() && !selectedFile) || isLoading}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.subheading },
  chatScroll: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { ...theme.typography.heading, marginBottom: 8 },
  heroSubtitle: { ...theme.typography.body, textAlign: 'center', paddingHorizontal: 20 },
  messageBubbleWrapper: { width: '100%', marginBottom: 16, flexDirection: 'row' },
  wrapperUser: { justifyContent: 'flex-end' },
  wrapperAssistant: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.borderRadius.xl },
  messageUser: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  messageAssistant: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
  messageText: { ...theme.typography.body },
  messageTextUser: { color: theme.colors.surface },
  messageTextAssistant: { color: theme.colors.textPrimary },
  inputAreaWrapper: { backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  filePreviewRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filePreviewText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 12 },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  textInput: { flex: 1, backgroundColor: theme.colors.secondary, color: theme.colors.textPrimary, borderRadius: theme.borderRadius.xl, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: theme.colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
  resetBtn: { width: 44, height: 44, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  optionsContainer: { paddingBottom: 8, marginTop: -8 },
  optionsContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  optionBtn: { backgroundColor: theme.colors.surface, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.primary, ...theme.shadows.soft },
  optionText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
});
