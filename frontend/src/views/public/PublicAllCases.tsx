import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, HelpCircle, XCircle, Users, Star,
  Loader2, AlertTriangle, Briefcase, Eye, Paperclip,
  ClipboardList, FileText, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import { triageService, type TriageLawyerMatch } from '../../services/triageService';
import styles from './PublicAllCases.module.css';

type CaseItem = {
  id: string;
  title: string;
  status: string;
  attorney: string | null;
  attorney_id: string | null;
  updated_at: string;
  created_at: string;
  client_feedback: string | null;
  closed_at: string | null;
  attorney_assigned_at: string | null;
};

type CaseDetail = {
  description: string | null;
  closing_notes: string | null;
  triage: {
    issue_type: string;
    summary: string | null;
    match_percentage: number | null;
  } | null;
  attachments: {
    url: string;
    name: string;
    type: string | null;
    created_at: string;
    sender: string;
  }[];
  serviceLogs: {
    id: string;
    description: string;
    hours: number;
    is_verified: boolean;
    evidence_url: string | null;
    evidence_name: string | null;
    created_at: string;
  }[];
};

type TabKey = 'all' | 'active' | 'pending' | 'history';

const ACTIVE_STATUSES = ['Pending Acceptance', 'In Progress'];
const PENDING_STATUSES = ['Pending Triage'];
const HISTORY_STATUSES = ['Closed - Won', 'Closed - Lost', 'Dropped', 'Withdrawn'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',     label: 'Lahat' },
  { key: 'active',  label: 'Aktibo' },
  { key: 'pending', label: 'Naghihintay' },
  { key: 'history', label: 'Kasaysayan' },
];

const getStatusType = (status: string): 'warning' | 'success' | 'muted' => {
  if (status === 'Closed - Won') return 'success';
  if (['Pending Triage', 'Closed - Lost', 'Dropped', 'Withdrawn'].includes(status)) return 'muted';
  return 'warning';
};

const getStatusIcon = (type: 'warning' | 'success' | 'muted') => {
  if (type === 'success') return <CheckCircle2 size={12} />;
  if (type === 'warning') return <Clock size={12} />;
  return <HelpCircle size={12} />;
};

const fmt = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TIMEOUT_HOURS = 48;

const getCountdown = (assignedAt: string | null): { label: string; urgent: boolean } | null => {
  if (!assignedAt) return null;
  const hoursElapsed = (Date.now() - new Date(assignedAt).getTime()) / 3_600_000;
  const remaining = TIMEOUT_HOURS - hoursElapsed;
  if (remaining <= 0) return null; // escalation will handle it on next load
  const urgent = remaining <= 12;
  const h = Math.floor(remaining);
  const m = Math.round((remaining - h) * 60);
  const label = h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
  return { label, urgent };
};

const getFileIcon = (type: string | null) => {
  if (!type) return <Paperclip size={15} />;
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📎';
};

const PublicAllCases = () => {
  const { profile } = useAuth();

  const [cases, setCases] = React.useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>('all');

  const [confirmWithdrawId, setConfirmWithdrawId] = React.useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);

  const [feedbackCaseId, setFeedbackCaseId] = React.useState<string | null>(null);
  const [feedbackValue, setFeedbackValue] = React.useState('');
  const [feedbackComment, setFeedbackComment] = React.useState('');
  const [feedbackRating, setFeedbackRating] = React.useState<number>(0);
  const [feedbackRatingHover, setFeedbackRatingHover] = React.useState<number>(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);
  const [feedbackDone, setFeedbackDone] = React.useState(false);

  const [reSelectCase, setReSelectCase] = React.useState<CaseItem | null>(null);
  const [reSelectMatches, setReSelectMatches] = React.useState<TriageLawyerMatch[]>([]);
  const [reSelectLoading, setReSelectLoading] = React.useState(false);
  const [reSelectSelected, setReSelectSelected] = React.useState('');
  const [reSelectConfirm, setReSelectConfirm] = React.useState(false);
  const [reSelectRequesting, setReSelectRequesting] = React.useState(false);
  const [reSelectDone, setReSelectDone] = React.useState(false);
  const [reSelectError, setReSelectError] = React.useState('');

  // Case detail modal state
  const [detailCase, setDetailCase] = React.useState<CaseItem | null>(null);
  const [caseDetail, setCaseDetail] = React.useState<CaseDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  const fetchCases = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);

    // Run escalation first so any timed-out cases are reset before rendering
    await supabase.rpc('escalate_timed_out_cases');

    const { data, error } = await supabase
      .from('cases')
      .select('id, title, status, updated_at, created_at, client_feedback, closed_at, attorney_id, attorney_assigned_at, attorney:attorney_id(first_name, last_name)')
      .eq('client_id', profile.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setCases(data.map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        attorney: row.attorney
          ? [row.attorney.first_name, row.attorney.last_name].filter(Boolean).join(' ')
          : null,
        attorney_id: row.attorney_id ?? null,
        updated_at: row.updated_at,
        created_at: row.created_at,
        client_feedback: row.client_feedback ?? null,
        closed_at: row.closed_at ?? null,
        attorney_assigned_at: row.attorney_assigned_at ?? null,
      })));
    }
    setIsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchCases();
    if (!profile?.id) return;
    const ch = supabase
      .channel(`all-cases-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `client_id=eq.${profile.id}` }, fetchCases)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCases, profile?.id]);

  const counts: Record<TabKey, number> = React.useMemo(() => ({
    all:     cases.length,
    active:  cases.filter(c => ACTIVE_STATUSES.includes(c.status)).length,
    pending: cases.filter(c => PENDING_STATUSES.includes(c.status)).length,
    history: cases.filter(c => HISTORY_STATUSES.includes(c.status)).length,
  }), [cases]);

  const visible = React.useMemo(() => {
    if (activeTab === 'all')     return cases;
    if (activeTab === 'active')  return cases.filter(c => ACTIVE_STATUSES.includes(c.status));
    if (activeTab === 'pending') return cases.filter(c => PENDING_STATUSES.includes(c.status));
    return cases.filter(c => HISTORY_STATUSES.includes(c.status));
  }, [cases, activeTab]);

  const openDetail = React.useCallback(async (c: CaseItem) => {
    setDetailCase(c);
    setCaseDetail(null);
    setIsDetailLoading(true);

    // 1. Case description + closing notes
    const { data: caseRow } = await supabase
      .from('cases')
      .select('description, closing_notes')
      .eq('id', c.id)
      .single();

    // 2. Triage assessment
    const { data: triageRow } = await supabase
      .from('triage_assessments')
      .select('issue_type, summary, match_percentage')
      .eq('case_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Attachments from messages in this case's thread
    const { data: threadRow } = await supabase
      .from('message_threads')
      .select('id')
      .eq('case_id', c.id)
      .maybeSingle();

    let attachments: CaseDetail['attachments'] = [];
    if (threadRow?.id) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('attachment_url, attachment_name, attachment_type, created_at, sender:sender_id(first_name, last_name)')
        .eq('thread_id', threadRow.id)
        .not('attachment_url', 'is', null)
        .order('created_at', { ascending: true });

      attachments = (msgs || []).map((m: any) => ({
        url: m.attachment_url,
        name: m.attachment_name || 'File',
        type: m.attachment_type ?? null,
        created_at: m.created_at,
        sender: m.sender
          ? [m.sender.first_name, m.sender.last_name].filter(Boolean).join(' ')
          : 'Unknown',
      }));
    }

    // 4. Pro-bono service logs
    const { data: logs } = await supabase
      .from('pro_bono_logs')
      .select('id, description, hours, is_verified, evidence_url, evidence_name, created_at')
      .eq('case_id', c.id)
      .order('created_at', { ascending: true });

    setCaseDetail({
      description: caseRow?.description ?? null,
      closing_notes: caseRow?.closing_notes ?? null,
      triage: triageRow ?? null,
      attachments,
      serviceLogs: (logs || []).map((l: any) => ({
        id: l.id,
        description: l.description,
        hours: l.hours,
        is_verified: l.is_verified ?? false,
        evidence_url: l.evidence_url ?? null,
        evidence_name: l.evidence_name ?? null,
        created_at: l.created_at,
      })),
    });
    setIsDetailLoading(false);
  }, []);

  const closeDetail = () => {
    setDetailCase(null);
    setCaseDetail(null);
  };

  const handleWithdraw = async (c: CaseItem) => {
    setWithdrawingId(c.id);
    const now = new Date().toISOString();
    await supabase.from('cases').update({ status: 'Withdrawn', closed_at: now }).eq('id', c.id);
    const { data: thread } = await supabase.from('message_threads').select('id').eq('case_id', c.id).maybeSingle();
    if (thread) {
      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        thread_id: thread.id,
        sender_id: profile!.id,
        content: 'This case has been withdrawn by the client.',
      });
    }
    if (c.attorney_id) {
      await supabase.from('notifications').insert({
        user_id: c.attorney_id,
        title: 'Case Withdrawn',
        body: `Your client has withdrawn the case: "${c.title}".`,
        link: '/legal/messages',
      });
    }
    auditService.log('Case Withdrawn', `Withdrew case: "${c.title}"`);
    setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Withdrawn' } : x));
    setConfirmWithdrawId(null);
    setWithdrawingId(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackCaseId || !feedbackValue) return;
    setFeedbackSubmitting(true);
    const trimmedComment = feedbackComment.trim() || null;
    await supabase.from('cases').update({
      client_feedback: feedbackValue,
      feedback_rating: feedbackRating || null,
      client_comment: trimmedComment,
    }).eq('id', feedbackCaseId);
    setCases(prev => prev.map(c => c.id === feedbackCaseId ? { ...c, client_feedback: feedbackValue } : c));
    auditService.log('Case Feedback Submitted', `Client rated case ${feedbackCaseId}: ${feedbackValue}${feedbackRating ? ` (${feedbackRating}/5 stars)` : ''}${trimmedComment ? ` — "${trimmedComment}"` : ''}`);
    setFeedbackSubmitting(false);
    setFeedbackDone(true);
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

  return (
    <div className={styles.container}>

      {/* Page heading */}
      <div>
        <h1 className={styles.pageTitle}>Mga Kaso Ko</h1>
        <p className={styles.subtitle}>
          {isLoading
            ? 'Kinukuha ang iyong mga kaso...'
            : cases.length === 0
              ? 'Wala ka pang mga kaso.'
              : `${cases.length} kabuuang kaso`}
        </p>
      </div>

      {/* Cases card */}
      <div className={styles.card}>

        {/* Card header — title + filter tabs */}
        <div className={styles.cardHeader}>
          <div className={styles.filterTabs}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`${styles.filterBtn} ${activeTab === tab.key ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`${styles.tabCount} ${activeTab === tab.key ? styles.tabCountActive : ''}`}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className={styles.emptyState}>
            <Loader2 className="animate-spin" size={24} />
            <p>Kinukuha ang iyong mga kaso...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.emptyState}>
            <Briefcase size={38} strokeWidth={1.5} />
            <p>
              {activeTab === 'all'
                ? 'Wala kang mga kaso pa.'
                : activeTab === 'active'
                  ? 'Wala kang aktibong kaso sa ngayon.'
                  : activeTab === 'pending'
                    ? 'Wala kang kaso na naghihintay ng abogado.'
                    : 'Wala pang natapos o nakansela na kaso.'}
            </p>
            {activeTab === 'all' && (
              <Link to="/public/triage" className={styles.emptyLink}>
                Magsimula ng Triage
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.caseList}>
            {visible.map((c) => {
              const type = getStatusType(c.status);
              const isActive = ACTIVE_STATUSES.includes(c.status);
              const isClosed = HISTORY_STATUSES.includes(c.status);
              const isConfirming = confirmWithdrawId === c.id;
              const isWithdrawing = withdrawingId === c.id;
              const countdown = c.status === 'Pending Acceptance' ? getCountdown(c.attorney_assigned_at) : null;

              return (
                <div key={c.id} className={styles.caseRow}>
                  {/* Left: title + meta */}
                  <div className={styles.caseInfo}>
                    <h3 className={styles.caseTitle}>{c.title}</h3>
                    <div className={styles.caseMeta}>
                      <span className={`${styles.statusBadge} ${styles[type]}`}>
                        {getStatusIcon(type)}
                        {c.status}
                      </span>
                      {c.attorney && (
                        <>
                          <span className={styles.caseDivider}>·</span>
                          <span className={styles.caseAttorney}>Atty. {c.attorney}</span>
                        </>
                      )}
                      <span className={styles.caseDivider}>·</span>
                      <span className={styles.caseDate}>Filed {fmt(c.created_at)}</span>
                      {c.closed_at && (
                        <>
                          <span className={styles.caseDivider}>·</span>
                          <span className={styles.caseDate}>Closed {fmt(c.closed_at)}</span>
                        </>
                      )}
                    </div>
                    {countdown && (
                      <div className={countdown.urgent ? styles.countdownUrgent : styles.countdown}>
                        <Clock size={11} />
                        Attorney response window: {countdown.label}
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className={styles.caseActions}>
                    {/* View Details — always visible */}
                    <button className={styles.btnDetails} onClick={() => openDetail(c)}>
                      <Eye size={13} /> Details
                    </button>

                    {c.status === 'Pending Triage' && (
                      <button className={styles.btnOutline} onClick={() => openReSelect(c)}>
                        <Users size={13} /> Select Attorney
                      </button>
                    )}
                    {isActive && !isConfirming && (
                      <button className={styles.btnDanger} onClick={() => setConfirmWithdrawId(c.id)}>
                        Withdraw
                      </button>
                    )}
                    {isConfirming && (
                      <div className={styles.confirmRow}>
                        <span className={styles.confirmLabel}>Sure?</span>
                        <button
                          className={styles.btnDangerFill}
                          onClick={() => handleWithdraw(c)}
                          disabled={isWithdrawing}
                        >
                          {isWithdrawing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Yes
                        </button>
                        <button className={styles.btnGhost} onClick={() => setConfirmWithdrawId(null)}>
                          No
                        </button>
                      </div>
                    )}
                    {isClosed && !c.client_feedback && (
                      <button
                        className={styles.btnWarning}
                        onClick={() => { setFeedbackCaseId(c.id); setFeedbackValue(''); setFeedbackComment(''); setFeedbackRating(0); setFeedbackRatingHover(0); setFeedbackDone(false); }}
                      >
                        <Star size={13} /> Rate
                      </button>
                    )}
                    {isClosed && c.client_feedback && (
                      <span className={styles.ratedTag}>✓ Rated</span>
                    )}
                    <span className={styles.caseUpdated}>
                      Updated {fmt(c.updated_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Case Detail Modal ─────────────────────────────────────────────────── */}
      {detailCase && (
        <div className={styles.modalOverlay} onClick={closeDetail}>
          <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderLeft}>
                <span className={`${styles.statusBadge} ${styles[getStatusType(detailCase.status)]}`}>
                  {getStatusIcon(getStatusType(detailCase.status))}
                  {detailCase.status}
                </span>
                <h2 className={styles.detailTitle}>{detailCase.title}</h2>
                <p className={styles.detailMeta}>
                  Filed {fmt(detailCase.created_at)}
                  {detailCase.attorney && ` · Atty. ${detailCase.attorney}`}
                  {detailCase.closed_at && ` · Closed ${fmt(detailCase.closed_at)}`}
                </p>
              </div>
              <button className={styles.detailClose} onClick={closeDetail} aria-label="Close">
                <XCircle size={22} />
              </button>
            </div>

            {/* Panel body */}
            {isDetailLoading ? (
              <div className={styles.detailLoading}>
                <Loader2 size={26} className="animate-spin" color="var(--color-primary)" />
                <p>Kinukuha ang detalye ng kaso...</p>
              </div>
            ) : caseDetail && (
              <div className={styles.detailBody}>

                {/* ── 1. Case Description ─────────────────────────────────── */}
                {caseDetail.description && (
                  <section className={styles.detailSection}>
                    <h3 className={styles.detailSectionTitle}>
                      <ClipboardList size={15} /> Paglalarawan ng Kaso
                    </h3>
                    <p className={styles.detailText}>{caseDetail.description}</p>
                  </section>
                )}

                {/* ── 2. Triage Summary ───────────────────────────────────── */}
                {caseDetail.triage && (
                  <section className={styles.detailSection}>
                    <h3 className={styles.detailSectionTitle}>
                      <ClipboardList size={15} /> Triage Assessment
                    </h3>
                    <div className={styles.triageCard}>
                      <div className={styles.triageTopRow}>
                        <span className={styles.triageIssue}>{caseDetail.triage.issue_type}</span>
                        {caseDetail.triage.match_percentage != null && (
                          <span className={styles.triageMatch}>
                            {Math.round(caseDetail.triage.match_percentage)}% match
                          </span>
                        )}
                      </div>
                      {caseDetail.triage.summary && (
                        <p className={styles.triageSummary}>{caseDetail.triage.summary}</p>
                      )}
                    </div>
                  </section>
                )}

                {/* ── 3. Uploaded Documents ───────────────────────────────── */}
                <section className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>
                    <FileText size={15} /> Mga Na-upload na Dokumento
                  </h3>
                  {caseDetail.attachments.length === 0 ? (
                    <p className={styles.detailEmpty}>Walang na-upload na mga dokumento sa kasong ito.</p>
                  ) : (
                    <div className={styles.attachmentList}>
                      {caseDetail.attachments.map((att, i) => (
                        <div key={i} className={styles.attachmentRow}>
                          <span className={styles.attachmentIcon}>
                            {typeof getFileIcon(att.type) === 'string'
                              ? getFileIcon(att.type)
                              : <Paperclip size={15} />}
                          </span>
                          <div className={styles.attachmentInfo}>
                            <span className={styles.attachmentName}>{att.name}</span>
                            <span className={styles.attachmentMeta}>
                              {att.sender} · {fmt(att.created_at)}
                            </span>
                          </div>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.attachmentLink}
                            title="Open file"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── 4. Service Logs ─────────────────────────────────────── */}
                <section className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>
                    <ShieldCheck size={15} /> Service Logs ng Legal Aid
                  </h3>
                  {caseDetail.serviceLogs.length === 0 ? (
                    <p className={styles.detailEmpty}>Wala pang naka-log na serbisyo para sa kasong ito.</p>
                  ) : (
                    <div className={styles.logList}>
                      {caseDetail.serviceLogs.map((log) => (
                        <div key={log.id} className={styles.logRow}>
                          <div className={styles.logDot} />
                          <div className={styles.logContent}>
                            <div className={styles.logTopRow}>
                              <span className={styles.logDescription}>{log.description}</span>
                              {log.is_verified && (
                                <span className={styles.logVerified}>
                                  <CheckCircle2 size={11} /> Verified
                                </span>
                              )}
                            </div>
                            <div className={styles.logMeta}>
                              {log.hours} hr{log.hours !== 1 ? 's' : ''} · {fmt(log.created_at)}
                              {log.evidence_url && (
                                <>
                                  {' · '}
                                  <a
                                    href={log.evidence_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.logEvidenceLink}
                                  >
                                    {log.evidence_name || 'Evidence'} <ExternalLink size={11} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── 5. Closing Notes ────────────────────────────────────── */}
                {caseDetail.closing_notes && (
                  <section className={styles.detailSection}>
                    <h3 className={styles.detailSectionTitle}>
                      <CheckCircle2 size={15} /> Closing Notes ng Attorney
                    </h3>
                    <p className={styles.detailText}>{caseDetail.closing_notes}</p>
                  </section>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback modal ────────────────────────────────────────────────────── */}
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                    Komento <span style={{ fontWeight: 400 }}>(opsyonal)</span>
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={e => setFeedbackComment(e.target.value)}
                    placeholder="Ibahagi ang iyong karanasan sa abogado..."
                    rows={3}
                    maxLength={500}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', backgroundColor: 'var(--color-background)', boxSizing: 'border-box', color: 'var(--color-text)' }}
                  />
                  {feedbackComment.length > 0 && (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>{feedbackComment.length}/500</p>
                  )}
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

      {/* ── Re-select attorney modal ──────────────────────────────────────────── */}
      {reSelectCase && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-secondary)' }}>Pumili ng Abogado</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{reSelectCase.title}</p>
              </div>
              <button onClick={() => setReSelectCase(null)} style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0 }}>
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
                <button onClick={() => setReSelectCase(null)} style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  Isara
                </button>
              </div>
            ) : reSelectConfirm ? (
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
                  <button onClick={() => setReSelectConfirm(false)} style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
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
    </div>
  );
};

export default PublicAllCases;
