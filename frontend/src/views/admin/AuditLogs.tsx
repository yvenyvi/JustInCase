import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Search,
  Download,
  User,
  Shield,
  FileText,
  MessageSquare,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './AuditLogs.module.css';

interface LogEntry {
  id: number;
  user_id: string;
  action_type: string;
  detail: string;
  ip_address: string | null;
  created_at: string;
  userName: string;
  userRole: string;
}

type Category = 'All' | 'Security' | 'Case' | 'Message' | 'Triage' | 'Profile';

const CATEGORY_MAP: Record<string, Category> = {
  'User Login': 'Security',
  'Case Accepted': 'Case',
  'Case Rejected': 'Case',
  'Case Closed': 'Case',
  'Case Withdrawn': 'Case',
  'Triage Submitted': 'Triage',
  'Attorney Matched': 'Triage',
  'Message Sent': 'Message',
  'File Uploaded': 'Message',
  'Profile Updated': 'Profile',
};

const ROLE_LABEL: Record<string, string> = {
  'Citizen': 'Public',
  'Volunteer Attorney': 'Legal',
  'Super Administrator': 'Admin',
};

const PAGE_SIZE = 20;

const getCategory = (actionType: string): Category =>
  CATEGORY_MAP[actionType] ?? 'Security';

const getCategoryIcon = (category: Category) => {
  switch (category) {
    case 'Security': return <Shield size={15} />;
    case 'Case': return <FileText size={15} />;
    case 'Message': return <MessageSquare size={15} />;
    case 'Triage': return <ClipboardList size={15} />;
    case 'Profile': return <User size={15} />;
    default: return <CheckCircle2 size={15} />;
  }
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const AuditLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category>('All');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);

    const { data: logRows, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action_type, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !logRows) { setIsLoading(false); return; }

    const userIds = [...new Set(logRows.map((r: any) => r.user_id).filter(Boolean))];
    const { data: userRows } = userIds.length
      ? await supabase.from('users').select('id, first_name, last_name, role').in('id', userIds)
      : { data: [] };

    const userMap: Record<string, { name: string; role: string }> = {};
    for (const u of userRows ?? []) {
      userMap[u.id] = {
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown',
        role: ROLE_LABEL[u.role] ?? u.role ?? 'Unknown',
      };
    }

    const mapped: LogEntry[] = logRows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      action_type: r.action_type,
      detail: r.detail,
      ip_address: r.ip_address ?? null,
      created_at: r.created_at,
      userName: userMap[r.user_id]?.name ?? 'Unknown',
      userRole: userMap[r.user_id]?.role ?? '—',
    }));

    setLogs(mapped);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('audit-logs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = logs.filter(log => {
    const matchSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'All' || getCategory(log.action_type) === filterCategory;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCategoryChange = (cat: Category) => {
    setFilterCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleExportCSV = () => {
    const header = 'Timestamp,User,Role,Action,Detail,Category,IP';
    const rows = filtered.map(l =>
      [fmt(l.created_at), l.userName, l.userRole, l.action_type, `"${l.detail.replace(/"/g, '""')}"`, getCategory(l.action_type), l.ip_address ?? '—'].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Logs</h1>
          <p className={styles.subtitle}>Comprehensive trail of all system activities and user actions.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleExportCSV}>
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by user, action, or detail..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <div className={styles.divider}></div>
          <select
            className={styles.select}
            value={filterCategory}
            onChange={e => handleCategoryChange(e.target.value as Category)}
          >
            <option value="All">All Categories</option>
            <option value="Security">Security</option>
            <option value="Case">Case</option>
            <option value="Message">Message</option>
            <option value="Triage">Triage</option>
            <option value="Profile">Profile</option>
          </select>
        </div>
      </div>

      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={28} className={styles.spin ?? ''} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Detail</th>
                <th>Category</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map(log => {
                  const category = getCategory(log.action_type);
                  return (
                    <tr key={log.id}>
                      <td className={styles.timestampCell}>{fmt(log.created_at)}</td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>{log.userName.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className={styles.userName}>{log.userName}</div>
                            <div className={styles.userRole}>{log.userRole}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.actionCell} style={{ fontWeight: 600 }}>{log.action_type}</td>
                      <td className={styles.actionCell} style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{log.detail}</td>
                      <td>
                        <div className={styles.categoryCell}>
                          {getCategoryIcon(category)}
                          <span>{category}</span>
                        </div>
                      </td>
                      <td className={styles.ipCell}>{log.ip_address ?? '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No logs found matching your criteria.
                    <button
                      onClick={() => { handleSearchChange(''); handleCategoryChange('All'); }}
                      style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Showing {paginated.length} of {filtered.length} entries
          </span>
          <div className={styles.pageControls}>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: '0 0.25rem', color: 'var(--color-text-muted)' }}>…</span>
                  )}
                  <button
                    className={`${styles.pageBtn} ${p === page ? styles.pageActive : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </Fragment>
              ))}
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
