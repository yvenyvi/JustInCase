import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';

export interface RightsCategory {
  id: string;
  title: string;
  subtitle: string | null;
  icon_name: string;
  law_reference: string | null;
  description: string | null;
  display_order: number;
}

export interface RightsArticle {
  id: string;
  category_id: string;
  title: string;
  detail: string | null;
  law_section: string | null;
  article_url?: string | null;
}

export default function RightsLibraryScreen() {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<RightsCategory[]>([]);
  const [articles, setArticles] = useState<RightsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: catData, error: catError } = await mobileSupabase
          .from('rights_categories')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (!catError && catData) setCategories(catData);

        const { data: artData, error: artError } = await mobileSupabase
          .from('rights_articles')
          .select('*');

        if (!artError && artData) setArticles(artData);
      } catch (err) {
        console.error('Error fetching rights data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCategories = categories.filter(cat => 
    selectedCategoryId ? cat.id === selectedCategoryId : true
  ).map(cat => {
    const catArticles = articles.filter(a => a.category_id === cat.id);
    const q = searchTerm.toLowerCase();
    const catMatch = cat.title.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
    const matchingArticles = catArticles.filter(a => a.title.toLowerCase().includes(q) || (a.detail || '').toLowerCase().includes(q));
    
    return {
      ...cat,
      displayArticles: catMatch ? catArticles : matchingArticles,
      hasMatch: !searchTerm || catMatch || matchingArticles.length > 0
    };
  }).filter(c => c.hasMatch && c.displayArticles.length > 0);

  const toggleArticle = (id: string) => {
    setExpandedArticleId(prev => prev === id ? null : id);
  };

  const openUrl = (url?: string | null) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Rights Library</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainerWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Search by topic, keyword, or specific content..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <Text style={styles.searchHintText}>
          Tip: You can search for specific keywords (e.g. "labor", "child", "cybersecurity") to find relevant details within the content itself.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <>
          <View style={styles.chipsWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.chipsContainer}
            >
              <Pressable 
                style={[styles.chip, !selectedCategoryId && styles.chipActive]}
                onPress={() => setSelectedCategoryId(null)}
              >
                <Text style={[styles.chipText, !selectedCategoryId && styles.chipTextActive]}>Lahat</Text>
              </Pressable>
              {categories.map(cat => (
                <Pressable 
                  key={cat.id}
                  style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                    {cat.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <View key={cat.id} style={styles.categoryBlock}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.categoryBadge}>{cat.title}</Text>
                      {cat.law_reference && <Text style={styles.lawRef}>{cat.law_reference}</Text>}
                    </View>
                    {cat.description && <Text style={styles.catDesc}>{cat.description}</Text>}
                  </View>

                  {cat.displayArticles.map((article) => {
                    const isExpanded = expandedArticleId === article.id;
                    return (
                      <Pressable 
                        key={article.id} 
                        style={[styles.articleCard, isExpanded && styles.articleCardExpanded]}
                        onPress={() => article.article_url ? openUrl(article.article_url) : toggleArticle(article.id)}
                      >
                        <View style={styles.articleTitleRow}>
                          <Text style={styles.articleTitle}>{article.title}</Text>
                          <Ionicons 
                            name={article.article_url ? "open-outline" : (isExpanded ? "chevron-up" : "chevron-down")} 
                            size={20} 
                            color="#0D9488" 
                            style={{ flexShrink: 0, marginLeft: 8, marginTop: 2 }}
                          />
                        </View>
                        
                        {isExpanded && !article.article_url && (
                          <View style={styles.expandedContent}>
                            {article.detail && <Text style={styles.articleExcerpt}>{article.detail}</Text>}
                            {article.law_section && (
                              <View style={styles.lawSectionBadge}>
                                <Ionicons name="document-text-outline" size={14} color="#64748B" />
                                <Text style={styles.lawSectionText} numberOfLines={2}>{article.law_section}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Walang nahanap na resulta</Text>
                <Text style={styles.emptySubtitle}>Subukan ang ibang keywords gaya ng "upa", "sahod", o "VAWC".</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  searchContainerWrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, height: 50 },
  searchIcon: { marginRight: 8 },
  searchInput: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingLeft: 44, paddingRight: 16, color: '#1E293B', fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchHintText: { color: '#64748B', fontSize: 12, marginTop: 8, lineHeight: 16 },
  chipsWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chipsContainer: { paddingHorizontal: 24, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  chipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 60, gap: 32 },
  categoryBlock: { gap: 16 },
  categoryHeader: { marginBottom: 4 },
  catTitleRow: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 8, gap: 4 },
  categoryBadge: { color: '#0D9488', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 18 },
  lawRef: { color: '#64748B', fontSize: 12, fontWeight: '600', lineHeight: 16 },
  catDesc: { color: '#64748B', fontSize: 14, lineHeight: 22 },
  articleCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  articleCardExpanded: { borderColor: '#CCFBF1', backgroundColor: '#F0FDFA', shadowColor: '#0F766E' },
  articleTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  articleTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', flex: 1, flexWrap: 'wrap', lineHeight: 24 },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  articleExcerpt: { color: '#475569', fontSize: 15, lineHeight: 24, marginBottom: 16 },
  lawSectionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6, maxWidth: '100%' },
  lawSectionText: { color: '#64748B', fontSize: 12, fontWeight: '600', flexShrink: 1, flexWrap: 'wrap' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#1E293B', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#64748B', fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
});
