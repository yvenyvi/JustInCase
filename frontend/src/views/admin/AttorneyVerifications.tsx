import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import ConfirmModal from '../../components/ConfirmModal';
import styles from './AttorneyVerifications.module.css';

interface PendingAttorney {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  ibp_number: string | null;
  roll_number: string | null;
  id_picture_url: string | null;
  selfie_url: string | null;
  phone_number: string | null;
  region: string | null;
  province: string | null;
  city_municipality: string | null;
  barangay: string | null;
  street_address: string | null;
  created_at: string;
  status_verification: 'unverified' | 'verified' | 'rejected';
}

type FilterTab = 'unverified' | 'verified' | 'rejected';

const AttorneyVerifications = () => {
  const [attorneys, setAttorneys] = useState<PendingAttorney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('unverified');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; status: 'verified' | 'rejected' } | null>(null);

  const fetchAttorneys = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, middle_name, last_name, suffix, ibp_number, roll_number, id_picture_url, selfie_url, phone_number, region, province, city_municipality, barangay, street_address, created_at, status_verification')
      .eq('role', 'Volunteer Attorney')
      .order('created_at', { ascending: false });

    if (!error && data) setAttorneys(data as PendingAttorney[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAttorneys(); }, [fetchAttorneys]);

  useEffect(() => {
    const channel = supabase
      .channel('attorney-verifications-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `role=eq.Volunteer Attorney` }, fetchAttorneys)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAttorneys]);

  const updateStatus = async (id: string, status: 'verified' | 'rejected') => {
    setActionLoading(id);
    const { error } = await supabase
      .from('users')
      .update({ status_verification: status })
      .eq('id', id);

    if (!error) {
      const attorney = attorneys.find(a => a.id === id);
      const name = attorney ? fullName(attorney) : id;
      auditService.log(
        status === 'verified' ? 'Attorney Verified' : 'Attorney Rejected',
        `Admin ${status === 'verified' ? 'approved' : 'rejected'} attorney application: ${name}`
      );
      setAttorneys((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status_verification: status } : a))
      );
      setExpandedId(null);

      if (status === 'verified') {
        await supabase.from('notifications').insert({
          user_id: id,
          title: 'Account Approved',
          body: 'Your attorney account has been approved. You can now log in to JusticeLink and start accepting pro-bono cases.',
          link: '/legal/dashboard',
        });
      } else {
        await supabase.from('notifications').insert({
          user_id: id,
          title: 'Account Not Approved',
          body: 'Your attorney account application was reviewed and could not be approved at this time. Please contact support for more information.',
          link: null,
        });
      }
    }
    setActionLoading(null);
  };

  const filtered = attorneys.filter((a) => a.status_verification === activeTab);

  const counts = {
    unverified: attorneys.filter((a) => a.status_verification === 'unverified').length,
    verified: attorneys.filter((a) => a.status_verification === 'verified').length,
    rejected: attorneys.filter((a) => a.status_verification === 'rejected').length,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  const fullName = (a: PendingAttorney) =>
    [a.first_name, a.middle_name, a.last_name, a.suffix].filter(Boolean).join(' ');

  const fullAddress = (a: PendingAttorney) =>
    [a.street_address, a.barangay, a.city_municipality, a.province, a.region].filter(Boolean).join(', ');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Attorney Verifications</h1>
          <p className={styles.subtitle}>Review and approve pending attorney account applications.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconOrange}`}><Clock size={22} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{counts.unverified}</span>
            <span className={styles.statLabel}>Pending Review</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}><CheckCircle size={22} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{counts.verified}</span>
            <span className={styles.statLabel}>Approved</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}><XCircle size={22} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{counts.rejected}</span>
            <span className={styles.statLabel}>Rejected</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabs}>
        {(['unverified', 'verified', 'rejected'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {counts[tab] > 0 && <span className={styles.tabBadge}>{counts[tab]}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No {activeTab} applications.</div>
        ) : (
          filtered.map((attorney) => {
            const isOpen = expandedId === attorney.id;
            return (
              <div key={attorney.id} className={styles.card}>
                {/* Card header row */}
                <button
                  className={styles.cardHeader}
                  onClick={() => setExpandedId(isOpen ? null : attorney.id)}
                >
                  <div className={styles.cardLeft}>
                    <div className={styles.avatar}>
                      {attorney.first_name?.[0]}{attorney.last_name?.[0]}
                    </div>
                    <div>
                      <div className={styles.cardName}>Atty. {fullName(attorney)}</div>
                      <div className={styles.cardMeta}>{attorney.email} · Applied {formatDate(attorney.created_at)}</div>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    {activeTab === 'unverified' && (
                      <>
                        <button
                          className={styles.approveBtn}
                          disabled={!!actionLoading}
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: attorney.id, name: fullName(attorney), status: 'verified' }); }}
                        >
                          <UserCheck size={15} />
                          Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          disabled={!!actionLoading}
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: attorney.id, name: fullName(attorney), status: 'rejected' }); }}
                        >
                          <UserX size={15} />
                          Reject
                        </button>
                      </>
                    )}
                    {activeTab === 'rejected' && (
                      <button
                        className={styles.approveBtn}
                        disabled={!!actionLoading}
                        onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: attorney.id, name: fullName(attorney), status: 'verified' }); }}
                      >
                        <UserCheck size={15} />
                        Approve
                      </button>
                    )}
                    {isOpen ? <ChevronUp size={18} className={styles.chevron} /> : <ChevronDown size={18} className={styles.chevron} />}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isOpen && (
                  <div className={styles.detail}>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Professional Details</h4>
                        <div className={styles.detailRow}><span>IBP Number</span><strong>{attorney.ibp_number || '—'}</strong></div>
                        <div className={styles.detailRow}><span>Roll Number</span><strong>{attorney.roll_number || '—'}</strong></div>
                        <div className={styles.detailRow}><span>Phone</span><strong>{attorney.phone_number || '—'}</strong></div>
                        <div className={styles.detailRow}><span>Address</span><strong>{fullAddress(attorney) || '—'}</strong></div>
                      </div>

                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Submitted Documents</h4>
                        <div className={styles.docGrid}>
                          <div className={styles.docItem}>
                            <p className={styles.docLabel}>IBP ID</p>
                            {attorney.id_picture_url ? (
                              <img
                                src={attorney.id_picture_url}
                                alt="IBP ID"
                                className={styles.docImg}
                                onClick={() => setLightboxUrl(attorney.id_picture_url)}
                              />
                            ) : <span className={styles.noDoc}>Not uploaded</span>}
                          </div>
                          <div className={styles.docItem}>
                            <p className={styles.docLabel}>Live Selfie</p>
                            {attorney.selfie_url ? (
                              <img
                                src={attorney.selfie_url}
                                alt="Selfie"
                                className={styles.docImg}
                                onClick={() => setLightboxUrl(attorney.selfie_url)}
                              />
                            ) : <span className={styles.noDoc}>Not uploaded</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.status === 'verified' ? 'Approve Attorney' : 'Reject Attorney'}
        message={
          confirmAction?.status === 'verified'
            ? `Approve Atty. ${confirmAction.name}? They will be notified and can start accepting pro-bono cases.`
            : `Reject Atty. ${confirmAction?.name}? They will be notified that their application was not approved.`
        }
        confirmLabel={confirmAction?.status === 'verified' ? 'Approve' : 'Reject'}
        variant={confirmAction?.status === 'rejected' ? 'danger' : 'default'}
        onConfirm={() => { const a = confirmAction!; setConfirmAction(null); updateStatus(a.id, a.status); }}
        onCancel={() => setConfirmAction(null)}
        isLoading={actionLoading === confirmAction?.id}
      />
      {/* Lightbox */}
      {lightboxUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Document preview" className={styles.lightboxImg} />
        </div>
      )}
    </div>
  );
};

export default AttorneyVerifications;
