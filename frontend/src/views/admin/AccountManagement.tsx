import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../../components/ConfirmModal';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  MoreVertical,
  Edit2,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Eye,
  Activity,
  X,
  User as UserIcon,
  Loader2,
  Trash2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { auditService } from '../../services/auditService';
import styles from './AccountManagement.module.css';
import Skeleton from '../../components/Skeleton';
import LocationSelector from '../../components/shared/LocationSelector';

interface UserAccount {
  id: string;
  full_name: string;
  email: string;
  role: 'Super Administrator' | 'Volunteer Attorney' | 'Citizen';
  status: string;
  status_verification: string;
  created_at: string;
  updated_at: string;
  phone_number: string | null;
  region: string | null;
  province: string | null;
  city_municipality: string | null;
  barangay: string | null;
  ibp_number: string | null;
  roll_number: string | null;
  is_didit_verified: boolean;
}

interface Stats {
  total: number;
  verifiedLawyers: number;
  activeRate: number;
  suspended: number;
}

type ModalMode = 'view' | 'edit' | 'delete' | 'add' | null;

const ROLE_DISPLAY: Record<string, string> = {
  'Super Administrator': 'Admin',
  'Volunteer Attorney': 'Legal',
  'Citizen': 'Public',
};

const ROLE_COLOR: Record<string, string> = {
  'Super Administrator': '#7E22CE',
  'Volunteer Attorney': '#0369A1',
  'Citizen': '#64748B',
};

const VERIFICATION_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  verified:   { label: 'Verified',   color: '#16A34A', bg: '#DCFCE7' },
  unverified: { label: 'Unverified', color: '#D97706', bg: '#FEF3C7' },
  rejected:   { label: 'Suspended',  color: '#DC2626', bg: '#FEE2E2' },
};

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
    <div style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{value || '—'}</div>
  </div>
);

const AccountManagement = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, verifiedLawyers: 0, activeRate: 0, suspended: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add user form
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'Citizen', location: { region: '', province: '', city: '', barangay: '' } });

  // Edit form (only editable fields)
  const [editForm, setEditForm] = useState({ role: '' as UserAccount['role'], status_verification: '' });

  // Suspend confirmation
  const [confirmSuspend, setConfirmSuspend] = useState<UserAccount | null>(null);

  // More dropdown
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, status_verification, created_at, updated_at, phone_number, region, province, city_municipality, barangay, ibp_number, roll_number, is_didit_verified')
      .order('created_at', { ascending: false });

    if (error) { console.error('Failed to load users:', error); setIsLoading(false); return; }

    const mapped: UserAccount[] = (data ?? []).map((u: any) => ({
      id: u.id,
      full_name: [u.first_name, u.last_name].filter(Boolean).join(' '),
      email: u.email ?? '',
      role: u.role,
      status: u.status,
      status_verification: u.status_verification,
      created_at: u.created_at,
      updated_at: u.updated_at,
      phone_number: u.phone_number,
      region: u.region,
      province: u.province,
      city_municipality: u.city_municipality,
      barangay: u.barangay,
      ibp_number: u.ibp_number,
      roll_number: u.roll_number,
      is_didit_verified: u.is_didit_verified,
    }));

    setUsers(mapped);
    const total = mapped.length;
    const verifiedLawyers = mapped.filter(u => u.role === 'Volunteer Attorney' && u.status_verification === 'verified').length;
    const active = mapped.filter(u => u.status === 'online').length;
    const suspended = mapped.filter(u => u.status_verification === 'rejected').length;
    setStats({ total, verifiedLawyers, activeRate: total > 0 ? Math.round((active / total) * 100) : 0, suspended });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [loadUsers]);

  useEffect(() => {
    const scrollEl = document.querySelector('main') as HTMLElement | null;
    if (modalMode !== null) {
      if (scrollEl) scrollEl.style.overflow = 'hidden';
    } else {
      if (scrollEl) scrollEl.style.overflow = '';
    }
    return () => { if (scrollEl) scrollEl.style.overflow = ''; };
  }, [modalMode]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-accounts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadUsers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUsers]);

  const openModal = (mode: ModalMode, user?: UserAccount) => {
    setSelectedUser(user ?? null);
    if (mode === 'edit' && user) setEditForm({ role: user.role, status_verification: user.status_verification });
    setModalMode(mode);
    setOpenMenuId(null);
  };

  const closeModal = () => { setModalMode(null); setSelectedUser(null); setIsSaving(false); };

  const updateUserInState = (id: string, changes: Partial<UserAccount>) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...changes } : u);
      const total = next.length;
      const verifiedLawyers = next.filter(u => u.role === 'Volunteer Attorney' && u.status_verification === 'verified').length;
      const active = next.filter(u => u.status === 'online').length;
      const suspended = next.filter(u => u.status_verification === 'rejected').length;
      setStats({ total, verifiedLawyers, activeRate: total > 0 ? Math.round((active / total) * 100) : 0, suspended });
      return next;
    });
  };

  const removeUserFromState = (id: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      const total = next.length;
      const verifiedLawyers = next.filter(u => u.role === 'Volunteer Attorney' && u.status_verification === 'verified').length;
      const active = next.filter(u => u.status === 'online').length;
      const suspended = next.filter(u => u.status_verification === 'rejected').length;
      setStats({ total, verifiedLawyers, activeRate: total > 0 ? Math.round((active / total) * 100) : 0, suspended });
      return next;
    });
  };

  // ── Edit user ──
  const handleEditSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ role: editForm.role, status_verification: editForm.status_verification, updated_at: new Date().toISOString() })
      .eq('id', selectedUser.id);

    if (error) { console.error(error); setIsSaving(false); return; }
    auditService.log('Profile Updated', `Admin updated user ${selectedUser.full_name}: role=${editForm.role}, verification=${editForm.status_verification}`);
    if (editForm.status_verification !== selectedUser.status_verification) {
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        title: editForm.status_verification === 'verified' ? 'Account Verified' : 'Account Status Updated',
        body: editForm.status_verification === 'verified'
          ? 'Your account has been verified by an administrator.'
          : `Your account verification status was updated to "${editForm.status_verification}" by an administrator.`,
        link: null,
      });
    }
    updateUserInState(selectedUser.id, { role: editForm.role, status_verification: editForm.status_verification });
    closeModal();
  };

  // ── Suspend / Unsuspend ──
  const handleToggleSuspend = async (user: UserAccount) => {
    const newStatus = user.status_verification === 'rejected' ? 'unverified' : 'rejected';
    const { error } = await supabase
      .from('users')
      .update({ status_verification: newStatus, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) { console.error(error); return; }
    const isSuspending = newStatus === 'rejected';
    auditService.log(isSuspending ? 'Account Suspended' : 'Account Unsuspended', `Admin ${isSuspending ? 'suspended' : 'unsuspended'} user ${user.full_name} (${user.email})`);
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: isSuspending ? 'Account Suspended' : 'Account Reinstated',
      body: isSuspending
        ? 'Your account has been suspended by an administrator. Contact support for assistance.'
        : 'Your account has been reinstated by an administrator. You may now log in.',
      link: null,
    });
    updateUserInState(user.id, { status_verification: newStatus });
    setOpenMenuId(null);
  };

  // ── Delete user ──
  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
    if (error) { console.error(error); setIsSaving(false); return; }
    auditService.log('Account Deleted', `Admin deleted user account: ${selectedUser.full_name} (${selectedUser.email})`);
    removeUserFromState(selectedUser.id);
    closeModal();
  };

  // ── Add user ──
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name) return;
    setIsSaving(true);
    const [first_name, ...rest] = newUser.full_name.trim().split(' ');
    const last_name = rest.join(' ') || '—';
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('users').insert({
      email: newUser.email, first_name, last_name,
      handle: `user_${Date.now()}`,
      role: newUser.role,
      region: newUser.location.region, province: newUser.location.province,
      city_municipality: newUser.location.city, barangay: newUser.location.barangay,
    }).select('id, email, first_name, last_name, role, status, status_verification, created_at, updated_at, phone_number, region, province, city_municipality, barangay, ibp_number, roll_number, is_didit_verified').single();
    setIsSaving(false);
    if (error) { console.error(error); return; }
    auditService.log('User Created', `Admin created user account: ${newUser.full_name} (${newUser.email}), role=${newUser.role}`);
    const added: UserAccount = {
      id: data.id,
      full_name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      email: data.email ?? '',
      role: data.role, status: data.status, status_verification: data.status_verification,
      created_at: data.created_at ?? now, updated_at: data.updated_at ?? now,
      phone_number: data.phone_number, region: data.region, province: data.province,
      city_municipality: data.city_municipality, barangay: data.barangay,
      ibp_number: data.ibp_number, roll_number: data.roll_number,
      is_didit_verified: data.is_didit_verified,
    };
    setUsers(prev => {
      const next = [added, ...prev];
      setStats(s => ({ ...s, total: next.length }));
      return next;
    });
    closeModal();
    setNewUser({ full_name: '', email: '', role: 'Citizen', location: { region: '', province: '', city: '', barangay: '' } });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || ROLE_DISPLAY[user.role] === filterRole;
    return matchesSearch && matchesRole;
  });

  const vBadge = (v: string) => VERIFICATION_BADGE[v] ?? VERIFICATION_BADGE.unverified;

  return (
    <div className={styles.container} style={{ padding: '0 2rem' }}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Account Management</h1>
          <p className={styles.subtitle}>Manage system users, roles, and access permissions.</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => openModal('add')}>
          <UserPlus size={18} /> Add New User
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { icon: <Users size={24} />, val: stats.total.toLocaleString(), label: 'Total Users', cls: styles.iconBlue },
          { icon: <ShieldCheck size={24} />, val: stats.verifiedLawyers, label: 'Verified Lawyers', cls: styles.iconGreen },
          { icon: <Activity size={24} />, val: `${stats.activeRate}%`, label: 'Online Rate', cls: styles.iconPurple },
          { icon: <UserX size={24} />, val: stats.suspended, label: 'Suspended', cls: styles.iconOrange },
        ].map(({ icon, val, label, cls }) => (
          <div key={label} className={styles.statCard}>
            <div className={`${styles.statIcon} ${cls}`}>{icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{isLoading ? '—' : val}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>All Users</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 'auto' }}>
              <option value="All">All Roles</option>
              <option value="Public">Public User</option>
              <option value="Legal">Legal Professional</option>
              <option value="Admin">System Admin</option>
            </select>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={18} />
              <input type="text" placeholder="Search by name or email..." className={styles.searchInput}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '30%' }}>
                    <Skeleton style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <Skeleton style={{ height: 16, width: '70%', borderRadius: 4, marginBottom: 4 }} />
                      <Skeleton style={{ height: 12, width: '90%', borderRadius: 4 }} />
                    </div>
                  </div>
                  <Skeleton style={{ height: 20, width: 70, borderRadius: 10 }} />
                  <Skeleton style={{ height: 20, width: 90, borderRadius: 10 }} />
                  <Skeleton style={{ height: 14, width: 80, borderRadius: 4 }} />
                  <Skeleton style={{ height: 28, width: 60, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>User</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Verification</th>
                  <th className={styles.th}>Joined</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? filteredUsers.map(user => {
                  const badge = vBadge(user.status_verification);
                  const isSuspended = user.status_verification === 'rejected';
                  return (
                    <tr key={user.id}>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}><UserIcon size={16} /></div>
                          <div>
                            <span className={styles.userName}>{user.full_name || '—'}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontWeight: 600, color: ROLE_COLOR[user.role] ?? '#64748B' }}>
                          {ROLE_DISPLAY[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, color: badge.color, backgroundColor: badge.bg }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={styles.td}>{new Date(user.created_at).toLocaleDateString('en-PH')}</td>
                      <td className={styles.td}>
                        <div className={styles.actions} style={{ position: 'relative' }}>
                          {/* View */}
                          <button className={styles.actionBtn} title="View Details" onClick={() => openModal('view', user)}>
                            <Eye size={16} />
                          </button>
                          {/* Edit */}
                          <button className={styles.actionBtn} title="Edit User" onClick={() => openModal('edit', user)}>
                            <Edit2 size={16} />
                          </button>
                          {/* Suspend / Unsuspend */}
                          <button
                            className={styles.actionBtn}
                            title={isSuspended ? 'Unsuspend User' : 'Suspend User'}
                            style={{ color: isSuspended ? '#16A34A' : '#D97706' }}
                            onClick={() => setConfirmSuspend(user)}
                          >
                            {isSuspended ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          {/* More */}
                          <div style={{ position: 'relative' }} ref={openMenuId === user.id ? menuRef : null}>
                            <button className={styles.actionBtn} title="More" onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}>
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === user.id && (
                              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 50, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden' }}>
                                <button
                                  onClick={() => openModal('delete', user)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#DC2626', fontWeight: 500 }}
                                >
                                  <Trash2 size={15} /> Delete Account
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No users found.
                      <button onClick={() => { setSearchTerm(''); setFilterRole('All'); }}
                        style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}>
                        Reset search
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODALS (portal-rendered to escape scrollable layout) ── */}
      {/* ── VIEW DETAILS MODAL ── */}
      {modalMode === 'view' && selectedUser && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>User Details</h3>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0 }}>
                  {selectedUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedUser.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{selectedUser.email}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
                <Field label="Role" value={ROLE_DISPLAY[selectedUser.role] ?? selectedUser.role} />
                <Field label="Verification" value={vBadge(selectedUser.status_verification).label} />
                <Field label="Phone" value={selectedUser.phone_number} />
                <Field label="Identity Verified (Didit)" value={selectedUser.is_didit_verified ? 'Yes' : 'No'} />
                <Field label="Region" value={selectedUser.region} />
                <Field label="Province" value={selectedUser.province} />
                <Field label="City / Municipality" value={selectedUser.city_municipality} />
                <Field label="Barangay" value={selectedUser.barangay} />
                {selectedUser.role === 'Volunteer Attorney' && <>
                  <Field label="IBP Number" value={selectedUser.ibp_number} />
                  <Field label="Roll Number" value={selectedUser.roll_number} />
                </>}
                <Field label="Joined" value={new Date(selectedUser.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <Field label="Last Updated" value={new Date(selectedUser.updated_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>Close</button>
              <button className={styles.primaryBtn} onClick={() => openModal('edit', selectedUser)}>
                <Edit2 size={15} /> Edit User
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── EDIT USER MODAL ── */}
      {modalMode === 'edit' && selectedUser && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit User</h3>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                Editing <strong style={{ color: 'var(--color-text)' }}>{selectedUser.full_name}</strong>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>System Role</label>
                <select className={styles.input} value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserAccount['role'] }))}>
                  <option value="Citizen">Public User (Indigent)</option>
                  <option value="Volunteer Attorney">Legal Professional (Lawyer)</option>
                  <option value="Super Administrator">System Administrator</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Verification Status</label>
                <select className={styles.input} value={editForm.status_verification}
                  onChange={e => setEditForm(f => ({ ...f, status_verification: e.target.value }))}>
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Suspended</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleEditSave} disabled={isSaving}>
                {isSaving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── DELETE CONFIRM MODAL ── */}
      {modalMode === 'delete' && selectedUser && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#DC2626' }}>Delete Account</h3>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '0.875rem', color: '#991B1B', lineHeight: 1.6 }}>
                  This will permanently delete <strong>{selectedUser.full_name}</strong> ({selectedUser.email}) and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button onClick={handleDelete} disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#DC2626', color: 'white', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                {isSaving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                {isSaving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── ADD USER MODAL ── */}
      {modalMode === 'add' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New User</h3>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Juan Dela Cruz"
                  value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input type="email" className={styles.input} placeholder="email@example.com"
                  value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>System Role</label>
                <select className={styles.input} value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="Citizen">Public User (Indigent)</option>
                  <option value="Volunteer Attorney">Legal Professional (Lawyer)</option>
                  <option value="Super Administrator">System Administrator</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <label className={styles.label} style={{ marginBottom: '1rem', display: 'block' }}>Residential / Office Location</label>
                <LocationSelector onLocationChange={loc => setNewUser({ ...newUser, location: loc })} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleCreateUser}
                disabled={isSaving || !newUser.email || !newUser.full_name}>
                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={16} />}
                {isSaving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
      <ConfirmModal
        isOpen={!!confirmSuspend}
        title={confirmSuspend?.status_verification === 'rejected' ? 'Unsuspend User' : 'Suspend User'}
        message={
          confirmSuspend?.status_verification === 'rejected'
            ? `Restore access for ${confirmSuspend.full_name}? They will be able to log in again.`
            : `Suspend ${confirmSuspend?.full_name}? They will lose access until unsuspended.`
        }
        confirmLabel={confirmSuspend?.status_verification === 'rejected' ? 'Unsuspend' : 'Suspend'}
        variant={confirmSuspend?.status_verification !== 'rejected' ? 'danger' : 'default'}
        onConfirm={() => { const u = confirmSuspend!; setConfirmSuspend(null); handleToggleSuspend(u); }}
        onCancel={() => setConfirmSuspend(null)}
      />
    </div>
  );
};

export default AccountManagement;
