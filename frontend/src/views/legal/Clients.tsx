import React from 'react';
import { Phone, Mail, MapPin, Search, MessageSquare, Briefcase, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createCaseThread } from '../../lib/createCaseThread';
import styles from './LegalDashboard.module.css';

interface ClientCase {
  id: string;
  title: string;
  status: string;
}

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  cases: ClientCase[];
}

const STATUS_ACTIVE = ['Pending Acceptance', 'In Progress'];

const statusColor: Record<string, string> = {
  'Pending Acceptance': 'var(--color-warning)',
  'In Progress': 'var(--color-primary)',
  'Closed - Won': 'var(--color-success)',
  'Closed - Lost': '#ef4444',
};

const Clients = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('Active');

  const fetchClients = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, status, client_id, client:client_id(first_name, last_name, email, phone_number, province, city_municipality, barangay, region)')
      .eq('attorney_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const map = new Map<string, Client>();
      for (const row of data as any[]) {
        const cid = row.client_id;
        if (!cid) continue;
        if (!map.has(cid)) {
          const u = row.client;
          map.set(cid, {
            id: cid,
            fullName: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || 'Unknown',
            email: u?.email || '',
            phone: u?.phone_number || null,
            barangay: u?.barangay || null,
            city: u?.city_municipality || null,
            province: u?.province || null,
            region: u?.region || null,
            cases: [],
          });
        }
        map.get(cid)!.cases.push({ id: row.id, title: row.title, status: row.status });
      }
      setClients([...map.values()]);
    }
    setIsLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  React.useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`attorney-clients-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `attorney_id=eq.${profile.id}` }, fetchClients)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchClients, profile?.id]);

  const handleMessage = async (client: Client) => {
    if (!profile?.id) return;

    // Only create a thread if none exists yet for any of this client's cases.
    // Calling createCaseThread when a thread already exists would pick a different
    // active case, create a second thread, and overwrite the visible conversation.
    const caseIds = client.cases.map(c => c.id);
    const { data: existingThreads } = await supabase
      .from('message_threads')
      .select('id')
      .in('case_id', caseIds)
      .limit(1);

    if (!existingThreads || existingThreads.length === 0) {
      const targetCase =
        client.cases.find(c => STATUS_ACTIVE.includes(c.status)) ?? client.cases[0];
      if (!targetCase) return;
      await createCaseThread(supabase, targetCase.id, targetCase.title, client.id, profile.id, false);
    }

    navigate('/legal/messages', { state: { openClientId: client.id } });
  };

  const filtered = clients.filter(c => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Active'
        ? c.cases.some(cas => STATUS_ACTIVE.includes(cas.status))
        : c.cases.every(cas => !STATUS_ACTIVE.includes(cas.status)));
    return matchesSearch && matchesStatus;
  });

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>Client Management</h1>
          <p className={styles.subtitle}>Directory of individuals you are representing or consulting.</p>
        </div>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: '0.5rem' }}>
        <div className={styles.searchBar} style={{ flex: '1 1 320px', maxWidth: '420px' }}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className={styles.selectField}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="Active">Active Clients</option>
          <option value="Closed">Closed Cases</option>
          <option value="All">All</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={28} className={styles.spin} color="var(--color-primary)" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {clients.length === 0
            ? 'Wala pang kliyente. Tanggapin ang isang kaso para makita sila dito.'
            : 'No clients match your search.'}
          {clients.length > 0 && searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.emptyAction}>Clear search</button>
          )}
        </div>
      ) : (
        <div className={styles.gridCards}>
          {filtered.map(client => {
            const activeCases = client.cases.filter(c => STATUS_ACTIVE.includes(c.status));
            return (
              <div key={client.id} className={`${styles.card} ${styles.clientCard}`}>
                <div className={styles.clientHeader}>
                  <div
                    className={styles.clientAvatar}
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}
                  >
                    {initials(client.fullName)}
                  </div>
                  <div>
                    <h3 className={styles.clientName}>{client.fullName}</h3>
                    <span className={`${styles.badge} ${activeCases.length > 0 ? styles.badgeOrange : styles.badgeBlue}`} style={{ marginTop: '0.35rem' }}>
                      {activeCases.length > 0 ? 'Active' : 'Closed'}
                    </span>
                  </div>
                </div>

                <div className={styles.clientBody}>
                  <div className={styles.clientLine}>
                    <Mail size={16} /> {client.email || '—'}
                  </div>
                  {client.phone && (
                    <div className={styles.clientLine}>
                      <Phone size={16} /> {client.phone}
                    </div>
                  )}
                  {(client.city || client.province) && (
                    <div className={styles.clientLine}>
                      <MapPin size={16} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                      <div>
                        {[client.barangay, client.city].filter(Boolean).join(', ')}
                        {client.province && (
                          <><br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{client.province}{client.region ? `, ${client.region}` : ''}</span></>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cases list */}
                <div style={{ padding: '0 1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {client.cases.slice(0, 3).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <Briefcase size={13} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{c.title}</span>
                      <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 600, color: statusColor[c.status] || 'gray' }}>{c.status}</span>
                    </div>
                  ))}
                  {client.cases.length > 3 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>+{client.cases.length - 3} more case{client.cases.length - 3 > 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className={styles.clientFooter}>
                  <div className={styles.footerStack}>
                    <span className={styles.mutedTitle}>{activeCases.length} Active Case{activeCases.length !== 1 ? 's' : ''}</span>
                    <span className={styles.mutedMeta}>{client.cases.length} Total</span>
                  </div>
                  <button
                    className={styles.primaryButton}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                    onClick={() => handleMessage(client)}
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Clients;
