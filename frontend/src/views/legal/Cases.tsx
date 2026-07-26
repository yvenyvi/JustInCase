import React from 'react';
import { FileText, Search, CheckCircle, XCircle, Loader2, FolderX, Download, Clock, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createCaseThread } from '../../lib/createCaseThread';
import { auditService } from '../../services/auditService';
import ServiceLogModal from './ServiceLogModal';
import ConfirmModal from '../../components/ConfirmModal';
import styles from './LegalDashboard.module.css';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

interface CaseAttachment {
  url: string;
  name: string;
  type: string;
  sentAt: string;
  senderName: string;
  tag: 'chat' | 'evidence';
}

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  created_at: string;
  client_id: string | null;
  client: { first_name: string | null; last_name: string | null; email: string } | null;
  feedback_rating: number | null;
  client_feedback: string | null;
  client_comment: string | null;
}

const statusColor: Record<string, string> = {
  'Pending Acceptance': 'var(--color-warning)',
  'In Progress': 'var(--color-primary)',
  'Pending Triage': 'var(--color-text-muted)',
  'Closed - Won': 'var(--color-success)',
  'Closed - Lost': 'var(--color-error, #ef4444)',
};

const Cases = () => {
  const { profile } = useAuth();
  const [cases, setCases] = React.useState<Case[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('All');
  const [detailCase, setDetailCase] = React.useState<Case | null>(null);
  const [errorCaseId, setErrorCaseId] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [closeModal, setCloseModal] = React.useState<{ caseId: string; title: string; clientId: string | null } | null>(null);
  const [closeOutcome, setCloseOutcome] = React.useState<'Closed - Won' | 'Closed - Lost' | 'Dropped'>('Closed - Won');
  const [closeNotes, setCloseNotes] = React.useState('');
  const [caseAttachments, setCaseAttachments] = React.useState<Record<string, CaseAttachment[]>>({});
  const [loadingAttachments, setLoadingAttachments] = React.useState<string | null>(null);
  const [serviceLogCase, setServiceLogCase] = React.useState<{ id: string; title: string; client_id: string | null } | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = React.useState<string | null>(null);
  const [confirmReject, setConfirmReject] = React.useState<string | null>(null);

  const fetchCases = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, description, status, category, created_at, client_id, feedback_rating, client_feedback, client_comment, client:client_id(first_name, last_name, email)')
      .eq('attorney_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) setCases(data as any);
    setIsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchCases();

    if (!profile?.id) return;
    const channel = supabase
      .channel(`attorney-cases-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `attorney_id=eq.${profile.id}` }, fetchCases)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCases, profile?.id]);

  const handleAccept = async (caseId: string) => {
    if (!profile?.id) return;
    setActionLoading(caseId);
    setActionError(null);
    const { error } = await supabase.from('cases').update({ status: 'In Progress' }).eq('id', caseId);
    if (!error) {
      const accepted = cases.find(c => c.id === caseId);
      if (accepted?.client_id) {
        await createCaseThread(supabase, caseId, accepted.title, accepted.client_id, profile.id);
        const attyName = profile.first_name
          ? `Atty. ${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`.trim()
          : `Atty. ${profile.email?.split('@')[0] ?? 'Unknown'}`;
        await supabase.from('notifications').insert({
          user_id: accepted.client_id,
          title: 'Attorney Accepted Your Case',
          body: `${attyName} has accepted your case "${accepted.title}". You can now message each other through the platform.`,
          link: '/public/messages',
        });
      }
      auditService.log('Case Accepted', `Accepted case: "${accepted?.title ?? caseId}"`);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'In Progress' } : c));
      setDetailCase(null);
    } else {
      setActionError(`Failed to accept case: ${error.message}`);
      setErrorCaseId(caseId);
    }
    setActionLoading(null);
  };

  const loadAttachments = async (caseId: string) => {
    if (caseAttachments[caseId] !== undefined) return;
    setLoadingAttachments(caseId);

    const [threadRes, evidenceRes] = await Promise.all([
      supabase.from('message_threads').select('id').eq('case_id', caseId).maybeSingle(),
      supabase
        .from('pro_bono_logs')
        .select('evidence_url, evidence_name, created_at')
        .eq('case_id', caseId)
        .not('evidence_url', 'is', null)
        .order('created_at', { ascending: true }),
    ]);

    type RawItem = { url: string; name: string; type: string; createdAt: string; senderName: string; tag: 'chat' | 'evidence' };
    const raw: RawItem[] = [];

    // Chat message attachments
    if (threadRes.data) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, attachment_url, attachment_name, attachment_type, created_at')
        .eq('thread_id', threadRes.data.id)
        .not('attachment_url', 'is', null)
        .order('created_at', { ascending: true });

      const senderIds = [...new Set((msgs ?? []).map((m: any) => m.sender_id))];
      const { data: users } = senderIds.length
        ? await supabase.from('users').select('id, first_name, last_name').in('id', senderIds)
        : { data: [] };
      const userMap: Record<string, string> = {};
      for (const u of users ?? []) userMap[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';

      for (const m of msgs ?? []) {
        raw.push({ url: m.attachment_url, name: m.attachment_name ?? 'file', type: m.attachment_type ?? '', createdAt: m.created_at, senderName: userMap[m.sender_id] ?? 'Unknown', tag: 'chat' });
      }
    }

    // Evidence from service logs
    for (const e of evidenceRes.data ?? []) {
      const name = e.evidence_name ?? 'evidence';
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : '';
      raw.push({ url: e.evidence_url, name, type, createdAt: e.created_at, senderName: 'Service Log Evidence', tag: 'evidence' });
    }

    raw.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const attachments: CaseAttachment[] = raw.map(r => ({
      url: r.url,
      name: r.name,
      type: r.type,
      sentAt: new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      senderName: r.senderName,
      tag: r.tag,
    }));

    setCaseAttachments(prev => ({ ...prev, [caseId]: attachments }));
    setLoadingAttachments(null);
  };

  const handleReject = async (caseId: string) => {
    if (!profile?.id) return;
    setActionLoading(caseId);
    setActionError(null);
    const rejected = cases.find(c => c.id === caseId);
    const { error } = await supabase.from('cases').update({ attorney_id: null, status: 'Pending Triage' }).eq('id', caseId);
    if (!error) {
      auditService.log('Case Rejected', `Rejected case: "${rejected?.title ?? caseId}"`);

      // Notify client so they can re-select an attorney
      if (rejected?.client_id) {
        await supabase.from('notifications').insert({
          user_id: rejected.client_id,
          title: 'Attorney Unavailable',
          body: `The attorney you selected was unable to take your case "${rejected.title}". Please go to your dashboard to select another attorney.`,
          link: '/public/dashboard',
        });
      }

      // Notify attorneys whose practice areas match the case category
      const caseCategory = rejected?.category;
      const attorneyQuery = supabase
        .from('users')
        .select('id')
        .eq('role', 'Volunteer Attorney')
        .eq('status_verification', 'verified')
        .neq('id', profile.id);
      const { data: others } = caseCategory
        ? await attorneyQuery.contains('interests', [caseCategory])
        : await attorneyQuery;

      if (others?.length) {
        await Promise.all(
          others.map(a =>
            supabase.from('notifications').insert({
              user_id: a.id,
              title: 'Pro-Bono Case Returned to Hub',
              body: `A case${caseCategory ? ` (${caseCategory})` : ''} is back in the Pro-Bono Hub after an attorney withdrew. Check it out.`,
              link: '/legal/probono',
            })
          )
        );
      }

      setCases(prev => prev.filter(c => c.id !== caseId));
      setDetailCase(null);
    } else {
      setActionError(`Failed to reject case: ${error.message}`);
      setErrorCaseId(caseId);
    }
    setActionLoading(null);
  };

  const handleClose = async () => {
    if (!closeModal || !profile?.id) return;
    const { caseId, title, clientId } = closeModal;
    setActionLoading(caseId);
    const now = new Date().toISOString();

    await supabase.from('cases').update({
      status: closeOutcome,
      closing_notes: closeNotes.trim() || null,
      closed_at: now,
    }).eq('id', caseId);

    // System message in thread
    const { data: thread } = await supabase
      .from('message_threads').select('id').eq('case_id', caseId).maybeSingle();
    if (thread) {
      const outcomeLabel = closeOutcome === 'Dropped' ? 'dropped' : `closed (${closeOutcome})`;
      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        thread_id: thread.id,
        sender_id: profile.id,
        content: `The attorney has ${outcomeLabel} this case.${closeNotes.trim() ? `\n\nNote: ${closeNotes.trim()}` : ''}`,
      });
    }

    // Notify client
    if (clientId) {
      await supabase.from('notifications').insert({
        user_id: clientId,
        title: 'Rate Your Attorney',
        body: `Your case "${title}" has been closed (${closeOutcome}). How was your experience? Tap here to leave a rating for your attorney.`,
        link: '/public/cases',
      });
    }

    auditService.log('Case Closed', `Closed case: "${title}" — Outcome: ${closeOutcome}${closeNotes.trim() ? `. Notes: ${closeNotes.trim()}` : ''}`);
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: closeOutcome } : c));
    setCloseModal(null);
    setCloseNotes('');
    setCloseOutcome('Closed - Won');
    setActionLoading(null);
  };

  const clientName = (c: Case) =>
    c.client
      ? [c.client.first_name, c.client.last_name].filter(Boolean).join(' ') || c.client.email
      : 'Unknown';

  const filtered = cases.filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName(c).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = cases.filter(c => c.status === 'Pending Acceptance').length;

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>My Cases</h1>
          <p className={styles.subtitle}>Manage your active pro-bono docket.</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '10px', color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>
            <FileText size={16} />
            {pendingCount} case{pendingCount > 1 ? 's' : ''} awaiting your response
          </div>
        )}
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className={styles.searchBar} style={{ flex: '1 1 240px', maxWidth: '380px' }}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search by title or client..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className={styles.selectField} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Pending Acceptance">Pending Acceptance</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending Triage">Pending Triage</option>
          <option value="Closed - Won">Closed - Won</option>
          <option value="Closed - Lost">Closed - Lost</option>
        </select>
      </div>

      {/* Case cards */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={28} className={styles.spin} color="var(--color-primary)" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '3rem', textAlign: 'center' }}>
          {cases.length === 0 ? 'No cases assigned yet.' : 'No cases match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((c) => {
            const isPending = c.status === 'Pending Acceptance';
            const borderColor = statusColor[c.status] || 'var(--color-border)';
            const cleanDescription = (c.description || '')
              .replace(/\nUser has not uploaded documents yet\./g, '')
              .replace(/\nUser has supporting documents\./g, '')
              .trim();

            return (
              <div
                key={c.id}
                style={{ borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}
              >
                {/* Fixed-height body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {/* Status + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: `${borderColor}18`, color: borderColor, flexShrink: 0, letterSpacing: '0.01em' }}>
                      {c.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.title}
                  </h3>

                  <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
                    {clientName(c)}
                  </p>

                  <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6, flex: 1 }}>
                    {cleanDescription || 'No description provided.'}
                  </p>

                  {c.status.startsWith('Closed') && c.feedback_rating != null && (
                    <div style={{ padding: '0.65rem 0.875rem', backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: c.client_comment ? '0.35rem' : 0 }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12}
                              fill={s <= c.feedback_rating! ? '#f59e0b' : 'none'}
                              color={s <= c.feedback_rating! ? '#f59e0b' : '#d1d5db'}
                            />
                          ))}
                        </div>
                        {c.client_feedback && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92400e' }}>{c.client_feedback}</span>
                        )}
                      </div>
                      {c.client_comment && (
                        <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{c.client_comment}"
                        </p>
                      )}
                    </div>
                  )}

                  {actionError && errorCaseId === c.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.875rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.82rem' }}>
                      <XCircle size={14} style={{ flexShrink: 0 }} /> {actionError}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {/* Action buttons row */}
                  {(isPending || c.status === 'In Progress') && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {isPending && (
                        <>
                          <button onClick={() => handleAccept(c.id)} disabled={!!actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            {actionLoading === c.id ? <Loader2 size={13} className={styles.spin} /> : <CheckCircle size={13} />}
                            Accept
                          </button>
                          <button onClick={() => setConfirmReject(c.id)} disabled={!!actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            {actionLoading === c.id ? <Loader2 size={13} className={styles.spin} /> : <XCircle size={13} />}
                            Reject
                          </button>
                        </>
                      )}
                      {c.status === 'In Progress' && (
                        <>
                          <button onClick={() => setServiceLogCase({ id: c.id, title: c.title, client_id: c.client_id })} disabled={!!actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            <Clock size={13} /> Log Service
                          </button>
                          <button onClick={() => setCloseModal({ caseId: c.id, title: c.title, clientId: c.client_id })} disabled={!!actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            <FolderX size={13} /> Close
                          </button>
                          <button onClick={() => setConfirmReject(c.id)} disabled={!!actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            {actionLoading === c.id ? <Loader2 size={13} className={styles.spin} /> : <XCircle size={13} />}
                            Withdraw
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {/* View All — full-width bottom row */}
                  <button onClick={() => { setDetailCase(c); loadAttachments(c.id); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem', backgroundColor: 'var(--color-background)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <FileText size={13} /> View All Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Case Detail Modal */}
      {detailCase && (() => {
        const dc = detailCase;
        const isPending = dc.status === 'Pending Acceptance';
        const borderColor = statusColor[dc.status] || 'var(--color-border)';
        const cleanDesc = (dc.description || '')
          .replace(/\nUser has not uploaded documents yet\./g, '')
          .replace(/\nUser has supporting documents\./g, '')
          .trim();
        const attachments = caseAttachments[dc.id];
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDetailCase(null); }}>
            <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              {/* Modal header */}
              <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '9999px', backgroundColor: `${borderColor}18`, color: borderColor, display: 'inline-block', marginBottom: '0.5rem' }}>
                    {dc.status}
                  </span>
                  <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.35 }}>{dc.title}</h2>
                  <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0', fontWeight: 500 }}>
                    {clientName(dc)} · {new Date(dc.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setDetailCase(null)}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--color-text-muted)', borderRadius: '6px' }}>
                  <XCircle size={20} />
                </button>
              </div>

              {/* Modal body — scrollable */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Description */}
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.6rem' }}>Description</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', backgroundColor: 'var(--color-background)', borderRadius: '10px', padding: '1rem' }}>
                    {cleanDesc || 'No description provided.'}
                  </p>
                </div>

                {/* Client Feedback — shown only for closed cases with a rating */}
                {dc.status.startsWith('Closed') && dc.feedback_rating != null && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.6rem' }}>Client Feedback</p>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: dc.client_comment ? '0.6rem' : 0 }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={15}
                              fill={s <= dc.feedback_rating! ? '#f59e0b' : 'none'}
                              color={s <= dc.feedback_rating! ? '#f59e0b' : '#d1d5db'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>{dc.feedback_rating} / 5</span>
                        {dc.client_feedback && (
                          <span style={{ fontSize: '0.75rem', color: '#92400e' }}>· {dc.client_feedback}</span>
                        )}
                      </div>
                      {dc.client_comment && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{dc.client_comment}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents & Files */}
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.6rem' }}>
                    Documents &amp; Files
                  </p>
                  {loadingAttachments === dc.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      <Loader2 size={15} className={styles.spin} /> Loading files...
                    </div>
                  ) : !attachments?.length ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>No files have been shared or uploaded for this case yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {attachments.map((a, i) => {
                        const isImage = IMAGE_TYPES.includes(a.type);
                        return (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                            download={!isImage ? a.name : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)', textDecoration: 'none' }}>
                            {isImage ? (
                              <img src={a.url} alt={a.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: a.tag === 'evidence' ? 'rgba(139,92,246,0.1)' : 'rgba(37,99,235,0.1)', borderRadius: '8px', flexShrink: 0 }}>
                                <FileText size={16} color={a.tag === 'evidence' ? '#8b5cf6' : 'var(--color-primary)'} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <p style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{a.name}</p>
                                <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '9999px', backgroundColor: a.tag === 'evidence' ? 'rgba(139,92,246,0.12)' : 'rgba(37,99,235,0.1)', color: a.tag === 'evidence' ? '#8b5cf6' : 'var(--color-primary)' }}>
                                  {a.tag === 'evidence' ? 'Evidence' : 'Chat'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>{a.senderName} · {a.sentAt}</p>
                            </div>
                            <Download size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer: actions */}
              <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {isPending && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setConfirmAccept(dc.id)} disabled={!!actionLoading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                      <CheckCircle size={15} />
                      Accept Case
                    </button>
                    <button onClick={() => setConfirmReject(dc.id)} disabled={!!actionLoading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                )}
                {dc.status === 'In Progress' && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => { setDetailCase(null); setServiceLogCase({ id: dc.id, title: dc.title, client_id: dc.client_id }); }} disabled={!!actionLoading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                      <Clock size={15} /> Log Service
                    </button>
                    <button onClick={() => { setDetailCase(null); setCloseModal({ caseId: dc.id, title: dc.title, clientId: dc.client_id }); }} disabled={!!actionLoading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                      <FolderX size={15} /> Close Case
                    </button>
                    <button onClick={() => { setDetailCase(null); setConfirmReject(dc.id); }} disabled={!!actionLoading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                      {actionLoading === dc.id ? <Loader2 size={15} className={styles.spin} /> : <XCircle size={15} />}
                      Withdraw
                    </button>
                  </div>
                )}
                <button onClick={() => setDetailCase(null)}
                  style={{ width: '100%', padding: '0.65rem', backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <ConfirmModal
        isOpen={!!confirmAccept}
        title="Accept Case"
        message={`Accept "${cases.find(c => c.id === confirmAccept)?.title}"? A chat thread will be opened and the client will be notified.`}
        confirmLabel="Accept"
        onConfirm={() => { const id = confirmAccept!; setConfirmAccept(null); handleAccept(id); }}
        onCancel={() => setConfirmAccept(null)}
        isLoading={actionLoading === confirmAccept}
      />
      <ConfirmModal
        isOpen={!!confirmReject}
        title={cases.find(c => c.id === confirmReject)?.status === 'Pending Acceptance' ? 'Reject Case' : 'Withdraw from Case'}
        message={(() => {
          const c = cases.find(x => x.id === confirmReject);
          if (!c) return '';
          return c.status === 'Pending Acceptance'
            ? `Reject "${c.title}"? The client will be notified and can select another attorney.`
            : `Withdraw from "${c.title}"? The client will be notified and the case will be returned to the Pro-Bono Hub for another attorney to claim.`;
        })()}
        confirmLabel={cases.find(c => c.id === confirmReject)?.status === 'Pending Acceptance' ? 'Reject' : 'Withdraw'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { const id = confirmReject!; setConfirmReject(null); handleReject(id); }}
        onCancel={() => setConfirmReject(null)}
        isLoading={actionLoading === confirmReject}
      />
      {/* Service Log Modal */}
      {serviceLogCase && (
        <ServiceLogModal
          preselectedCase={serviceLogCase}
          onClose={() => setServiceLogCase(null)}
          onLogged={() => setServiceLogCase(null)}
        />
      )}

      {/* Close Case Modal */}
      {closeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '14px', padding: '1.75rem', width: '100%', maxWidth: '440px', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--color-text)' }}>Close Case</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>{closeModal.title}</p>

            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>Outcome</label>
            <select
              value={closeOutcome}
              onChange={e => setCloseOutcome(e.target.value as typeof closeOutcome)}
              style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', marginBottom: '1rem', backgroundColor: 'var(--color-background)' }}
            >
              <option value="Closed - Won">Closed – Won</option>
              <option value="Closed - Lost">Closed – Lost</option>
              <option value="Dropped">Dropped</option>
            </select>

            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>Closing Notes <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              placeholder="Brief summary of the outcome, next steps for the client, etc."
              rows={4}
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', backgroundColor: 'var(--color-background)', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setCloseModal(null); setCloseNotes(''); setCloseOutcome('Closed - Won'); }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={!!actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                {actionLoading ? <Loader2 size={15} className={styles.spin} /> : <FolderX size={15} />}
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cases;
