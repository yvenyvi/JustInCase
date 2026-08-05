import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useMobileAuth } from '../../shared/MobileAuthContext';

interface UserDocument {
  id: string;
  title: string;
  content: string;
  template_slug: string;
  created_at: string;
}

export default function MyDocumentsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { session } = useMobileAuth();
  
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.15.5.96:8000';
      const response = await fetch(`${baseUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Nabigong kunin ang iyong mga dokumento.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchDocuments();
    }
  }, [isFocused, session]);

  const handleDocumentPress = (doc: UserDocument) => {
    navigation.navigate('PublicDocumentResult', { 
      result: { 
        templateTitle: doc.title, 
        content: doc.content, 
        templateSlug: doc.template_slug 
      } 
    });
  };

  const renderItem = ({ item }: { item: UserDocument }) => (
    <Pressable style={styles.card} onPress={() => handleDocumentPress(item)}>
      <View style={styles.cardIcon}>
        <Ionicons name="document-text" size={24} color="#0D9488" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Walang Dokumento</Text>
          <Text style={styles.emptySubtitle}>Wala ka pang nakasave na dokumento.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDate: { color: '#64748B', fontSize: 13 },
});
