import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useMobileAuth } from '../../shared/MobileAuthContext';
import { theme } from '../../shared/theme';
import { DocumentCardSkeleton } from '../../components/ui/Skeleton';
import { API_BASE_URL } from '../../shared/api';

interface UserDocument {
  id: string;
  title: string;
  content: string;
  template_slug: string;
  created_at: string;
  sources?: any[];
}

export default function MyDocumentsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { session } = useMobileAuth();
  
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const baseUrl = API_BASE_URL;
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
      setErrorMessage('Nabigong kunin ang iyong mga dokumento. Pakisubukang muli.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isFocused) {
      fetchDocuments();
    }
  }, [fetchDocuments, isFocused]);

  const handleDocumentPress = (doc: UserDocument) => {
    navigation.navigate('PublicDocumentResult', { 
      result: { 
        templateTitle: doc.title, 
        content: doc.content, 
        templateSlug: doc.template_slug,
        sources: doc.sources || []
      } 
    });
  };

  const renderItem = ({ item }: { item: UserDocument }) => (
    <Pressable style={styles.card} onPress={() => handleDocumentPress(item)}>
      <View style={styles.cardIcon}>
        <Ionicons name="document-text" size={24} color={theme.colors.primary} />
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
        <View style={styles.listContent}>
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Hindi ma-load ang mga dokumento</Text>
          <Text style={styles.emptySubtitle}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={fetchDocuments}>
            <Text style={styles.retryText}>Subukan Muli</Text>
          </Pressable>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardIcon: { width: 48, height: 48, borderRadius: theme.borderRadius.md, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDate: { color: theme.colors.textSecondary, fontSize: 13 },
  retryButton: { marginTop: 20, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
