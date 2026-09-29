import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileAuth } from '../../shared/MobileAuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { theme } from '../../shared/theme';
import { API_BASE_URL } from '../../shared/api';
import { WorkflowProgress } from '../../components/ui/WorkflowProgress';
import { File, UploadType } from 'expo-file-system';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  options?: string[];
  apiContent?: string;
  localOnly?: boolean;
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
      return 'Hindi namin maproseso ang usapan o dokumento. Subukan ang mas maikling dokumento o magsimula ng bagong assessment kung mahaba na ang usapan.';
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
  const route = useRoute<any>();
  const { session } = useMobileAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Magandang araw! Ano ang concern na gusto mong pag-usapan? Maaari kitang tulungang unawain ang iyong mga opsyon o maghanda para sa tulong ng abogado.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState('continue');
  const [loadingSlow, setLoadingSlow] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [intent, setIntent] = useState('undecided');
  const [canRetry, setCanRetry] = useState(false);
  const pendingRequest = useRef<{ history: Message[]; file: DocumentPicker.DocumentPickerAsset | null; action: string } | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setLoadingSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (route.params?.conversation) {
      const resumed: Message[] = route.params.conversation;
      const correction = route.params.correction;
      setMessages(correction ? [...resumed, {
        role: 'user', content: 'I reviewed my concern details. I would like to continue discussing.',
        apiContent: 'These are my reviewed details and corrections. Keep my stated intent unless I change it: ' + JSON.stringify(correction),
      }] : resumed);
      setReviewReady(false);
      setCanRetry(false);
      pendingRequest.current = null;
    }
  }, [route.params?.conversation, route.params?.correction]);

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

  const sendMessage = async (overrideText?: string | any, action = 'continue', retry = false) => {
    if (requestInFlight.current) return;
    const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
    if (!retry && action !== 'assess' && !textToSend.trim() && !selectedFile) return;
    
    const userMessage = textToSend.trim();
    const fileName = selectedFile?.name;
    if (!retry && action === 'continue') setInputText('');
    const currentFile = retry ? pendingRequest.current?.file || null : selectedFile;
    if (!retry && action === 'continue') setSelectedFile(null);
    Keyboard.dismiss();

    const displayContent = currentFile ? `${userMessage}\n[Attached: ${fileName}]` : userMessage;
    const newMessages: Message[] = retry && pendingRequest.current
      ? pendingRequest.current.history
      : action === 'assess' ? messages.filter(m => !m.localOnly)
      : [...messages.filter(m => !m.localOnly), { role: 'user', content: displayContent, fileName }];
    if (retry && pendingRequest.current) action = pendingRequest.current.action;
    pendingRequest.current = { history: newMessages, file: currentFile, action };
    setMessages(newMessages);
    setLoadingAction(action);
    setLoadingSlow(false);
    setIsLoading(true);
    setCanRetry(false);
    setReviewReady(false);
    requestInFlight.current = true;

    try {
      const baseUrl = API_BASE_URL;
      const token = session?.access_token || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let response;
      const historyToSend = newMessages.filter(m => !m.localOnly).map(m => ({ role: m.role, content: m.apiContent || m.content }));
      if (currentFile) {
        const uploaded = await new File(currentFile.uri).upload(`${baseUrl}/api/triage/interactive`, {
          httpMethod: 'POST', uploadType: UploadType.MULTIPART, fieldName: 'files',
          mimeType: currentFile.mimeType || 'application/pdf',
          parameters: { history: JSON.stringify(historyToSend), action },
          headers,
        });
        response = { ok: uploaded.status >= 200 && uploaded.status < 300, status: uploaded.status, json: async () => JSON.parse(uploaded.body) };
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const encodedBody = `history=${encodeURIComponent(JSON.stringify(historyToSend))}&action=${action}`;
        
        response = await fetch(`${baseUrl}/api/triage/interactive`, {
          method: 'POST',
          headers,
          body: encodedBody,
        });
      }

      if (!response.ok) throw new TriageRequestError(response.status);

      const data = await response.json();
      if (data.processed_user_content && newMessages[newMessages.length - 1]?.role === 'user') {
        newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], apiContent: data.processed_user_content };
      }
      if (typeof data.reply === 'string') {
        setIntent(data.intent || 'undecided');
        setReviewReady(data.review_ready === true);
        if (action === 'assess' && data.assessment) {
          navigation.navigate('PublicTriageResult', { result: data.assessment, conversation: newMessages });
          setMessages(newMessages);
        } else {
          setMessages([...newMessages, { role: 'assistant', content: data.reply, options: data.suggestions }]);
        }
        pendingRequest.current = null;
        return;
      }
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
          if (action === 'assess') navigation.navigate('PublicTriageResult', { result: triageData, conversation: newMessages });
          else {
            setReviewReady(true);
            setMessages([...newMessages, { role: 'assistant', content: 'Maaari mo nang suriin ang assessment o magdagdag ng detalye.' }]);
          }
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
      setCanRetry(true);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: getTriageErrorMessage(error), localOnly: true }]);
    } finally {
      setIsLoading(false);
      requestInFlight.current = false;
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
          if (requestInFlight.current) return;
          setMessages([{ role: 'assistant', content: 'Ano ang concern na gusto mong pag-usapan? Maaari kitang tulungang unawain ang iyong mga opsyon o maghanda para sa tulong ng abogado.' }]);
          setInputText('');
          setSelectedFile(null);
          setReviewReady(false);
          setIntent('undecided');
          setCanRetry(false);
          pendingRequest.current = null;
        }} style={styles.resetBtn}>
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
      <WorkflowProgress steps={['Describe concern', 'Review assessment', 'Choose next steps']} current={0} />

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
          <Text style={styles.heroTitle}>Pag-usapan ang concern mo</Text>
          <Text style={styles.heroSubtitle}>Ikuwento ang sitwasyon sa sarili mong paraan. Ikaw ang magpapasya sa susunod na hakbang.</Text>
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
            <View accessibilityLiveRegion="polite" style={[styles.messageBubble, styles.messageAssistant, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <ActivityIndicator color="#4F46E5" size="small" />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.messageTextAssistant}>{loadingAction === 'assess' ? 'Reviewing your details...' : 'Thinking about your concern...'}</Text>
                {loadingSlow && <Text style={[styles.messageTextAssistant, { fontSize: 12, marginTop: 4 }]}>This is taking a little longer. Please wait...</Text>}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputAreaWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {reviewReady && !isLoading && (
          <Pressable testID="review-assessment" style={styles.optionBtn} disabled={!!inputText.trim() || !!selectedFile} onPress={() => sendMessage('', 'assess')}>
            <Text style={styles.optionText}>{intent === 'seek_attorney' ? 'Review and find an attorney' : 'Review my assessment'}</Text>
            {(!!inputText.trim() || !!selectedFile) && <Text>Ipadala muna ang dagdag na detalye.</Text>}
          </Pressable>
        )}
        {canRetry && !isLoading && <Pressable style={styles.optionBtn} onPress={() => sendMessage('', 'continue', true)}><Text style={styles.optionText}>Retry</Text></Pressable>}
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
