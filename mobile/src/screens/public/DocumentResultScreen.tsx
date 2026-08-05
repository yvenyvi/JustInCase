import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { documentDirectory, writeAsStringAsync, EncodingType, StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMobileAuth } from '../../shared/MobileAuthContext';

export default function DocumentResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useMobileAuth();
  
  // @ts-ignore
  const { result } = route.params || {};

  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  if (!result) {
    return (
      <View style={styles.centerBox}>
        <Text>No result found.</Text>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: '#0D9488', marginTop: 12 }}>Go Back</Text></Pressable>
      </View>
    );
  }

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(result.content);
    Toast.show({
      type: 'success',
      text1: 'Na-copy sa Clipboard',
      text2: 'Maaari mo na itong i-paste sa iyong email o document editor.'
    });
  };

  const handleDone = () => {
    navigation.goBack();
  };

  const handleSaveToAccount = async () => {
    if (!session?.access_token) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please log in to save documents.' });
      return;
    }
    setIsSaving(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.15.5.96:8000';
      const response = await fetch(`${baseUrl}/api/documents/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: result.templateTitle || 'Generated Document',
          content: result.content,
          templateSlug: result.templateSlug
        })
      });
      
      if (!response.ok) throw new Error('Failed to save document');
      
      Toast.show({ type: 'success', text1: 'Success', text2: 'Document saved to your account.' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save document.' });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadFile = async (format: 'pdf' | 'docx', setLoader: (val: boolean) => void) => {
    setLoader(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.15.5.96:8000';
      const title = result.templateTitle ? result.templateTitle.replace(/\s+/g, '_') : 'Document';
      
      const response = await fetch(`${baseUrl}/api/documents/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: result.content })
      });
      
      if (!response.ok) throw new Error(`Failed to export ${format}`);
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).split(',')[1];
          const fileUri = `${documentDirectory}${title}.${format}`;
          
          if (Platform.OS === 'android') {
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            
            if (permissions.granted) {
              const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              const targetUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, `${title}.${format}`, mimeType);
              await writeAsStringAsync(targetUri, base64data, { encoding: EncodingType.Base64 });
              Toast.show({ type: 'success', text1: 'Success', text2: 'Document downloaded successfully.' });
            } else {
              // Fallback to sharing if permission denied but they still want the file
              await writeAsStringAsync(fileUri, base64data, { encoding: EncodingType.Base64 });
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
            }
          } else {
            // iOS native "Save to Files" is achieved through the share sheet
            await writeAsStringAsync(fileUri, base64data, { encoding: EncodingType.Base64 });
            const UTI = format === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.wordprocessingml.document';
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, { UTI });
            }
          }
        } catch (e) {
          console.error(e);
          Toast.show({ type: 'error', text1: 'Error', text2: `Failed to save ${format} to device.` });
        } finally {
          setLoader(false);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: `Failed to download ${format}.` });
      setLoader(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {result.templateTitle || 'Nabuong Dokumento'}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={32} color="#059669" />
          <View style={styles.successTextContainer}>
            <Text style={styles.successTitle}>Matagumpay na Nabuong Draft!</Text>
            <Text style={styles.successSubtitle}>Ang draft para sa {result.templateTitle} ay handa na.</Text>
          </View>
        </View>

        {result.aiAssisted && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI-Enhanced Draft</Text>
          </View>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color="#D97706" />
            <View style={styles.warningTextContainer}>
              {result.warnings.map((w: string, idx: number) => (
                <Text key={idx} style={styles.warningText}>• {w}</Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentTitle}>{result.templateTitle}</Text>
            <Pressable onPress={copyToClipboard} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={18} color="#0D9488" />
              <Text style={styles.copyBtnText}>Copy</Text>
            </Pressable>
          </View>
          <View style={styles.documentBody}>
            <Text style={styles.documentContent}>{result.content}</Text>
          </View>
        </View>

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748B" />
          <Text style={styles.disclaimerText}>
            Disclaimer: Ito ay isang draft lamang at hindi pumapalit sa pormal na legal na payo. 
            Konsultahin ang isang abogado kung kailangan ng pormal na representasyon.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => downloadFile('pdf', setIsDownloadingPdf)} disabled={isDownloadingPdf}>
            {isDownloadingPdf ? <ActivityIndicator color="#0D9488" /> : <Ionicons name="document-text-outline" size={24} color="#0D9488" />}
            <Text style={styles.actionBtnText}>PDF</Text>
          </Pressable>
          
          <Pressable style={styles.actionBtn} onPress={() => downloadFile('docx', setIsDownloadingDocx)} disabled={isDownloadingDocx}>
            {isDownloadingDocx ? <ActivityIndicator color="#0D9488" /> : <Ionicons name="document-outline" size={24} color="#0D9488" />}
            <Text style={styles.actionBtnText}>Word</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleSaveToAccount} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#0D9488" /> : <Ionicons name="save-outline" size={24} color="#0D9488" />}
            <Text style={styles.actionBtnText}>Save</Text>
          </Pressable>
        </View>

        <Pressable style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Bumalik sa Generator</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', padding: 16, borderRadius: 16, marginBottom: 16 },
  successTextContainer: { marginLeft: 12, flex: 1 },
  successTitle: { color: '#065F46', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  successSubtitle: { color: '#047857', fontSize: 13 },
  aiBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16, gap: 6 },
  aiBadgeText: { color: '#6D28D9', fontSize: 13, fontWeight: '700' },
  warningBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 20, alignItems: 'flex-start' },
  warningTextContainer: { marginLeft: 12, flex: 1 },
  warningText: { color: '#92400E', fontSize: 14, marginBottom: 4 },
  documentCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, overflow: 'hidden', marginBottom: 20 },
  documentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  documentTitle: { color: '#1E293B', fontSize: 15, fontWeight: '700', flex: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  copyBtnText: { color: '#0D9488', fontSize: 13, fontWeight: '700' },
  documentBody: { padding: 20 },
  documentContent: { color: '#334155', fontSize: 14, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, gap: 12 },
  disclaimerText: { color: '#475569', fontSize: 13, lineHeight: 20, flex: 1 },
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 16 },
  actionRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  actionBtn: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  actionBtnText: { color: '#0D9488', fontSize: 13, fontWeight: '700', marginTop: 4 },
  doneBtn: { backgroundColor: '#1E293B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
