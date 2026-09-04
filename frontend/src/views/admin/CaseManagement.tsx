import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Search,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  X,
  ChevronDown,
  FolderOpen,
  Scale,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import styles from './CaseManagement.module.css';
import Skeleton from '../../components/Skeleton';

interface CaseRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  client_id: string;
  attorney_id: string | null;
  client: { first_name: string | null; last_name: string | null; email: string } | null;
  attorney: { first_name: string | null; last_name: string | null; email: string } | null;
  triage_assessments: { issue_type: string; match_percentage: number | null }[];
}

interface Attorney {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  ibp_number: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'Pending Triage':     { label: 'Pending Triage',     color: '#92400e', bg: '#fef3c7', icon: <Clock size={12} /> },
  'In Progress':        { label: 'In Progress',         color: '#1d4ed8', bg: '#dbeafe', icon: <AlertCircle size={12} /> },
  'Closed - Won':       { label: 'Closed – Won',        color: '#15803d', bg: '#dcfce7', icon: <CheckCircle size={12} /> },
  'Closed - Lost':      { label: 'Closed – Lost',       color: '#b91c1c', bg: '#fee2e2', icon: <XCircle size={12} /> },
};

const ALL_STATUSES = ['All', 'Pending Triage', 'In Progress', 'Closed - Won', 'Closed - Lost'];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6', icon: null };
  return (
    <span className={styles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

export default function CaseManagement() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [assignModal, setAssignModal] = useState<CaseRecord | null>(null);
  const [selectedAttorney, setSelectedAttorney] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [casesRes, attyRes] = await Promise.all([
      supabase
        .from('cases')
        .select(`
          id, title, description, status, created_at, client_id, attorney_id,
          client:users!cases_client_id_fkey(first_name, last_name, email),
          attorney:users!cases_attorney_id_fkey(first_name, last_name, email),
          triage_assessments(issue_type, match_percentage)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('id, first_name, last_name, email, ibp_number')
        .eq('role', 'Volunteer Attorney')
        .eq('status_verification', 'verified'),
    ]);

    if (casesRes.data) setCases(casesRes.data as unknown as CaseRecord[]);
    if (attyRes.data)  setAttorneys(attyRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-cases-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const filtered = cases.filter(c => {
    const clientName = [c.client?.first_name, c.client?.last_name].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || clientName.includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total:        cases.length,
    pendingTriage: cases.filter(c => c.status === 'Pending Triage').length,
    inProgress:   cases.filter(c => c.status === 'In Progress').length,
    closed:       cases.filter(c => c.status.startsWith('Closed')).length,
  };

  const openAssign = (c: CaseRecord) => {
    setAssignModal(c);
    setSelectedAttorney(c.attorney_id ?? '');
    setAssignError(null);
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedAttorney) return;
    setAssigning(true);
    setAssignError(null);

    const { error } = await supabase
      .from('cases')
      .update({ attorney_id: selectedAttorney, status: 'In Progress' })
      .eq('id', assignModal.id);

    if (error) {
      setAssignError(error.message);
      setAssigning(false);
      return;
    }

    const attorney = attorneys.find(a => a.id === selectedAttorney);
    const attyName = attorney ? [attorney.first_name, attorney.last_name].filter(Boolean).join(' ') : 'Attorney';

    await auditService.log(
      'Case Assigned',
      `Admin assigned case "${assignModal.title}" (${assignModal.id.slice(0, 8)}) to ${attyName}.`,
    );

    // Create message thread if one doesn't exist yet
    const { data: existingThread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('case_id', assignModal.id)
      .single();

    if (!existingThread) {
      const { data: thread } = await supabase
        .from('message_threads')
        .insert({ case_id: assignModal.id, name: `Case: ${assignModal.title}` })
        .select('id')
        .single();

      if (thread) {
        await supabase.from('thread_participants').insert([
          { thread_id: thread.id, user_id: assignModal.client_id },
          { thread_id: thread.id, user_id: selectedAttorney },
        ]);
      }
    }

    // Notify client and attorney
    await Promise.all([
      supabase.from('notifications').insert({
        user_id: assignModal.client_id,
        title: 'Attorney Assigned',
        body: `${attyName} has been assigned to your case "${assignModal.title}". You can now message each other.`,
        link: '/public/messages',
      }),
      supabase.from('notifications').insert({
        user_id: selectedAttorney,
        title: 'Case Assigned to You',
        body: `An admin has assigned you to the case "${assignModal.title}". Check your cases to get started.`,
        link: '/legal/cases',
      }),
    ]);

    setAssigning(false);
    setAssignModal(null);
    fetchData();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Management</h1>
          <p className={styles.subtitle}>Monitor all platform cases and assign attorneys to pending triage requests.</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Total Cases',      value: stats.total,         icon: <Briefcase size={20} />,  bg: '#E0F2FE', color: '#0369A1' },
          { label: 'Pending Triage',   value: stats.pendingTriage, icon: <Clock size={20} />,       bg: '#FEF3C7', color: '#B45309' },
          { label: 'Active Cases',     value: stats.inProgress,    icon: <Scale size={20} />,       bg: '#F3E8FF', color: '#7E22CE' },
          { label: 'Closed Cases',     value: stats.closed,        icon: <CheckCircle size={20} />, bg: '#DCFCE7', color: '#15803D' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by case title or client name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterBox}>
          <ChevronDown size={14} className={styles.filterIcon} />
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: '35%' }}>
                <Skeleton style={{ height: 16, width: '80%', borderRadius: 4, marginBottom: 6 }} />
                <Skeleton style={{ height: 12, width: '45%', borderRadius: 4 }} />
              </div>
              <Skeleton style={{ height: 14, width: 90, borderRadius: 4 }} />
              <Skeleton style={{ height: 14, width: 100, borderRadius: 4 }} />
              <Skeleton style={{ height: 20, width: 80, borderRadius: 10 }} />
              <Skeleton style={{ height: 28, width: 70, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <FolderOpen size={48} />
          <p>No cases match your search.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Case</th>
                <th>Issue Type</th>
                <th>Client</th>
                <th>Attorney</th>
                <th>Status</th>
                <th>Filed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const clientName = c.client
                  ? [c.client.first_name, c.client.last_name].filter(Boolean).join(' ') || c.client.email
                  : '—';
                const attyName = c.attorney
                  ? [c.attorney.first_name, c.attorney.last_name].filter(Boolean).join(' ') || c.attorney.email
                  : null;
                const issueType = c.triage_assessments?.[0]?.issue_type ?? '—';
                const date = new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.caseTitle}>{c.title}</div>
                      <div className={styles.caseId}>{c.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className={styles.issueCell}>{issueType}</td>
                    <td>{clientName}</td>
                    <td>
                      {attyName
                        ? <span className={styles.assignedAtty}><UserCheck size={13} />{attyName}</span>
                        : <span className={styles.unassigned}>Unassigned</span>
                      }
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className={styles.dateCell}>{date}</td>
                    <td>
                      <button className={styles.assignBtn} onClick={() => openAssign(c)}>
                        <UserCheck size={14} />
                        {attyName ? 'Reassign' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && createPortal(
        <div className={styles.overlay} onClick={() => !assigning && setAssignModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Assign Attorney</h2>
                <p className={styles.modalSubtitle}>{assignModal.title}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setAssignModal(null)} disabled={assigning}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.caseInfo}>
                <div className={styles.caseInfoRow}>
                  <span>Status</span>
                  <StatusBadge status={assignModal.status} />
                </div>
                <div className={styles.caseInfoRow}>
                  <span>Client</span>
                  <span>
                    {assignModal.client
                      ? [assignModal.client.first_name, assignModal.client.last_name].filter(Boolean).join(' ') || assignModal.client.email
                      : '—'}
                  </span>
                </div>
                <div className={styles.caseInfoRow}>
                  <span>Issue Type</span>
                  <span>{assignModal.triage_assessments?.[0]?.issue_type ?? '—'}</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Select Attorney</label>
                {attorneys.length === 0 ? (
                  <p className={styles.noAttorneys}>No verified attorneys are available.</p>
                ) : (
                  <div className={styles.attyList}>
                    {attorneys.map(a => {
                      const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
                      return (
                        <label key={a.id} className={`${styles.attyOption} ${selectedAttorney === a.id ? styles.attyOptionSelected : ''}`}>
                          <input
                            type="radio"
                            name="attorney"
                            value={a.id}
                            checked={selectedAttorney === a.id}
                            onChange={() => setSelectedAttorney(a.id)}
                          />
                          <div className={styles.attyInfo}>
                            <div className={styles.attyName}>{name}</div>
                            <div className={styles.attyMeta}>IBP {a.ibp_number ?? 'N/A'} · {a.email}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignError && (
                <div className={styles.errorMsg}>
                  <AlertCircle size={14} />
                  {assignError}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setAssignModal(null)} disabled={assigning}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={handleAssign}
                disabled={!selectedAttorney || assigning}
              >
                {assigning ? <><Loader2 size={14} className={styles.spinner} /> Assigning…</> : <><UserCheck size={14} /> Confirm Assignment</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
