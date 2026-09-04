import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';
import { Skeleton } from '../../components/ui/Skeleton';

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

  const getContextKeywords = (query: string): string[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    const keywords = new Set<string>([q]);
    const words = q.split(/\s+/);
    
    const CONTEXT_SYNONYMS: Record<string, string[]> = {
      'kid': ['child', 'minor', 'youth', 'student', 'baby', 'children'],
      'kids': ['child', 'minor', 'youth', 'student', 'baby', 'children'],
      'job': ['labor', 'employment', 'work', 'employee', 'employer', 'salary', 'wage', 'pay'],
      'jobs': ['labor', 'employment', 'work', 'employee', 'employer', 'salary', 'wage', 'pay'],
      'wife': ['family', 'spouse', 'marriage', 'annulment', 'husband', 'partner'],
      'husband': ['family', 'spouse', 'marriage', 'annulment', 'wife', 'partner'],
      'house': ['property', 'land', 'estate', 'rent', 'tenant', 'landlord', 'real estate'],
      'home': ['property', 'land', 'estate', 'rent', 'tenant', 'landlord', 'real estate'],
      'police': ['arrest', 'warrant', 'rights', 'custody', 'crime', 'criminal', 'jail', 'prison', 'law enforcement'],
      'fake': ['fraud', 'scam', 'cybercrime', 'deceit', 'forgery'],
      'steal': ['theft', 'robbery', 'crime', 'criminal'],
      'fight': ['assault', 'violence', 'abuse', 'crime', 'battery'],
      'money': ['debt', 'loan', 'salary', 'wage', 'pay', 'financial', 'property'],
      'boss': ['employer', 'labor', 'employment', 'manager', 'company'],
      'worker': ['employee', 'labor', 'employment', 'job'],
      'quit': ['resignation', 'labor', 'employment', 'termination'],
      'fired': ['termination', 'labor', 'employment', 'dismissal'],
      'chat': ['cybercrime', 'online', 'internet', 'message', 'text'],
      'online': ['cybercrime', 'internet', 'social media', 'digital'],
      'picture': ['cybercrime', 'privacy', 'photo', 'video', 'image'],
      'scam': ['cybercrime', 'fraud', 'deceit', 'fake']
    };

    words.forEach(word => {
      if (CONTEXT_SYNONYMS[word]) {
        CONTEXT_SYNONYMS[word].forEach(syn => keywords.add(syn));
      }
    });

    return Array.from(keywords);
  };

  const filteredCategories = categories.filter(cat => 
    selectedCategoryId ? cat.id === selectedCategoryId : true
  ).map(cat => {
    const catArticles = articles.filter(a => a.category_id === cat.id);
    const keywords = getContextKeywords(searchTerm);
    
    if (keywords.length === 0) {
      return {
        ...cat,
        displayArticles: catArticles,
        hasMatch: true
      };
    }

    const catText = (cat.title + ' ' + (cat.description || '')).toLowerCase();
    const catMatch = keywords.some(kw => catText.includes(kw));
    
    const matchingArticles = catArticles.filter(a => {
      const artText = (a.title + ' ' + (a.detail || '')).toLowerCase();
      return keywords.some(kw => artText.includes(kw));
    });
    
    return {
      ...cat,
      displayArticles: catMatch ? catArticles : matchingArticles,
      hasMatch: catMatch || matchingArticles.length > 0
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
          Tip: Our contextual search allows you to use casual terms. Try searching "kid" to find Child Rights, or "job" to find Labor Laws.
        </Text>
        <Pressable 
          style={styles.trackerBtn}
          onPress={() => navigation.navigate('PublicLegislationTracker' as never)}
        >
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.trackerBtnText}>Track Pending Legislation</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            <Skeleton width={80} height={32} borderRadius={16} />
            <Skeleton width={110} height={32} borderRadius={16} />
            <Skeleton width={90} height={32} borderRadius={16} />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Skeleton width="60%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="75%" height={14} borderRadius={4} />
            </View>
            <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Skeleton width="50%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="65%" height={14} borderRadius={4} />
            </View>
          </View>
        </ScrollView>
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
                            color={theme.colors.primary} 
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: theme.borderRadius.round, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  searchContainerWrapper: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.lg, paddingHorizontal: 16, height: 50 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, height: '100%', paddingVertical: 0 },
  searchHintText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  trackerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.borderRadius.md, marginTop: 16, justifyContent: 'center', gap: 8 },
  trackerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chipsWrapper: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chipsContainer: { paddingHorizontal: 24, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.secondary, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: theme.colors.surface },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 60, gap: 32 },
  categoryBlock: { gap: 16 },
  categoryHeader: { marginBottom: 4 },
  catTitleRow: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 8, gap: 4 },
  categoryBadge: { color: theme.colors.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 18 },
  lawRef: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  catDesc: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },
  articleCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  articleCardExpanded: { borderColor: '#CCFBF1', backgroundColor: '#F0FDFA', shadowColor: theme.colors.primary },
  articleTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  articleTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', flex: 1, flexWrap: 'wrap', lineHeight: 24 },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  articleExcerpt: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16 },
  lawSectionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.secondary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.sm, gap: 6, maxWidth: '100%' },
  lawSectionText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1, flexWrap: 'wrap' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
});
