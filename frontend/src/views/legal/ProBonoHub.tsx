import React from 'react';
import { MapPin, Scale, Star, Search, Loader2, CheckCircle, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createCaseThread } from '../../lib/createCaseThread';
import { auditService } from '../../services/auditService';
import ConfirmModal from '../../components/ConfirmModal';
import styles from './LegalDashboard.module.css';
import Skeleton from '../../components/Skeleton';

interface OpenCase {
  id: string;
  title: string;
  description: string;
  created_at: string;
  issue_type: string | null;
  urgency: string | null;
  client_province: string | null;
  client_id: string | null;
  matchScore: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Housing, Lupa & Eviction': ['housing', 'eviction', 'lupa', 'property', 'rent', 'ari-arian'],
  'Labor & Employment (Trabaho)': ['labor', 'employment', 'trabaho', 'wage', 'paggawa', 'sahod'],
  'Family & VAWC (Violence Against Women)': ['family', 'vawc', 'women', 'children', 'pampamilya'],
  'Criminal Cases': ['criminal', 'crime', 'depensa', 'defense'],
  'Debt & Small Claims': ['debt', 'small claims', 'utang', 'collection'],
  'Iba pang Civil Matters': ['civil', 'contract', 'damages', 'other'],
};

/** Short display labels for the filter chips */
const CATEGORY_CHIP_LABEL: Record<string, string> = {
  'Housing, Lupa & Eviction': 'Housing & Lupa',
  'Labor & Employment (Trabaho)': 'Labor',
  'Family & VAWC (Violence Against Women)': 'Family & VAWC',
  'Criminal Cases': 'Criminal',
  'Debt & Small Claims': 'Small Claims',
  'Iba pang Civil Matters': 'Civil Matters',
};

const urgencyFromDescription = (desc: string): string => {
  const lower = desc.toLowerCase();
  if (lower.includes('urgency: high')) return 'high';
  if (lower.includes('urgency: medium')) return 'medium';
  return 'low';
};

const parseProvinceFromDescription = (desc: string): string | null => {
  const match = desc.match(/^Location:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
};

const computeMatchScore = (interests: string[], issueType: string | null): number => {
  if (!issueType || !interests.length) return 55;
  const normalizedInterests = interests.map(i => i.toLowerCase());
  const keywords = CATEGORY_KEYWORDS[issueType] || [issueType.toLowerCase()];
  const hasMatch = keywords.some(kw =>
    normalizedInterests.some(interest => interest.includes(kw))
  );
  return hasMatch ? 95 : 58;
};

const URGENCY_COLOR: Record<string, string> = {
  high: 'var(--color-danger, #ef4444)',
  medium: 'var(--color-warning)',
  low: 'var(--color-success)',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_KEYWORDS);

const ProBonoHub = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = React.useState<OpenCase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = React.useState<Set<string>>(new Set());
  const [confirmAcceptId, setConfirmAcceptId] = React.useState<string | null>(null);

  /** Attorney's own interest categories matched against CATEGORY_KEYWORDS keys */
  const mySpecialtyCategories = React.useMemo<string[]>(() => {
    const interests: string[] = Array.isArray(profile?.interests) ? (profile!.interests as string[]) : [];
    return ALL_CATEGORIES.filter(cat =>
      interests.some(i =>
        i === cat ||
        (CATEGORY_KEYWORDS[cat] || []).some(kw => i.toLowerCase().includes(kw))
      )
    );
  }, [profile?.interests]);

  const isMySpecialtiesActive = React.useMemo(() => {
    if (mySpecialtyCategories.length === 0) return false;
    return (
      mySpecialtyCategories.every(c => selectedCategories.has(c)) &&
      selectedCategories.size === mySpecialtyCategories.length
    );
  }, [mySpecialtyCategories, selectedCategories]);

  const fetchOpenCases = React.useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id, title, description, created_at, client_id,
        client:client_id(province),
        triage_assessments(issue_type, triage_input)
      `)
      .is('attorney_id', null)
      .eq('status', 'Pending Triage')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const interests: string[] = Array.isArray(profile.interests) ? (profile.interests as string[]) : [];
      const mapped: OpenCase[] = data.map((row: any) => {
        const assessment = row.triage_assessments?.[0] ?? null;
        const issueType = assessment?.issue_type || null;
        const urgency = urgencyFromDescription(row.description || '');
        const triageProvince: string | null =
          (assessment?.triage_input as Record<string, unknown> | null)?.province as string | null ?? null;
        const descriptionProvince = parseProvinceFromDescription(row.description || '');
        const clientProvince: string | null = row.client?.province ?? null;
        const resolvedProvince = triageProvince || descriptionProvince || clientProvince;

        return {
          id: row.id,
          title: row.title,
          description: row.description || '',
          created_at: row.created_at,
          issue_type: issueType,
          urgency,
          client_province: resolvedProvince,
          client_id: row.client_id || null,
          matchScore: computeMatchScore(interests, issueType),
        };
      });
      mapped.sort((a, b) => b.matchScore - a.matchScore || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCases(mapped);
    }
    setIsLoading(false);
  }, [profile?.id, profile?.interests]);

  React.useEffect(() => {
    if (!profile?.id) return;
    fetchOpenCases();
  }, [fetchOpenCases]);

  React.useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('probono-hub-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, fetchOpenCases)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOpenCases, profile?.id]);

  const handleAccept = async (caseId: string) => {
    if (!profile?.id) return;
    setAcceptingId(caseId);
    const { data: claimed, error } = await supabase
      .from('cases')
      .update({ attorney_id: profile.id, status: 'In Progress' })
      .eq('id', caseId)
      .eq('status', 'Pending Triage')
      .is('attorney_id', null)
      .select('id');
    if (!error && claimed && claimed.length > 0) {
      const accepted = cases.find(c => c.id === caseId);
      if (accepted?.client_id) {
        await createCaseThread(supabase, caseId, accepted.title, accepted.client_id, profile.id);
        const attyName = profile.first_name
          ? `Atty. ${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`.trim()
          : `Atty. ${(profile as any).email?.split('@')[0] ?? 'Unknown'}`;
        await supabase.from('notifications').insert({
          user_id: accepted.client_id,
          title: 'Attorney Accepted Your Case',
          body: `${attyName} has accepted your case "${accepted.title}". You can now message each other through the platform.`,
          link: '/public/messages',
        });
      }
      auditService.log('Case Accepted', `Accepted pro bono case: "${accepted?.title ?? caseId}"`);
      setAcceptedIds(prev => new Set([...prev, caseId]));
      setCases(prev => prev.filter(c => c.id !== caseId));
      navigate('/legal/cases');
    } else if (!error) {
      // Case was already claimed by another attorney — remove from local list
      setCases(prev => prev.filter(c => c.id !== caseId));
      alert('This case was already assigned to another attorney. It has been removed from the list.');
    }
    setAcceptingId(null);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleMySpecialties = () => {
    if (isMySpecialtiesActive) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(mySpecialtyCategories));
    }
  };

  /** Per-category case counts (unfiltered — so chips always show real numbers) */
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = cases.filter(c => c.issue_type === cat).length;
    }
    return counts;
  }, [cases]);

  const filtered = cases.filter(c => {
    const matchesSearch =
      !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategories.size === 0 ||
      (c.issue_type !== null && selectedCategories.has(c.issue_type));
    return matchesSearch && matchesCategory;
  });

  const hasActiveFilters = !!searchTerm || selectedCategories.size > 0;

  return (
    <div className={styles.dashboard}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1 className={styles.title}>Pro-Bono Matchmaking Hub</h1>
          <p className={styles.subtitle}>
            Open cases from the Smart Legal Triage system. Cases matching your specialties are ranked first.
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBar} style={{ width: '280px' }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search cases..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Category filter chip bar ────────────────────────────────────── */}
      <div className={styles.filterChipBar}>
        <SlidersHorizontal size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />

        {/* My Specialties shortcut */}
        {mySpecialtyCategories.length > 0 && (
          <>
            <button
              className={`${styles.mySpecialtiesBtn} ${isMySpecialtiesActive ? styles.mySpecialtiesBtnActive : ''}`}
              onClick={toggleMySpecialties}
              title={`Show only: ${mySpecialtyCategories.join(', ')}`}
            >
              <Star size={12} fill={isMySpecialtiesActive ? 'currentColor' : 'none'} />
              My Specialties
            </button>
            <span className={styles.filterChipDivider} />
          </>
        )}

        {/* Per-category chips */}
        {ALL_CATEGORIES.map(cat => {
          const isActive = selectedCategories.has(cat);
          const isSpecialty = mySpecialtyCategories.includes(cat);
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''} ${isSpecialty && !isActive ? styles.filterChipSpecialty : ''}`}
              onClick={() => toggleCategory(cat)}
              disabled={count === 0}
              title={cat}
            >
              {isSpecialty && (
                <Star size={10} fill={isActive ? 'currentColor' : 'none'} style={{ flexShrink: 0 }} />
              )}
              {CATEGORY_CHIP_LABEL[cat] ?? cat}
              {count > 0 && (
                <span className={`${styles.chipCount} ${isActive ? styles.chipCountActive : ''}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            className={styles.clearFiltersBtn}
            onClick={() => { setSearchTerm(''); setSelectedCategories(new Set()); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Results summary line ───────────────────────────────────────── */}
      {!isLoading && (
        <p className={styles.filterSummary}>
          {filtered.length === cases.length
            ? `${cases.length} open case${cases.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${cases.length} case${cases.length !== 1 ? 's' : ''} shown`}
          {selectedCategories.size > 0 &&
            ` · ${selectedCategories.size} categor${selectedCategories.size > 1 ? 'ies' : 'y'} selected`}
        </p>
      )}

      {/* ── Case grid ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <Skeleton style={{ height: 20, width: '70%', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 12 }}>
                <Skeleton style={{ height: 18, width: 80, borderRadius: 9 }} />
                <Skeleton style={{ height: 18, width: 100, borderRadius: 9 }} />
              </div>
              <Skeleton style={{ height: 14, width: '95%', borderRadius: 4, marginBottom: 6 }} />
              <Skeleton style={{ height: 14, width: '80%', borderRadius: 4, marginBottom: 16 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <Skeleton style={{ height: 12, width: 90, borderRadius: 4 }} />
                <Skeleton style={{ height: 32, width: 90, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '3rem' }}>
          {cases.length === 0
            ? 'Walang bukas na kaso sa ngayon. Bumalik ka mamaya.'
            : 'No cases match your current filters.'}
          {cases.length > 0 && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategories(new Set()); }}
              className={styles.emptyAction}
            >
              View all open cases
            </button>
          )}
        </div>
      ) : (
        <div className={styles.gridCards} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {filtered.map((opp) => {
            const isAccepting = acceptingId === opp.id;
            const isAccepted = acceptedIds.has(opp.id);
            const isSpecialtyMatch = opp.matchScore >= 90;

            return (
              <div
                key={opp.id}
                className={`${styles.card} ${styles.opportunityCard}`}
                style={{ outline: isSpecialtyMatch ? '2px solid var(--color-primary)' : 'none' }}
              >
                <div className={styles.opportunityBody}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className={`${styles.badge} ${styles.badgeOrange}`}>
                      {opp.issue_type || 'General'}
                    </span>
                    <div className={`${styles.badge} ${styles.badgeBlue}`}>
                      <Star size={13} fill="var(--color-primary)" /> {opp.matchScore}% Match
                    </div>
                  </div>

                  {isSpecialtyMatch && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                      ★ Matches your specialty
                    </div>
                  )}

                  <h3 className={styles.opportunityTitle}>{opp.title}</h3>

                  <div className={styles.opportunityMeta}>
                    {opp.client_province && (
                      <span className={styles.opportunityLine}>
                        <MapPin size={14} /> {opp.client_province}
                      </span>
                    )}
                    <span
                      className={styles.opportunityLine}
                      style={{ color: URGENCY_COLOR[opp.urgency || 'low'], textTransform: 'capitalize' }}
                    >
                      <Scale size={14} /> {opp.urgency || 'Low'} Urgency
                    </span>
                  </div>

                  <p className={styles.opportunityDescription}>
                    {opp.description.split('\n')[0]}
                  </p>

                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Filed {new Date(opp.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className={styles.opportunityFooter}>
                  {isAccepted ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
                      <CheckCircle size={16} /> Accepted — check My Cases
                    </div>
                  ) : (
                    <button
                      className={styles.primaryButton}
                      style={{ flex: 1 }}
                      disabled={isAccepting}
                      onClick={() => setConfirmAcceptId(opp.id)}
                    >
                      Accept Case
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAcceptId}
        title="Accept Pro-Bono Case"
        message={`Take on "${cases.find(c => c.id === confirmAcceptId)?.title}"? It will be assigned to you and removed from the hub.`}
        confirmLabel="Accept"
        onConfirm={() => { const id = confirmAcceptId!; setConfirmAcceptId(null); handleAccept(id); }}
        onCancel={() => setConfirmAcceptId(null)}
        isLoading={acceptingId === confirmAcceptId}
      />
    </div>
  );
};

export default ProBonoHub;
