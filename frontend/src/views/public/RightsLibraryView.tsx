import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, BookOpen, Home, Briefcase, Users, ShieldAlert, Scale, Globe, Heart, Baby, GraduationCap, TreePine, Map, FileText, Lock, Landmark, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { rightsService, RightsCategory, RightsArticle } from '../../services/rightsService';
import styles from './RightsLibrary.module.css';
import Skeleton from '../../components/Skeleton';
import { LegalSource, searchLegalSources } from '../../services/legalResearchService';
import { useLocation } from 'react-router-dom';

type LibraryTab = 'guides' | 'cases' | 'laws' | 'bills';

// Map icon names from DB to actual components
const iconMap: Record<string, React.ElementType> = {
  Scale, Home, Briefcase, Users, ShieldAlert, Globe, Heart,
  Baby, GraduationCap, TreePine, Map, FileText, Lock, Landmark,
  AlertTriangle, BookOpen,
  // Fallbacks for icons not in lucide or not imported
  Accessibility: Heart, UserCheck: Users, Stethoscope: Heart,
  PawPrint: Heart, Mountain: TreePine, Ban: ShieldAlert,
  Gavel: Scale, ShieldOff: ShieldAlert, Receipt: FileText,
};

const extractUrlFromText = (value?: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] ?? null;
};

const normalizeExternalUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
};

const getCategoryUrl = (category: RightsCategory): string | null => {
  const candidates = [
    category.source_url,
    category.reference_url,
    category.url,
    category.link,
    extractUrlFromText(category.law_reference),
  ];

  return candidates
    .map(normalizeExternalUrl)
    .find((url): url is string => Boolean(url)) ?? null;
};

const getArticleUrl = (article: RightsArticle): string | null => {
  const candidates = [
    article.article_url,
    article.source_url,
    article.reference_url,
    article.url,
    article.link,
    extractUrlFromText(article.law_section),
    extractUrlFromText(article.detail),
  ];

  return candidates
    .map(normalizeExternalUrl)
    .find((url): url is string => Boolean(url)) ?? null;
};

const RightsLibraryView = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<RightsCategory[]>([]);
  const [articlesByCategory, setArticlesByCategory] = useState<Record<string, RightsArticle[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>('guides');
  const [researchResults, setResearchResults] = useState<LegalSource[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    const state = location.state as { query?: string; sources?: LegalSource[] } | null;
    if (state?.query) setSearchTerm(state.query);
    if (state?.sources) {
      setActiveTab('cases');
      setResearchResults(state.sources);
    }
  }, [location.state]);

  const runResearch = async () => {
    if (!searchTerm.trim() || (activeTab !== 'cases' && activeTab !== 'laws')) return;
    setIsResearching(true);
    setResearchError(null);
    try {
      const dataset = activeTab === 'cases' ? 'jurisprudence' : 'republic-acts';
      const data = await searchLegalSources(searchTerm, [dataset], 8);
      setResearchResults(data.sources);
      if (data.unavailable.length) setResearchError('Some external legal sources are temporarily unavailable.');
    } catch (error) {
      setResearchResults([]);
      setResearchError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setIsResearching(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'bills') return;
    const timer = window.setTimeout(async () => {
      try {
        const query = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : '';
        const response = await fetch(`https://open-congress-api.bettergov.ph/api/documents?limit=20&sort=date_filed&dir=desc${query}`);
        const payload = await response.json();
        setBills(payload?.data || []);
      } catch { setBills([]); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeTab, searchTerm]);

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleArticle = (id: string) => {
    setExpandedArticleId(prev => prev === id ? null : id);
  };

  const handleArticleClick = (article: RightsArticle, fallbackCategoryUrl: string | null) => {
    const articleUrl = getArticleUrl(article);
    if (articleUrl) {
      openExternal(articleUrl);
      return;
    }

    if (fallbackCategoryUrl) {
      openExternal(fallbackCategoryUrl);
      return;
    }

    toggleArticle(article.id);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await rightsService.getCategories();
        setCategories(cats);
        const allArticles = await rightsService.getAllArticles();
        const grouped: Record<string, RightsArticle[]> = {};
        allArticles.forEach(a => {
          if (!grouped[a.category_id]) grouped[a.category_id] = [];
          grouped[a.category_id].push(a);
        });
        setArticlesByCategory(grouped);
      } catch (err) {
        console.error('Error loading rights library:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredCategories = categories.map(cat => {
    const articles = articlesByCategory[cat.id] || [];
    const q = searchTerm.toLowerCase();
    const catMatch = cat.title.toLowerCase().includes(q) || (cat.subtitle || '').toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
    const matchingArticles = articles.filter(a => a.title.toLowerCase().includes(q) || (a.detail || '').toLowerCase().includes(q) || (a.law_section || '').toLowerCase().includes(q));
    return {
      ...cat,
      displayArticles: catMatch ? articles : matchingArticles,
      hasMatch: !searchTerm || catMatch || matchingArticles.length > 0
    };
  }).filter(c => c.hasMatch);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton style={{ height: 24, width: 140, borderRadius: 12, marginBottom: 8 }} />
          <Skeleton style={{ height: 32, width: '40%', borderRadius: 6, marginBottom: 8 }} />
          <Skeleton style={{ height: 16, width: '60%', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
                <Skeleton style={{ height: 18, width: '60%', borderRadius: 4 }} />
              </div>
              <Skeleton style={{ height: 14, width: '90%', borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ height: 14, width: '75%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>Philippine Legal Research</span>
        <h1 className={styles.title}>Legal Library</h1>
        <p className={styles.subtitle}>
          {categories.length} na kategorya at {Object.values(articlesByCategory).flat().length} na artikulo — batay sa Constitution, Republic Acts, at Labor Code ng Pilipinas.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', margin: '1.25rem 0' }}>
        {([['guides', 'Guides'], ['cases', 'Cases'], ['laws', 'Laws'], ['bills', 'Pending Bills']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setActiveTab(id); setSearchTerm(''); setResearchResults([]); }} className={activeTab === id ? styles.clearBtn : ''} style={activeTab === id ? undefined : { padding: '.7rem 1rem', borderRadius: '999px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      <div className={styles.searchWrapper}>
        <Search size={20} color="var(--color-text-muted)" />
        <input
          type="text"
          placeholder={activeTab === 'guides' ? "Maghanap ng topic (e.g. 'OFW', 'sahod', 'VAWC')" : activeTab === 'bills' ? 'Search pending House or Senate bills' : activeTab === 'cases' ? 'Search Supreme Court cases' : 'Search Republic Acts'}
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {(activeTab === 'cases' || activeTab === 'laws') && (
        <div>
          <button className={styles.clearBtn} onClick={() => void runResearch()} disabled={isResearching || !searchTerm.trim()}>{isResearching ? 'Searching…' : 'Search Juris'}</button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>Juris summaries are AI-generated research aids. Verify findings against the authoritative source.</p>
          {researchError && <p style={{ color: '#b45309' }}>{researchError} <button onClick={() => void runResearch()}>Retry</button></p>}
          <div className={styles.categoriesGrid} style={{ marginTop: '1rem' }}>
            {researchResults.map(source => (
              <article key={`${source.dataset}-${source.id}`} className={styles.categoryCard}>
                <h3 className={styles.categoryTitle}>{source.title}</h3>
                {source.citation && <p className={styles.categoryLaw}>{source.citation}</p>}
                {source.summary && <p className={styles.categoryDesc}>{source.summary}</p>}
                <p><a href={source.url} target="_blank" rel="noreferrer">Juris record</a>{source.source_url && <> · <a href={source.source_url} target="_blank" rel="noreferrer">Authoritative source</a></>}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bills' && (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>Pending legislation supplied by Open Congress / BetterGov.ph.</p>
          <div className={styles.categoriesGrid}>
            {bills.map((bill: any) => (
              <article key={bill.id} className={styles.categoryCard}>
                <h3 className={styles.categoryTitle}>{bill.title || bill.long_title || bill.name}</h3>
                <p className={styles.categoryLaw}>{bill.name || bill.id} · {bill.status || 'Pending'}</p>
                <a href={`https://open-congress-api.bettergov.ph/view/documents/${bill.id}`} target="_blank" rel="noreferrer">View bill</a>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'guides' && <div className={styles.categoriesGrid}>
        {filteredCategories.length > 0 ? (
          filteredCategories.map(cat => {
            const IconComp = iconMap[cat.icon_name] || BookOpen;
            const categoryUrl = getCategoryUrl(cat);
            return (
              <div key={cat.id} className={styles.categoryCard}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryIcon}><IconComp size={22} /></div>
                  <div className={styles.categoryInfo}>
                    <h3 className={styles.categoryTitle}>{cat.title}{cat.subtitle ? ` (${cat.subtitle})` : ''}</h3>
                    {cat.law_reference && (
                      categoryUrl ? (
                        <a
                          className={styles.categoryLawLink}
                          href={categoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {cat.law_reference}
                        </a>
                      ) : (
                        <span className={styles.categoryLaw}>{cat.law_reference}</span>
                      )
                    )}
                  </div>
                </div>
                {cat.description && <p className={styles.categoryDesc}>{cat.description}</p>}
                <div className={styles.articlesHeader}>{searchTerm ? 'Matching Articles' : 'Mga Artikulo'}</div>
                {cat.displayArticles.map(a => {
                  const articleUrl = getArticleUrl(a) || categoryUrl;
                  const isExpanded = expandedArticleId === a.id;
                  return (
                    <div key={a.id}>
                      <div
                        className={`${styles.articleItem} ${articleUrl ? styles.articleItemLink : ''} ${isExpanded ? styles.articleItemActive : ''}`}
                        onClick={() => handleArticleClick(a, categoryUrl)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleArticleClick(a, categoryUrl);
                          }
                        }}
                      >
                        <span className={styles.articleText}>{a.title}</span>
                        {articleUrl ? (
                          <ExternalLink size={16} className={styles.articleArrow} />
                        ) : (
                          isExpanded ? <ChevronDown size={16} className={styles.articleArrow} /> : <ChevronRight size={16} className={styles.articleArrow} />
                        )}
                      </div>
                      {!articleUrl && isExpanded && (
                        <div className={styles.articleDetail}>
                          {a.detail && <p className={styles.articleDetailText}>{a.detail}</p>}
                          {a.law_section && <span className={styles.articleLawBadge}>📜 {a.law_section}</span>}
                          {!a.detail && !a.law_section && (
                            <p className={styles.articleDetailEmpty}>Wala pang karagdagang detalye para sa artikulong ito.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <BookOpen size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h2>Walang nahanap na resulta</h2>
            <p>Subukan ang ibang keywords gaya ng "upa", "sahod", o "VAWC".</p>
            <button onClick={() => setSearchTerm('')} className={styles.clearBtn}>I-clear ang Search</button>
          </div>
        )}
      </div>}
    </div>
  );
};

export default RightsLibraryView;
