import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, BookOpen, MessageSquare, ClipboardList, Clock, CheckCircle2, Loader2, HelpCircle, XCircle, Users, AlertTriangle, Star } from 'lucide-react';
import styles from './PublicDashboard.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { documentGeneratorService } from '../../services/documentGeneratorService';
import { auditService } from '../../services/auditService';
import { triageService, type TriageLawyerMatch } from '../../services/triageService';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import GeneratedDocumentsModal from './GeneratedDocumentsModal';

type CaseItem = {
  id: string;
  title: string;
  status: string;
  attorney: string | null;
  updated_at: string;
  client_feedback: string | null;
};

type GeneratedDocumentItem = {
  id: string;
  templateSlug: string;
  templateTitle: string;
  generatedAt: string;
  status: string;
  content: string;
  fileName: string;
  preview: string;
};

const PublicDashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.first_name || 'Ka-LAYA';

  const [generatedDocuments, setGeneratedDocuments] = React.useState<GeneratedDocumentItem[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = React.useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = React.useState(false);
  const [cases, setCases] = React.useState<CaseItem[]>([]);
  const [isCasesLoading, setIsCasesLoading] = React.useState(false);
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = React.useState<string | null>(null);

  // Feedback modal state
  const [feedbackCaseId, setFeedbackCaseId] = React.useState<string | null>(null);
  const [feedbackValue, setFeedbackValue] = React.useState('');
  const [feedbackRating, setFeedbackRating] = React.useState<number>(0);
  const [feedbackRatingHover, setFeedbackRatingHover] = React.useState<number>(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);
  const [feedbackDone, setFeedbackDone] = React.useState(false);

  // Re-select attorney modal state
  const [reSelectCase, setReSelectCase] = React.useState<CaseItem | null>(null);
  const [reSelectMatches, setReSelectMatches] = React.useState<TriageLawyerMatch[]>([]);
  const [reSelectLoading, setReSelectLoading] = React.useState(false);
  const [reSelectSelected, setReSelectSelected] = React.useState('');
  const [reSelectConfirm, setReSelectConfirm] = React.useState(false);
  const [reSelectRequesting, setReSelectRequesting] = React.useState(false);
  const [reSelectDone, setReSelectDone] = React.useState(false);
  const [reSelectError, setReSelectError] = React.useState('');

  const buildDocumentFileName = (templateSlug: string, generatedAt: string) => {
    const created = new Date(generatedAt);
    if (Number.isNaN(created.getTime())) {
      return `${templateSlug || 'document'}-draft.txt`;
    }

    const year = created.getFullYear();
    const month = String(created.getMonth() + 1).padStart(2, '0');
    const day = String(created.getDate()).padStart(2, '0');
    const hours = String(created.getHours()).padStart(2, '0');
    const minutes = String(created.getMinutes()).padStart(2, '0');
    return `${templateSlug || 'document'}-${year}${month}${day}-${hours}${minutes}.txt`;
  };

  const prettifyTemplateSlug = (slug: string) => {
    if (!slug) return 'Generated Document';
    return slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const buildDocumentPreview = (content: string) => {
    const normalized = String(content || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return 'No preview available.';
    if (normalized.length <= 140) return normalized;
    return `${normalized.slice(0, 137)}...`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date(dateStr));
  };

  const getTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) return '1 month ago';
    return `${diffInMonths} months ago`;
  };

  const fetchCases = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsCasesLoading(true);
    // Reset any timed-out Pending Acceptance cases before rendering
    await supabase.rpc('escalate_timed_out_cases');
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, status, updated_at, client_feedback, attorney:attorney_id(first_name, last_name)')
      .eq('client_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(2);

    if (!error && data) {
      const mapped: CaseItem[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        attorney: row.attorney
          ? [row.attorney.first_name, row.attorney.last_name].filter(Boolean).join(' ')
          : null,
        updated_at: row.updated_at,
        client_feedback: row.client_feedback ?? null,
      }));
      setCases(mapped);
    }
    setIsCasesLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchCases();

    if (!profile?.id) return;
    const channel = supabase
      .channel(`dashboard-cases-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `client_id=eq.${profile.id}` }, fetchCases)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCases, profile?.id]);

  React.useEffect(() => {
    const fetchGeneratedDocuments = async () => {
      if (!profile?.id) return;
      setIsDocumentsLoading(true);

      const { data, error } = await supabase
        .from('generated_documents')
        .select('id, template_slug, generated_text, created_at, status')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setGeneratedDocuments([]);
        setIsDocumentsLoading(false);
        return;
      }

      const slugs = Array.from(new Set(data.map((row) => row.template_slug).filter(Boolean)));
      let templateTitleMap: Record<string, string> = {};

      if (slugs.length > 0) {
        const { data: templates } = await supabase
          .from('document_templates')
          .select('slug, title')
          .in('slug', slugs);

        templateTitleMap = (templates || []).reduce<Record<string, string>>((acc, row) => {
          if (row.slug) {
            acc[row.slug] = row.title || prettifyTemplateSlug(row.slug);
          }
          return acc;
        }, {});
      }

      const mappedDocuments: GeneratedDocumentItem[] = data.map((row) => {
        const templateSlug = row.template_slug || 'document';
        const title = templateTitleMap[templateSlug] || prettifyTemplateSlug(templateSlug);
        const generatedAt = row.created_at || new Date().toISOString();

        return {
          id: row.id,
          templateSlug,
          templateTitle: title,
          generatedAt,
          status: row.status || 'generated',
          content: row.generated_text || '',
          fileName: buildDocumentFileName(templateSlug, generatedAt),
          preview: buildDocumentPreview(row.generated_text || ''),
        };
      });

      setGeneratedDocuments(mappedDocuments);
      setIsDocumentsLoading(false);
    };

    fetchGeneratedDocuments();
  }, [profile?.id]);

  const ACTIVE_STATUSES = ['Pending Acceptance', 'In Progress'];
  const CLOSED_STATUSES = ['Closed - Won', 'Closed - Lost', 'Dropped'];

  const handleSubmitFeedback = async () => {
    if (!feedbackCaseId || !feedbackValue) return;
    setFeedbackSubmitting(true);
    await supabase.from('cases').update({
      client_feedback: feedbackValue,
      feedback_rating: feedbackRating || null,
    }).eq('id', feedbackCaseId);
    setCases(prev => prev.map(c => c.id === feedbackCaseId ? { ...c, client_feedback: feedbackValue } : c));
    auditService.log('Case Feedback Submitted', `Client rated case ${feedbackCaseId}: ${feedbackValue}${feedbackRating ? ` (${feedbackRating}/5 stars)` : ''}`);
    setFeedbackSubmitting(false);
    setFeedbackDone(true);
  };

  const handleWithdraw = async (c: CaseItem) => {
    setWithdrawingId(c.id);
    const now = new Date().toISOString();
    await supabase.from('cases').update({ status: 'Withdrawn', closed_at: now }).eq('id', c.id);

    // System message in thread if one exists
    const { data: thread } = await supabase
      .from('message_threads').select('id').eq('case_id', c.id).maybeSingle();
    if (thread) {
      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        thread_id: thread.id,
        sender_id: profile!.id,
        content: `This case has been withdrawn by the client.`,
      });
    }

    // Notify attorney if assigned
    if (c.attorney) {
      const { data: attyRow } = await supabase
        .from('cases').select('attorney_id').eq('id', c.id).single();
      if (attyRow?.attorney_id) {
        await supabase.from('notifications').insert({
          user_id: attyRow.attorney_id,
          title: 'Case Withdrawn',
          body: `Your client has withdrawn the case: "${c.title}".`,
          link: '/legal/messages',
        });
      }
    }

    auditService.log('Case Withdrawn', `Withdrew case: "${c.title}"`);
    setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Withdrawn' } : x));
    setConfirmWithdrawId(null);
    setWithdrawingId(null);
  };

  const openReSelect = async (c: CaseItem) => {
    if (!profile?.id) return;
    setReSelectCase(c);
    setReSelectMatches([]);
    setReSelectSelected('');
    setReSelectConfirm(false);
    setReSelectDone(false);
    setReSelectError('');
    setReSelectLoading(true);
    const matches = await triageService.getMatchesForCase(c.id, profile.id);
    setReSelectMatches(matches);
    setReSelectSelected(matches[0]?.attorneyId || '');
    setReSelectLoading(false);
  };

  const handleReSelectRequest = async () => {
    if (!reSelectCase || !reSelectSelected || !profile?.id) return;
    setReSelectRequesting(true);
    setReSelectError('');
    const { error } = await supabase
      .from('cases')
      .update({ attorney_id: reSelectSelected, status: 'Pending Acceptance', attorney_assigned_at: new Date().toISOString() })
      .eq('id', reSelectCase.id);
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: reSelectSelected,
        title: 'New Case Pending Your Confirmation',
        body: 'A client has selected you for their legal case. Please review it in your Cases page and accept or decline.',
        link: '/legal/cases',
      });
      auditService.log('Attorney Matched', `Re-selected attorney ${reSelectSelected} for case ${reSelectCase.id}`);
      setCases(prev => prev.map(c => c.id === reSelectCase.id ? { ...c, status: 'Pending Acceptance' } : c));
      setReSelectDone(true);
    } else {
      setReSelectError('Hindi maipadala ang kahilingan. Subukan ulit.');
    }
    setReSelectRequesting(false);
  };

  const getCaseStatusType = (status: string): 'warning' | 'success' | 'muted' => {
    if (['Closed - Won'].includes(status)) return 'success';
    if (['Pending Triage', 'Closed - Lost'].includes(status)) return 'muted';
    return 'warning';
  };

  const getCaseStatusIcon = (type: 'warning' | 'success' | 'muted') => {
    if (type === 'success') return <CheckCircle2 size={12} />;
    if (type === 'warning') return <Clock size={12} />;
    return <HelpCircle size={12} />;
  };

  return (
    <div className={styles.dashboard}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <h1 className={styles.greetTitle}>Kumusta, {firstName}!</h1>
        <p className={styles.greetSub}>Ano ang kailangan mo ngayon?</p>
      </div>

      {/* Primary Action Cards — Full Width Grid */}
      <div className={styles.actionsGrid}>
        <Link to="/public/triage" className={`${styles.actionCard} ${styles.actionPrimary}`}>
          <div className={styles.actionIcon}>
            <ClipboardList size={28} />
          </div>
          <div className={styles.actionText}>
            <h2>Humanap ng Legal Help</h2>
            <p>Sagutin ang mga tanong para ma-match ka sa libreng abogado.</p>
          </div>
          <ArrowRight size={20} className={styles.actionArrow} />
        </Link>

        <Link to="/public/messages" className={`${styles.actionCard} ${styles.actionDefault}`}>
          <div className={styles.actionIcon}>
            <MessageSquare size={28} />
          </div>
          <div className={styles.actionText}>
            <h2>Mga Mensahe</h2>
            <p>Kausapin ang iyong assigned na attorney o support team.</p>
          </div>
          <ArrowRight size={20} className={styles.actionArrow} />
        </Link>

        <Link to="/public/documents" className={`${styles.actionCard} ${styles.actionDefault}`}>
          <div className={styles.actionIcon}>
            <FileText size={28} />
          </div>
          <div className={styles.actionText}>
            <h2>Gumawa ng Legal Letter</h2>
            <p>Gumawa ng demand letter o reklamo nang mabilis at libre.</p>
          </div>
          <ArrowRight size={20} className={styles.actionArrow} />
        </Link>

        <Link to="/public/rights" className={`${styles.actionCard} ${styles.actionDefault}`}>
          <div className={styles.actionIcon}>
            <BookOpen size={28} />
          </div>
          <div className={styles.actionText}>
            <h2>Alamin ang Iyong Karapatan</h2>
            <p>Mga madaling basahing guides tungkol sa batas ng Pilipinas.</p>
          </div>
          <ArrowRight size={20} className={styles.actionArrow} />
        </Link>
      </div>

      {/* Cases Section */}
      <div className={styles.casesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <h2 className={styles.sectionTitle}>Mga Kaso Ko</h2>
            {cases.length > 0 && <span className={styles.caseCount}>{cases.length}</span>}
          </div>
          <Link to="/public/cases" className={styles.viewAllLink}>
            Tingnan Lahat <ArrowRight size={16} />
          </Link>
        </div>

        {isCasesLoading ? (
          <div className={styles.casesList}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton className={styles.skeletonTitle} />
                <div className={styles.skeletonMeta}>
                  <Skeleton className={styles.skeletonBadge} />
                  <Skeleton className={styles.skeletonAttorney} />
                </div>
                <Skeleton className={styles.skeletonDate} />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={40} strokeWidth={1.5} />
            <p>Wala kang kaso sa ngayon. I-try ang Smart Triage para makahanap ng abogado.</p>
            <Link to="/public/triage" className={styles.createDocBtn}>
              Magsimula ng Triage
            </Link>
          </div>
        ) : (
          <div className={styles.casesList}>
            {cases.map((c) => {
              const type = getCaseStatusType(c.status);
              const isActive = ACTIVE_STATUSES.includes(c.status);
              const isConfirming = confirmWithdrawId === c.id;
              const isWithdrawing = withdrawingId === c.id;
              return (
                <div key={c.id} className={styles.caseCard}>
                  <div className={styles.caseInfo}>
                    <h3 className={styles.caseTitle}>{c.title}</h3>
                    <div className={styles.caseMeta}>
                      <span className={`${styles.statusBadge} ${styles[type]}`}>
                        {getCaseStatusIcon(type)}
                        {c.status}
                      </span>
                      {c.attorney && (
                        <>
                          <span className={styles.caseDivider}>•</span>
                          <span className={styles.caseAttorney}>Atty. {c.attorney}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.caseActions}>
                    <div className={styles.caseDate}>
                      <span>Updated: {new Date(c.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {c.status === 'Pending Triage' && (
                      <button
                        onClick={() => openReSelect(c)}
                        style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: '1px solid var(--color-primary)', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Users size={12} /> Select Attorney
                      </button>
                    )}
                    {isActive && !isConfirming && (
                      <button
                        onClick={() => setConfirmWithdrawId(c.id)}
                        style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Withdraw
                      </button>
                    )}
                    {isConfirming && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Sure?</span>
                        <button
                          onClick={() => handleWithdraw(c)}
                          disabled={isWithdrawing}
                          style={{ fontSize: '0.75rem', color: 'white', background: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {isWithdrawing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmWithdrawId(null)}
                          style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                        >
                          No
                        </button>
                      </div>
                    )}
                    {CLOSED_STATUSES.includes(c.status) && !c.client_feedback && (
                      <button
                        onClick={() => { setFeedbackCaseId(c.id); setFeedbackValue(''); setFeedbackRating(0); setFeedbackRatingHover(0); setFeedbackDone(false); }}
                        style={{ fontSize: '0.75rem', color: 'var(--color-warning, #f59e0b)', background: 'none', border: '1px solid var(--color-warning, #f59e0b)', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Star size={12} /> Rate
                      </button>
                    )}
                    {CLOSED_STATUSES.includes(c.status) && c.client_feedback && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        ✓ Rated
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Generated Documents Section */}
      <div className={styles.documentsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <h2 className={styles.sectionTitle}>Mga Kamakailang Dokumento</h2>
            {generatedDocuments.length > 0 && (
              <span className={styles.caseCount}>{generatedDocuments.length}</span>
            )}
          </div>
          {generatedDocuments.length > 0 && (
            <button onClick={() => setIsDocumentsModalOpen(true)} className={styles.viewAllLink} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
              Tingnan Lahat <ArrowRight size={16} />
            </button>
          )}
        </div>

        {isDocumentsLoading ? (
          <div className={styles.documentList}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.skeletonDocumentItem}>
                <Skeleton className={styles.skeletonIcon} />
                <div className={styles.skeletonDocInfo}>
                  <Skeleton className={styles.skeletonDocTitle} />
                  <Skeleton className={styles.skeletonDocDate} />
                  <Skeleton className={styles.skeletonDocPreview} />
                  <Skeleton className={styles.skeletonDocPreview2} />
                </div>
              </div>
            ))}
          </div>
        ) : generatedDocuments.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={40} strokeWidth={1.5} />
            <p>Wala ka pang nagagawang dokumento.</p>
            <Link to="/public/documents" className={styles.createDocBtn}>
              Gumawa Ngayon
            </Link>
          </div>
        ) : (
          <div className={styles.documentList}>
            {generatedDocuments.slice(0, 2).map((doc) => (
              <div key={doc.id} className={styles.documentItem}>
                <div className={styles.documentIconWrapper}>
                  <FileText size={20} className={styles.documentIcon} />
                </div>
                <div className={styles.documentInfo}>
                  <h3 className={styles.documentName}>{doc.templateTitle}</h3>
                  <p className={styles.documentDate}>
                    Gawa noong {getTimeAgo(doc.generatedAt)} ({formatDate(doc.generatedAt)})
                  </p>
                  <p className={styles.documentPreview}>{doc.preview}</p>
                </div>
                <div className={styles.documentActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => documentGeneratorService.downloadDraft(doc.fileName, doc.content)}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Feedback modal */}
      {feedbackCaseId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-secondary)' }}>I-rate ang iyong karanasan</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{cases.find(c => c.id === feedbackCaseId)?.title}</p>
              </div>
              <button onClick={() => setFeedbackCaseId(null)} style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            {feedbackDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', textAlign: 'center' }}>
                <CheckCircle2 size={40} color="var(--color-success)" strokeWidth={1.5} />
                <h4 style={{ margin: 0, color: 'var(--color-secondary)' }}>Salamat sa iyong feedback!</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Nakatutulong ito sa pagpapabuti ng serbisyo ng LAYA.</p>
                <button onClick={() => setFeedbackCaseId(null)} style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  Isara
                </button>
              </div>
            ) : (
              <>
                {/* ── Star picker ── */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.625rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    I-rate ang iyong abogado:
                  </p>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFeedbackRating(feedbackRating === n ? 0 : n)}
                        onMouseEnter={() => setFeedbackRatingHover(n)}
                        onMouseLeave={() => setFeedbackRatingHover(0)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', lineHeight: 0, transition: 'transform 0.1s' }}
                      >
                        <Star
                          size={32}
                          fill={n <= (feedbackRatingHover || feedbackRating) ? '#F59E0B' : 'none'}
                          color={n <= (feedbackRatingHover || feedbackRating) ? '#F59E0B' : '#CBD5E1'}
                        />
                      </button>
                    ))}
                  </div>
                  {(feedbackRatingHover || feedbackRating) > 0 && (
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>
                      {(['', 'Napakasama', 'Masama', 'Okay lang', 'Maganda', 'Napakaganda'])[feedbackRatingHover || feedbackRating]}
                    </p>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Nalutas ba ang iyong problema?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {[
                    { value: 'Nalutas', label: 'Nalutas', desc: 'Natugunan nang buo ang aking problema.' },
                    { value: 'Bahagi lang', label: 'Bahagi lang', desc: 'Natugunan ang ilan, pero may natitirang isyu.' },
                    { value: 'Hindi nalutas', label: 'Hindi nalutas', desc: 'Hindi natugunan ang aking problema.' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFeedbackValue(opt.value)}
                      style={{ textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '10px', border: `2px solid ${feedbackValue === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`, backgroundColor: feedbackValue === opt.value ? 'rgba(37,99,235,0.04)' : 'var(--color-background)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    >
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-secondary)' }}>{opt.label}</p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackValue || feedbackSubmitting}
                  style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: feedbackValue ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: feedbackValue ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {feedbackSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Isumite ang Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Re-select attorney modal */}
      {reSelectCase && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-secondary)' }}>Pumili ng Abogado</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{reSelectCase.title}</p>
              </div>
              <button
                onClick={() => setReSelectCase(null)}
                style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {reSelectDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(245,158,11,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={28} color="var(--color-warning)" />
                </div>
                <h4 style={{ margin: 0, color: 'var(--color-secondary)' }}>Naghihintay sa Tugon ng Abogado</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Aabisuhan ka kapag tinanggap o tinanggihan ng abogado ang iyong kaso.
                </p>
                <button
                  onClick={() => setReSelectCase(null)}
                  style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Isara
                </button>
              </div>
            ) : reSelectConfirm ? (
              /* Confirmation step */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Sigurado ka bang gusto mo si:</p>
                {(() => {
                  const chosen = reSelectMatches.find(m => m.attorneyId === reSelectSelected);
                  return chosen ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                        {chosen.name.split(' ').slice(0, 2).map(p => p.charAt(0)).join('')}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>{chosen.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{chosen.score}% match · {chosen.province}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
                {reSelectError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.875rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                    <AlertTriangle size={15} /> {reSelectError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setReSelectConfirm(false)}
                    style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Bumalik
                  </button>
                  <button
                    onClick={handleReSelectRequest}
                    disabled={reSelectRequesting}
                    style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {reSelectRequesting ? <Loader2 size={15} className="animate-spin" /> : null}
                    Oo, piliin siya
                  </button>
                </div>
              </div>
            ) : reSelectLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <Loader2 size={22} className="animate-spin" color="var(--color-primary)" /> Kinukuha ang mga available na abogado...
              </div>
            ) : reSelectMatches.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <HelpCircle size={32} strokeWidth={1.5} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Walang available na verified attorney sa kasalukuyan. Subukan muli mamaya.</p>
              </div>
            ) : (
              /* Attorney list */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reSelectMatches.map(match => (
                  <div
                    key={match.attorneyId}
                    onClick={() => setReSelectSelected(match.attorneyId)}
                    style={{ padding: '1rem', borderRadius: '10px', border: `2px solid ${reSelectSelected === match.attorneyId ? 'var(--color-primary)' : 'var(--color-border)'}`, backgroundColor: reSelectSelected === match.attorneyId ? 'rgba(37,99,235,0.04)' : 'var(--color-background)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {match.name.split(' ').slice(0, 2).map(p => p.charAt(0)).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>{match.name}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{match.score}% match · {match.province} · {match.activeCases} active cases</p>
                      </div>
                      {reSelectSelected === match.attorneyId && <CheckCircle2 size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                    </div>
                    {match.reasons.length > 0 && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {match.reasons.slice(0, 2).map(r => `• ${r}`).join('  ')}
                      </p>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { if (reSelectSelected) setReSelectConfirm(true); }}
                  disabled={!reSelectSelected}
                  style={{ marginTop: '0.25rem', padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: reSelectSelected ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: reSelectSelected ? 'pointer' : 'not-allowed' }}
                >
                  Piliin ang Napiling Abogado
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <GeneratedDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        documents={generatedDocuments}
        onDownload={(doc) => documentGeneratorService.downloadDraft(doc.fileName, doc.content)}
      />
    </div>
  );
};

export default PublicDashboard;
