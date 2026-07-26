import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMaintenance } from '../contexts/MaintenanceContext';
import MaintenancePage from './MaintenancePage';
import TermsAndConditionsGate from './TermsAndConditionsGate';
import { Loader2, Clock, ShieldCheck, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Array<'public' | 'legal' | 'admin'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, profile, isLoading, isInitialLoading, signOut } = useAuth();
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } = useMaintenance();
  const location = useLocation();

  if (isInitialLoading || isLoading || isMaintenanceLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)', color: 'var(--color-primary)' }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!profile) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)', color: 'var(--color-secondary)', fontFamily: 'var(--font-family-base)' }}>
          <h2 style={{ marginBottom: '10px' }}>Profile Setup Incomplete</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Your account exists, but your profile details are missing. Please sign out and register again.</p>
        </div>
      );
    }

    if (!allowedRoles.includes(profile.role)) {
      if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
      if (profile.role === 'legal') return <Navigate to="/legal/dashboard" replace />;
      return <Navigate to="/public/dashboard" replace />;
    }

    // Attorneys must be approved before accessing the legal dashboard
    if (profile.role === 'legal' && profile.status_verification !== 'verified') {
      const isRejected = profile.status_verification === 'rejected';
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--color-background)', padding: '2rem', textAlign: 'center',
          fontFamily: 'var(--font-family-base)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '1.5rem',
            background: isRejected ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          }}>
            {isRejected
              ? <ShieldCheck size={34} color="#ef4444" />
              : <Clock size={34} color="#f59e0b" />
            }
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)', margin: '0 0 0.75rem' }}>
            {isRejected ? 'Application Not Approved' : 'Application Under Review'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: 420, lineHeight: 1.7, margin: '0 0 2rem' }}>
            {isRejected
              ? 'Your attorney account application was not approved. Please contact support at justicelink.ph@gmail.com for more information.'
              : 'Your attorney account is pending admin review. You will be notified by email once approved. This usually takes 1–2 business days.'}
          </p>
          <button
            onClick={() => void signOut()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.5rem', border: '1px solid var(--color-border)',
              borderRadius: '10px', background: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)',
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      );
    }

    // Terms and Conditions gate — every user must accept before entering their portal
    if (!profile.terms_accepted_at) {
      return <TermsAndConditionsGate />;
    }

    // Show maintenance page for non-admin users when maintenance mode is active
    if (isMaintenanceMode && profile.role !== 'admin') {
      return <MaintenancePage />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
