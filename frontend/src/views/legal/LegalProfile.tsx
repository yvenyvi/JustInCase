import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { Mail, Phone, MapPin, Award, Calendar, Loader2, Settings, Bell, Shield, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import EditProfileModal from '../../components/EditProfileModal';
import ConfirmModal from '../../components/ConfirmModal';
import AvatarUpload from '../../components/AvatarUpload';
import styles from './Profile.module.css';

const Profile = () => {
  const { profile, signOut, updateProfile } = useAuth();
  const [activeCaseCount, setActiveCaseCount] = React.useState(0);
  const [totalCaseCount, setTotalCaseCount] = React.useState(0);
  const [proBonoHours, setProBonoHours] = React.useState(0);
  const [isCasesLoading, setIsCasesLoading] = React.useState(false);
  const [ratingStats, setRatingStats] = React.useState<{
    avg: number;
    count: number;
    recent: { rating: number; comment: string; caseTitle: string }[];
    all: { title: string; rating: number; outcome: string; comment: string | null; closedAt: string | null }[];
  } | null>(null);
  const [ratingsModalOpen, setRatingsModalOpen] = React.useState(false);
  const [isEditingInterests, setIsEditingInterests] = React.useState(false);
  const [draftInterests, setDraftInterests] = React.useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [confirmSaveInterests, setConfirmSaveInterests] = React.useState(false);
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

  const fetchStats = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsCasesLoading(true);

    const [casesResult, hoursResult, ratingsResult] = await Promise.all([
      supabase.from('cases').select('id, status').eq('attorney_id', profile.id),
      supabase.from('pro_bono_logs').select('hours').eq('attorney_id', profile.id),
      supabase.from('cases').select('title, feedback_rating, client_feedback, client_comment, closed_at').eq('attorney_id', profile.id).not('feedback_rating', 'is', null),
    ]);

    if (!casesResult.error && casesResult.data) {
      setTotalCaseCount(casesResult.data.length);
      setActiveCaseCount(casesResult.data.filter(c => c.status === 'In Progress').length);
    }
    if (!hoursResult.error && hoursResult.data) {
      const total = hoursResult.data.reduce((sum, row) => sum + (Number(row.hours) || 0), 0);
      setProBonoHours(Math.round(total * 10) / 10);
    }
    if (!ratingsResult.error && ratingsResult.data && ratingsResult.data.length > 0) {
      const rows = ratingsResult.data as { title: string; feedback_rating: number; client_feedback: string | null; client_comment: string | null; closed_at: string | null }[];
      const avg = rows.reduce((s, r) => s + r.feedback_rating, 0) / rows.length;
      const withComment = [...rows].reverse().filter(r => r.client_comment);
      setRatingStats({
        avg,
        count: rows.length,
        recent: withComment.slice(0, 3).map(r => ({ rating: r.feedback_rating, comment: r.client_comment!, caseTitle: r.title })),
        all: [...rows].reverse().map(r => ({ title: r.title, rating: r.feedback_rating, outcome: r.client_feedback ?? '', comment: r.client_comment ?? null, closedAt: r.closed_at })),
      });
    } else {
      setRatingStats(null);
    }
    setIsCasesLoading(false);
  }, [profile?.id]);

  React.useEffect(() => { fetchStats(); }, [fetchStats]);

  React.useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`legal-profile-stats-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `attorney_id=eq.${profile.id}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_bono_logs', filter: `attorney_id=eq.${profile.id}` }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats, profile?.id]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-PH', { 
      year: 'numeric', 
      month: 'long'
    }).format(new Date(dateStr));
  };

  const user = {
    name: profile?.first_name ? `Atty. ${profile.first_name} ${profile.middle_name ? profile.middle_name.charAt(0) + '. ' : ''}${profile.last_name || ''} ${profile.suffix || ''}`.trim() : `Atty. ${profile?.email?.split('@')[0] || 'User'}`,
    role: profile?.role === 'admin' ? 'Super Administrator' : 'Volunteer Attorney',
    email: profile?.email || 'No email provided',
    phone: profile?.phone_number || 'No phone provided',
    language: profile?.language || 'Filipino, English',
    location: [
      profile?.street_address,
      profile?.barangay,
      profile?.city_municipality,
      profile?.province,
      profile?.region
    ].filter(Boolean).join(', ') || 'No location provided',
    firmName: profile?.firm_name || null,
    barNumber: profile?.roll_number ? `Roll No. ${profile.roll_number}` : 'N/A',
    practiceAreas: profile?.interests || [],
    bio: 'JusticeLink Volunteer Attorney. Dedicated to providing legal assistance to those in need.',
    availability: 'Active Member',
    joinedDate: `Member since ${formatDate(profile?.created_at)}`,
    certifications: profile?.ibp_number ? [`IBP No. ${profile.ibp_number}`] : []
  };

  const authenticTerms = [
    'Batas Pampamilya', 
    'Karapatan sa Paggawa', 
    'Away sa Barangay', 
    'Karapatang Pantao', 
    'Depensa sa Krimen', 
    'Lupa at Ari-arian',
    'Benepisyong Panlipunan'
  ];

  const toggleInterest = (term: string) => {
    setDraftInterests(prev => 
      prev.includes(term) ? prev.filter(i => i !== term) : [...prev, term]
    );
  };

  const handleSaveInterests = async () => {
    await updateProfile({ interests: draftInterests });
    auditService.log('Profile Updated', `Updated practice area interests: ${draftInterests.join(', ') || 'none'}`);
    setIsEditingInterests(false);
  };

  const startEditingInterests = () => {
    setDraftInterests(profile?.interests || []);
    setIsEditingInterests(true);
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <AvatarUpload variant="legal" size={96} iconSize={48} />
          
          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{user.name}</h1>
            <p className={styles.role}>{user.firmName ?? user.role}</p>
            <div className={styles.badges}>
              <Badge status="success">{user.availability}</Badge>
              <Badge status="default">Bar #: {user.barNumber}</Badge>
            </div>
            
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={16} />
                <span>{user.phone}</span>
              </div>
              <div className={styles.contactItem}>
                <MapPin size={16} />
                <span>{user.location}</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>Edit Profile</Button>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Column 1: Professional Background */}
        <div className={styles.column}>
          <Card>
            <h3 className={styles.sectionTitle}>Professional Bio</h3>
            <p className={styles.bio}>
              {user.bio}
            </p>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Key Practice Areas</h3>
              {!isEditingInterests && profile?.interests && profile.interests.length > 0 && (
                <Button variant="ghost" size="sm" onClick={startEditingInterests}>Edit</Button>
              )}
            </div>
            
            {isEditingInterests ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {authenticTerms.map(tag => {
                    const isSelected = draftInterests.includes(tag);
                    return (
                      <button 
                        key={tag} 
                        onClick={() => toggleInterest(tag)}
                        style={{ 
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-background)', 
                          color: isSelected ? 'white' : 'var(--color-text)',
                          border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', 
                          padding: '0.4rem 0.75rem', 
                          borderRadius: 'var(--radius-full)', 
                          fontSize: '0.875rem', 
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>Click a category to select or deselect it.</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" onClick={() => setConfirmSaveInterests(true)}>Done</Button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile?.interests && profile.interests.length > 0 ? (
                  profile.interests.map(tag => (
                    <div key={tag} style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 500 }}>
                      {tag}
                    </div>
                  ))
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', gap: '1rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No practice areas listed yet.</p>
                    <Button variant="outline" size="sm" onClick={startEditingInterests}>Add Areas</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Column 2: Performance & Metrics */}
        <div className={styles.column}>
          <Card>
             <h3 className={styles.sectionTitle}>Performance at a Glance</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div className={styles.statRow}>
                 <span className={styles.statLabel}>Active Cases</span>
                 <span className={styles.statValue}>{isCasesLoading ? '...' : activeCaseCount}</span>
               </div>

               {(() => {
                 const TARGET_HOURS = 60;
                 const pct = Math.min(100, Math.round((proBonoHours / TARGET_HOURS) * 100));
                 return (
                   <>
                     <div className={styles.statRow} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                       <span className={styles.statLabel}>Pro-Bono Hours</span>
                       <span className={styles.statValue}>
                         {isCasesLoading ? '...' : `${proBonoHours} / ${TARGET_HOURS}`}
                         <span style={{
                           background: 'var(--color-success)',
                           color: 'white',
                           fontWeight: 600,
                           borderRadius: '12px',
                           padding: '0.15rem 0.6rem',
                           fontSize: '0.85rem',
                           marginLeft: '0.5rem'
                         }}>{isCasesLoading ? '...' : `${pct}%`}</span>
                       </span>
                     </div>
                     <div style={{ width: '100%', height: '10px', background: 'var(--color-success-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                       <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-success)', borderRadius: '6px' }}></div>
                     </div>
                   </>
                 );
               })()}

               <div className={styles.statRow}>
                 <span className={styles.statLabel}>Clients Served</span>
                 <span className={styles.statValue}>{isCasesLoading ? '...' : `${totalCaseCount} Total`}</span>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                 <span style={{ color: 'var(--color-text-muted)' }}>IBP Number</span>
                 <span style={{ fontWeight: 600 }}>{profile?.ibp_number || 'N/A'}</span>
               </div>
               
               <div className={styles.joinedDate}>
                 <Calendar size={16} />
                 <span>{user.joinedDate}</span>
               </div>
             </div>
          </Card>

          {/* Reputation card — only shown once there are ratings */}
          {ratingStats !== null && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Client Ratings</h3>
                <button
                  onClick={() => setRatingsModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  View All
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                    {ratingStats.avg.toFixed(1)}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', margin: '0.35rem 0' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14}
                        fill={s <= Math.round(ratingStats.avg) ? '#f59e0b' : 'none'}
                        color={s <= Math.round(ratingStats.avg) ? '#f59e0b' : '#d1d5db'}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {ratingStats.count} {ratingStats.count === 1 ? 'rating' : 'ratings'}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[5,4,3,2,1].map(star => {
                    const n = ratingStats.all.filter(r => r.rating === star).length;
                    const pct = ratingStats.count > 0 ? Math.round((n / ratingStats.count) * 100) : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', width: '6px', textAlign: 'right' }}>{star}</span>
                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-background)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '3px' }} />
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', width: '24px' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {ratingStats.recent.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', margin: 0 }}>Recent Comments</p>
                  {ratingStats.recent.map((r, i) => (
                    <div key={i} style={{ padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '0.25rem' }}>
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12}
                            fill={s <= r.rating ? '#f59e0b' : 'none'}
                            color={s <= r.rating ? '#f59e0b' : '#d1d5db'}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.3rem', lineHeight: 1.5, fontStyle: 'italic' }}>"{r.comment}"</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0, opacity: 0.7 }}>{r.caseTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Column 3: Credentials & Account */}
        <div className={styles.column}>
          <Card>
             <h3 className={styles.sectionTitle}>Certifications</h3>
             <ul className={styles.list}>
              {user.certifications.length > 0 ? user.certifications.map((cert, index) => (
                <li key={index} className={styles.listItem}>
                  <Award className="mt-1" size={18} color="var(--color-warning)" />
                  <span style={{ fontSize: '0.9375rem' }}>{cert}</span>
                </li>
              )) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No certifications listed.</p>
              )}
            </ul>
          </Card>

          <Card>
            <h3 className={styles.sectionTitle}>Account Settings</h3>
            <div className={styles.settingsList}>
              <div className={styles.settingRow}>
                <Settings size={16} />
                <span>Language: <strong>{user.language}</strong></span>
              </div>
              <div className={styles.settingRow}>
                <Bell size={16} />
                <span>Notifications</span>
              </div>
              <div className={styles.settingRow}>
                <Shield size={16} />
                <span>Privacy & Security</span>
              </div>
            </div>
            <Button variant="ghost" className={`${styles.menuButton} ${styles.signOut}`} onClick={() => setConfirmSignOut(true)}>Sign Out</Button>
          </Card>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        role="legal"
      />

      {/* All Ratings Modal */}
      {ratingsModalOpen && ratingStats && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setRatingsModalOpen(false); }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>All Client Ratings</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {ratingStats.avg.toFixed(1)} avg · {ratingStats.count} {ratingStats.count === 1 ? 'rating' : 'ratings'}
                </p>
              </div>
              <button onClick={() => setRatingsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
                <Award size={20} style={{ display: 'none' }} />
                ✕
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {ratingStats.all.map((r, i) => (
                <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', flex: 1, paddingRight: '0.5rem' }}>{r.title}</p>
                    {r.closedAt && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {new Date(r.closedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: r.comment ? '0.5rem' : 0 }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13}
                          fill={s <= r.rating ? '#f59e0b' : 'none'}
                          color={s <= r.rating ? '#f59e0b' : '#d1d5db'}
                        />
                      ))}
                    </div>
                    {r.outcome && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: '9999px',
                        backgroundColor: r.outcome === 'Nalutas' ? 'rgba(16,185,129,0.1)' : r.outcome === 'Hindi nalutas' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: r.outcome === 'Nalutas' ? 'var(--color-success)' : r.outcome === 'Hindi nalutas' ? '#ef4444' : '#d97706',
                      }}>{r.outcome}</span>
                    )}
                  </div>
                  {r.comment && (
                    <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.55 }}>"{r.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmSaveInterests}
        title="Save Practice Areas"
        message={`Save ${draftInterests.length} selected practice area${draftInterests.length !== 1 ? 's' : ''}?`}
        confirmLabel="Save"
        onConfirm={() => { setConfirmSaveInterests(false); handleSaveInterests(); }}
        onCancel={() => setConfirmSaveInterests(false)}
      />
      <ConfirmModal
        isOpen={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        variant="danger"
        onConfirm={signOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
};

export default Profile;
