import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMobileAuth } from '../../shared/MobileAuthContext';

export default function DocumentFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { session } = useMobileAuth();
  
  // @ts-ignore
  const { template } = route.params || {};

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  if (!template) {
    return (
      <View style={styles.centerBox}>
        <Text>Template not found.</Text>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: '#0D9488', marginTop: 12 }}>Go Back</Text></Pressable>
      </View>
    );
  }

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    for (const field of template.required_fields || []) {
      if (!formValues[field.key] || formValues[field.key].trim() === '') {
        Toast.show({
          type: 'error',
          text1: 'Kulang ang Impormasyon',
          text2: `Pakilagyan ng detalye ang: ${field.label}`
        });
        return false;
      }
    }
    return true;
  };

  // Client-side fallback: fill in the body_template with user values
  const generateLocalDraft = () => {
    const bodyTemplate: string = template.body_template || '';
    const rendered = bodyTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_: string, key: string) => {
      if (key === 'current_date') return new Date().toLocaleDateString('en-PH');
      return formValues[key] || '';
    }).replace(/\n{3,}/g, '\n\n').trim();

    const content = `${rendered}\n\nDisclaimer: This is a locally generated draft for self-advocacy support only. Consult a licensed lawyer for formal legal advice.`;

    return {
      templateTitle: template.title,
      content,
      aiAssisted: false,
      warnings: ['Backend AI is currently unavailable. This is a basic template draft.'],
      generatedAt: new Date().toISOString(),
    };
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;
    setIsGenerating(true);
    
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.21:8000';
      const userId = session?.user?.id || 'anonymous';
      const token = session?.access_token || '';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${baseUrl}/api/documents/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ templateId: template.id, templateSlug: template.slug, userId, values: formValues }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Server error');
      const result = await response.json();
      navigation.navigate('PublicDocumentResult', { result });
    } catch (err: any) {
      // If backend is unreachable (network error / timeout), use local fallback
      if (err.name === 'AbortError' || err.message === 'Network request failed' || err.message === 'Server error') {
        const localResult = generateLocalDraft();
        navigation.navigate('PublicDocumentResult', { result: localResult });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Nagkaroon ng problema habang ginagawa ang dokumento. Pakisubukan muli.'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderField = (field: any, isRequired: boolean) => {
    const isTextArea = field.type === 'textarea';
    return (
      <View key={field.key} style={styles.inputGroup}>
        <Text style={styles.label}>
          {field.label} {isRequired && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        <TextInput
          style={[styles.input, isTextArea && styles.textArea]}
          placeholder={`I-type ang ${field.label.toLowerCase()}...`}
          placeholderTextColor="#94A3B8"
          value={formValues[field.key] || ''}
          onChangeText={(text) => handleInputChange(field.key, text)}
          multiline={isTextArea}
          numberOfLines={isTextArea ? 4 : 1}
          textAlignVertical={isTextArea ? 'top' : 'center'}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isGenerating}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Mga Detalye</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 40 : 20}
      >
        <View style={styles.templateInfo}>
          <Text style={styles.templateCategory}>{template.category}</Text>
          <Text style={styles.templateTitle}>{template.title}</Text>
          <Text style={styles.templateDesc}>{template.description}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Kinakailangang Impormasyon</Text>
          {(template.required_fields || []).map((f: any) => renderField(f, true))}

          {template.optional_fields && template.optional_fields.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Opsyonal na Impormasyon</Text>
              {template.optional_fields.map((f: any) => renderField(f, false))}
            </>
          )}
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]} 
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>Bumuo ng Dokumento</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  templateInfo: { marginBottom: 32 },
  templateCategory: { color: '#0D9488', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  templateTitle: { color: '#1E293B', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  templateDesc: { color: '#64748B', fontSize: 15, lineHeight: 24 },
  formContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  requiredStar: { color: '#EF4444' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
  textArea: { minHeight: 100, paddingTop: 12 },
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  generateBtn: { backgroundColor: '#0D9488', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  generateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
