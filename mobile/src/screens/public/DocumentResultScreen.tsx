import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

export default function DocumentResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // @ts-ignore
  const { result } = route.params || {};

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
    // Navigate back to the generator home
    navigation.navigate('PublicDocumentGenerator' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Nabuong Dokumento</Text>
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
        <Pressable style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Bumalik sa Listahan</Text>
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
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  doneBtn: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#475569', fontSize: 16, fontWeight: '700' },
});
