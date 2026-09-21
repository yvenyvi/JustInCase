import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import { theme } from '../../shared/theme';
import { Skeleton } from '../../components/ui/Skeleton';
import { LegalSource, searchLegalSources } from '../../shared/legalResearch';

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
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<'guides' | 'cases' | 'laws'>(route.params?.initialTab || 'guides');
  const [searchTerm, setSearchTerm] = useState(route.params?.query || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<RightsCategory[]>([]);
  const [articles, setArticles] = useState<RightsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [researchResults, setResearchResults] = useState<LegalSource[]>(route.params?.initialSources || []);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const runResearch = async () => {
    if (activeTab === 'guides' || searchTerm.trim().length < 2) return;
    setIsResearching(true);
    setResearchError(null);
    try {
      const dataset = activeTab === 'cases' ? 'jurisprudence' : 'republic-acts';
      const data = await searchLegalSources(searchTerm.trim(), [dataset], 8);
      setResearchResults(activeTab === 'cases' ? data.jurisprudence : data.republic_acts);
    } catch (error: any) {
      setResearchError(error?.message || 'Legal research is temporarily unavailable.');
      setResearchResults([]);
    } finally {
      setIsResearching(false);
    }
  };

  useEffect(() => {
    if (route.params?.query && activeTab !== 'guides' && !route.params?.initialSources?.length) runResearch();
  }, []);

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
        <Text style={styles.headerTitle}>Legal Library</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainerWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder={activeTab === 'guides' ? 'Search guides by topic...' : 'Search Philippine law or a legal issue...'}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={runResearch}
            returnKeyType="search"
          />
          {activeTab !== 'guides' && (
            <Pressable onPress={runResearch} disabled={isResearching} accessibilityLabel="Search legal research">
              {isResearching ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="arrow-forward-circle" size={25} color={theme.colors.primary} />}
            </Pressable>
          )}
        </View>
        <Text style={styles.searchHintText}>
          {activeTab === 'guides' ? 'Browse plain-language guides or switch tabs to research cases and laws.' : 'Do not enter names, addresses, or confidential case details. Summaries are AI-generated research aids.'}
        </Text>
        <View style={styles.libraryTabs}>
          {(['guides', 'cases', 'laws'] as const).map(tab => (
            <Pressable key={tab} style={[styles.libraryTab, activeTab === tab && styles.libraryTabActive]} onPress={() => { setActiveTab(tab); setResearchResults([]); setResearchError(null); }}>
              <Text style={[styles.libraryTabText, activeTab === tab && styles.libraryTabTextActive]}>{tab === 'guides' ? 'Rights Guides' : tab === 'cases' ? 'Cases' : 'Laws'}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.libraryTab} onPress={() => navigation.navigate('PublicLegislationTracker' as never)}>
            <Text style={styles.libraryTabText}>Pending Bills</Text>
          </Pressable>
        </View>
      </View>

      {activeTab !== 'guides' ? (
        <ScrollView contentContainerStyle={styles.researchContent} showsVerticalScrollIndicator={false}>
          {researchError ? (
            <View style={styles.emptyState}><Ionicons name="cloud-offline-outline" size={48} color="#CBD5E1" /><Text style={styles.emptyTitle}>{researchError}</Text><Pressable style={styles.trackerBtn} onPress={runResearch}><Text style={styles.trackerBtnText}>Retry</Text></Pressable></View>
          ) : researchResults.length > 0 ? researchResults.map(source => (
            <View key={`${source.dataset}-${source.id}`} style={styles.sourceCard}>
              <Text style={styles.sourceCitation}>{source.citation || (source.dataset === 'jurisprudence' ? 'Supreme Court decision' : 'Republic Act')}</Text>
              <Text style={styles.sourceTitle}>{source.title}</Text>
              {!!source.summary && <Text style={styles.sourceSummary}>{source.summary}</Text>}
              <Text style={styles.aiNotice}>AI-generated research aid — verify against the authoritative source.</Text>
              <View style={styles.sourceActions}>
                <Pressable onPress={() => openUrl(source.url)}><Text style={styles.sourceLink}>View on Juris</Text></Pressable>
                {!!source.source_url && <Pressable onPress={() => openUrl(source.source_url)}><Text style={styles.sourceLink}>Authoritative source</Text></Pressable>}
              </View>
            </View>
          )) : (
            <View style={styles.emptyState}><Ionicons name="search-outline" size={48} color="#CBD5E1" /><Text style={styles.emptyTitle}>Search {activeTab === 'cases' ? 'Supreme Court cases' : 'Republic Acts'}</Text><Text style={styles.emptySubtitle}>Use a citation, doctrine, or plain-language legal question.</Text></View>
          )}
        </ScrollView>
      ) : isLoading ? (
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
                <Text style={[styles.chipText, !selectedCategoryId && styles.chipTextActive]}>All topics</Text>
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
  libraryTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  libraryTab: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: theme.colors.secondary, borderWidth: 1, borderColor: theme.colors.border },
  libraryTabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  libraryTabText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  libraryTabTextActive: { color: '#FFFFFF' },
  researchContent: { padding: 24, paddingBottom: 60, gap: 14 },
  sourceCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  sourceCitation: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  sourceTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  sourceSummary: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 10 },
  aiNotice: { color: theme.colors.warning, fontSize: 11, lineHeight: 16, marginTop: 12 },
  sourceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 },
  sourceLink: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
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
