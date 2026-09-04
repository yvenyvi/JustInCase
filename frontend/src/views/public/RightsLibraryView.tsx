import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, BookOpen, Home, Briefcase, Users, ShieldAlert, Scale, Globe, Heart, Baby, GraduationCap, TreePine, Map, FileText, Lock, Landmark, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { rightsService, RightsCategory, RightsArticle } from '../../services/rightsService';
import styles from './RightsLibrary.module.css';
import Skeleton from '../../components/Skeleton';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<RightsCategory[]>([]);
  const [articlesByCategory, setArticlesByCategory] = useState<Record<string, RightsArticle[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

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
        <span className={styles.badge}>Know Your Rights</span>
        <h1 className={styles.title}>Legal Rights Library</h1>
        <p className={styles.subtitle}>
          {categories.length} na kategorya at {Object.values(articlesByCategory).flat().length} na artikulo — batay sa Constitution, Republic Acts, at Labor Code ng Pilipinas.
        </p>
      </div>

      <div className={styles.searchWrapper}>
        <Search size={20} color="var(--color-text-muted)" />
        <input
          type="text"
          placeholder="Maghanap ng topic (e.g. 'OFW', 'sahod', 'VAWC', 'senior')"
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.categoriesGrid}>
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
      </div>
    </div>
  );
};

export default RightsLibraryView;
