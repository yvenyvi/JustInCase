import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { Mail, Phone, Settings, Shield, FileText, Bell, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import EditProfileModal from '../../components/EditProfileModal';
import ConfirmModal from '../../components/ConfirmModal';
import AvatarUpload from '../../components/AvatarUpload';
import { documentGeneratorService } from '../../services/documentGeneratorService';
import GeneratedDocumentsModal from './GeneratedDocumentsModal';
import styles from './Profile.module.css';
import Skeleton from '../../components/Skeleton';

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

const Profile = () => {
  const { profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = React.useState<any[]>([]);
  const [isCasesLoading, setIsCasesLoading] = React.useState(false);
  const [generatedDocuments, setGeneratedDocuments] = React.useState<GeneratedDocumentItem[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = React.useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = React.useState(false);
  const [isEditingInterests, setIsEditingInterests] = React.useState(false);
  const [confirmSaveInterests, setConfirmSaveInterests] = React.useState(false);
  const [draftInterests, setDraftInterests] = React.useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

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

  const fetchCases = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsCasesLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('*, attorney:attorney_id(first_name, last_name)')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!error && data) setCases(data);
    setIsCasesLoading(false);
  }, [profile?.id]);

  React.useEffect(() => {
    setIsDocumentsModalOpen(false);

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

    fetchCases();
    fetchGeneratedDocuments();

    if (!profile?.id) return;
    const channel = supabase
      .channel(`profile-cases-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `client_id=eq.${profile.id}` }, fetchCases)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCases, profile?.id]);

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

  const user = {
    name: profile?.first_name ? `${profile.first_name} ${profile.middle_name ? profile.middle_name.charAt(0) + '. ' : ''}${profile.last_name || ''} ${profile.suffix || ''}`.trim() : profile?.email?.split('@')[0] || 'User',
    role: 'Public User',
    email: profile?.email || 'No email provided',
    phone: profile?.phone_number || 'No phone provided',
    language: 'Filipino, English',
    verified: profile?.is_didit_verified || false,
    accountCreated: formatDate(profile?.created_at),
    lastUpdated: getTimeAgo(profile?.updated_at)
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
    setIsEditingInterests(false);
  };

  const startEditingInterests = () => {
    setDraftInterests(profile?.interests || []);
    setIsEditingInterests(true);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Profile</h1>

      {/* Profile Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <AvatarUpload variant="public" size={80} iconSize={40} />
          
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h2 className={styles.name}>{user.name}</h2>
              {user.verified && <Badge status="success">Verified Identity</Badge>}
            </div>
            <p className={styles.memberSince}>Member since {user.accountCreated}</p>
            
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <MapPin size={16} />
                <span>
                  {[
                    profile?.street_address,
                    profile?.barangay,
                    profile?.city_municipality,
                    profile?.province,
                    profile?.region
                  ].filter(Boolean).join(', ') || 'No address provided'}
                </span>
              </div>
              <div className={styles.contactItem}>
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={16} />
                <span>{user.phone}</span>
              </div>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>Edit Details</Button>
        </div>
      </div>

      {/* Main Content Grid — on mobile: main content first, settings below */}
      <div className={styles.grid}>
        
        {/* Column 1 (Desktop Left / Mobile: appears SECOND) — Account Settings & Security */}
        <div className={`${styles.column} ${styles.settingsColumn}`}>
          <Card>
            <h3 className={styles.sectionTitle}>Account Settings</h3>
             <div className={styles.stack}>
                <div className={styles.settingItem}>
                   <div className={styles.settingContent}>
                      <div className={styles.iconBox}>
                        <Settings size={18} />
                      </div>
                      <div>
                        <p className={styles.settingLabel}>Language</p>
                        <p className={styles.settingValue}>{user.language}</p>
                      </div>
                   </div>
                </div>

                <div className={styles.settingItem}>
                   <div className={styles.settingContent}>
                      <div className={styles.iconBox}>
                        <Bell size={18} />
                      </div>
                      <div>
                        <p className={styles.settingLabel}>Notifications</p>
                        <p className={styles.settingValue}>In-App Only</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => navigate('/public/notifications')}>View</Button>
                </div>
             </div>
          </Card>

          <Card>
             <h3 className={styles.sectionTitle}>Security</h3>
             <div className={styles.stack}>
                <div className={styles.settingItem}>
                   <div className={styles.settingContent}>
                      <div className={styles.iconBox}>
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className={styles.settingLabel}>Account Activity</p>
                        <p className={styles.settingValue}>Last profile update: {user.lastUpdated}</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => navigate('/public/notifications')}>View</Button>
                </div>
             </div>
          </Card>

          <Card>
            <h3 className={styles.sectionTitle}>Identity Verification</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: user.verified ? 'var(--color-success-bg)' : 'var(--color-background)', borderRadius: 'var(--radius-md)', border: user.verified ? '1px solid var(--color-success)' : '1px solid var(--color-border)' }}>
              <Shield size={24} color={user.verified ? 'var(--color-success)' : 'var(--color-text-muted)'} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: user.verified ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {user.verified ? 'Verified Citizen' : 'Unverified Account'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {user.verified ? 'Level 2 authenticated' : 'Please complete verification'}
                </p>
              </div>
            </div>
          </Card>

          <Button variant="outline" className={styles.logOutButton} onClick={() => setConfirmSignOut(true)}>
            Log Out Account
          </Button>
        </div>

        {/* Column 2 (Desktop Center / Mobile: appears FIRST) — Case Activity */}
        <div className={`${styles.column} ${styles.mainColumn}`}>
           <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Case Activity</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/public/cases')}>View All</Button>
              </div>
              {isCasesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0.5rem 0' }}>
                  <div className={styles.activeRequest}>
                    <Skeleton style={{ height: 18, width: '60%', borderRadius: 4, marginBottom: 8 }} />
                    <Skeleton style={{ height: 14, width: '30%', borderRadius: 4 }} />
                  </div>
                  <div className={styles.activeRequest}>
                    <Skeleton style={{ height: 18, width: '50%', borderRadius: 4, marginBottom: 8 }} />
                    <Skeleton style={{ height: 14, width: '25%', borderRadius: 4 }} />
                  </div>
                </div>
              ) : cases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {cases.slice(0, 2).map((c: any) => {
                    const atty = c.attorney as { first_name: string | null; last_name: string | null } | null;
                    const attorneyName = atty
                      ? ['Atty.', atty.first_name, atty.last_name].filter(Boolean).join(' ')
                      : null;
                    return (
                      <div key={c.id} className={styles.activeRequest}>
                        <h4 className={styles.activeRequestTitle}>{c.title}</h4>
                        <p className={styles.activeRequestValue}>{c.status}</p>
                        {attorneyName && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            Assigned to: <strong>{attorneyName}</strong>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '1rem 0' }}>No case activity found.</p>
              )}

              <div className={styles.documentsHeaderRow}>
                <h4 className={styles.sectionTitle} style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
                  Generated Documents
                </h4>
                {generatedDocuments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.viewAllButton}
                    onClick={() => setIsDocumentsModalOpen(true)}
                  >
                    View All
                  </Button>
                )}
              </div>

              {isDocumentsLoading ? (
                <div style={{ padding: '0.5rem 0 1rem' }}>
                  <div className={styles.documentItem}>
                    <Skeleton style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
                    <div className={styles.documentInfo} style={{ flex: 1 }}>
                      <Skeleton style={{ height: 16, width: '50%', borderRadius: 4, marginBottom: 6 }} />
                      <Skeleton style={{ height: 12, width: '35%', borderRadius: 4, marginBottom: 6 }} />
                      <Skeleton style={{ height: 12, width: '90%', borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              ) : generatedDocuments.length > 0 ? (
                <div className={styles.documentList}>
                  {generatedDocuments.slice(0, 1).map((doc) => (
                    <div key={doc.id} className={styles.documentItem}>
                      <FileText size={18} className={styles.documentIcon} />
                      <div className={styles.documentInfo}>
                        <p className={styles.documentName}>{doc.templateTitle}</p>
                        <p className={styles.documentDate}>Generated {getTimeAgo(doc.generatedAt)} ({formatDate(doc.generatedAt)})</p>
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
              ) : (
                <div className={styles.documentList}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                    No generated documents yet.
                  </p>
                </div>
              )}
           </Card>
        </div>

        {/* Column 3 (Desktop Right / Mobile: appears FIRST alongside case activity) — Interests */}
        <div className={`${styles.column} ${styles.interestsColumn}`}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Legal Interests</h3>
              {!isEditingInterests && profile?.interests && profile.interests.length > 0 && (
                <Button variant="ghost" size="sm" onClick={startEditingInterests}>Edit</Button>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>We customize your rights library based on these categories.</p>
            
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
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No interests selected yet.</p>
                    <Button variant="outline" size="sm" onClick={startEditingInterests}>Add Interests</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />

      <GeneratedDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        documents={generatedDocuments}
        onDownload={(doc) => documentGeneratorService.downloadDraft(doc.fileName, doc.content)}
      />
      <ConfirmModal
        isOpen={confirmSaveInterests}
        title="Save Interests"
        message={`Save ${draftInterests.length} selected interest${draftInterests.length !== 1 ? 's' : ''}?`}
        confirmLabel="Save"
        onConfirm={() => { setConfirmSaveInterests(false); handleSaveInterests(); }}
        onCancel={() => setConfirmSaveInterests(false)}
      />
      <ConfirmModal
        isOpen={confirmSignOut}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        variant="danger"
        onConfirm={signOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
};

export default Profile;
