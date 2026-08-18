import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import ProtectedRoute from './components/ProtectedRoute';
import { User } from './types';
import { 
  legalNavigation, 
  publicNavigation, 
  adminNavigation 
} from './constants/navigation';

import LandingView from './views/LandingView';
import PublicLayout from './views/public/PublicLayout';
import PublicDashboard from './views/public/PublicDashboard';
import TriageView from './views/public/TriageView';
import RightsLibraryView from './views/public/RightsLibraryView';
import DocumentGeneratorView from './views/public/DocumentGeneratorView';
import PublicProfile from './views/public/PublicProfile';
import PublicAllCases from './views/public/PublicAllCases';
import PublicNotifications from './views/public/PublicNotifications';
import MessagesView from './views/MessagesView';
import MainLayout from './views/MainLayout';

// Legal Views
import Dashboard from './views/legal/Dashboard';
import Cases from './views/legal/Cases';
import ProBonoHub from './views/legal/ProBonoHub';
import ServiceLogs from './views/legal/ServiceLogs';
import Clients from './views/legal/Clients';
import LegalProfile from './views/legal/LegalProfile';
import LegalNotifications from './views/legal/LegalNotifications';

// Auth Views
import Login from './views/auth/Login';
import Register from './views/auth/Register';
import ForgotPassword from './views/auth/ForgotPassword';
import UpdatePassword from './views/auth/UpdatePassword';

// Admin Views
import AccountManagement from './views/admin/AccountManagement';
import AdminDashboard from './views/admin/AdminDashboard';
import AuditLogs from './views/admin/AuditLogs';
import SystemSettings from './views/admin/SystemSettings';
import SupabaseTest from './views/admin/SupabaseTest';
import AttorneyVerifications from './views/admin/AttorneyVerifications';
import CaseManagement from './views/admin/CaseManagement';
import FeedbackAnalytics from './views/admin/FeedbackAnalytics';
import TermsView from './views/TermsView';

import './index.css';
import { useUnreadCounts } from './hooks/useUnreadCounts';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Inject badge counts into a nav section array without mutating the original
function withBadges(
  sections: typeof publicNavigation,
  badges: Record<string, number>,
): typeof publicNavigation {
  return sections.map(sec => ({
    ...sec,
    items: sec.items.map(item =>
      badges[item.id] ? { ...item, badge: badges[item.id] } : item
    ),
  }));
}

// Layout wrappers to inject auth state + unread badges
const PublicLayoutWrapper = () => {
  const { profile } = useAuth();
  const { messages, notifications } = useUnreadCounts(profile?.id);
  const user = {
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.email?.split('@')[0] || 'User',
    role: profile?.role || 'public',
  };
  const navWithBadges = useMemo(
    () => withBadges(publicNavigation, { messages, notifications }),
    [messages, notifications],
  );
  return <PublicLayout user={user} navigationSections={navWithBadges} />;
};

const LegalLayoutWrapper = () => {
  const { profile } = useAuth();
  const { messages, notifications } = useUnreadCounts(profile?.id);
  const user = {
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.email?.split('@')[0] || 'Atty',
    role: profile?.role || 'legal',
  };
  const navWithBadges = useMemo(
    () => withBadges(legalNavigation, { messages, notifications }),
    [messages, notifications],
  );
  return <MainLayout user={user} navigationSections={navWithBadges} activePageTitle="Dashboard" />;
};

const AdminLayoutWrapper = () => {
  const { profile } = useAuth();
  const [pendingAttorneys, setPendingAttorneys] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Volunteer Attorney')
        .eq('status_verification', 'unverified');
      setPendingAttorneys(count ?? 0);
    };
    fetchPending();
    const ch = supabase
      .channel('admin-pending-attorneys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'role=eq.Volunteer Attorney' }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const navWithBadges = useMemo(
    () => withBadges(adminNavigation, { 'attorney-verifications': pendingAttorneys }),
    [pendingAttorneys],
  );

  const user = {
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.email?.split('@')[0] || 'Admin',
    role: profile?.role || 'admin',
  };
  return <MainLayout user={user} navigationSections={navWithBadges} activePageTitle="Admin Portal" />;
};

function App() {
  return (
    <AuthProvider>
      <MaintenanceProvider>
      <BrowserRouter>
        <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingView />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/test-supabase" element={<SupabaseTest />} />

        {/* Public User Portal Routes */}
        <Route element={<ProtectedRoute allowedRoles={['public']} />}>
          <Route path="/public" element={<PublicLayoutWrapper />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PublicDashboard />} />
            <Route path="triage" element={<TriageView />} />
            <Route path="messages" element={<MessagesView role="public" />} />
            <Route path="rights" element={<RightsLibraryView />} />
            <Route path="profile" element={<PublicProfile />} />
            <Route path="cases" element={<PublicAllCases />} />
            <Route path="documents" element={<DocumentGeneratorView />} />
            <Route path="notifications" element={<PublicNotifications />} />
            <Route path="terms" element={<TermsView />} />
          </Route>
        </Route>

        {/* Legal User Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['legal']} />}>
          <Route path="/legal" element={<LegalLayoutWrapper />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="probono" element={<ProBonoHub />} />
            <Route path="service-logs" element={<ServiceLogs />} />
            <Route path="clients" element={<Clients />} />
            <Route path="notifications" element={<LegalNotifications />} />
            <Route path="profile" element={<LegalProfile />} />
            <Route path="messages" element={<MessagesView role="legal" />} />
            <Route path="terms" element={<TermsView />} />
          </Route>
        </Route>

        {/* Admin Portal Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayoutWrapper />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="accounts" element={<AccountManagement />} />
            <Route path="attorney-verifications" element={<AttorneyVerifications />} />
            <Route path="cases" element={<CaseManagement />} />
            <Route path="logs" element={<AuditLogs />} />
            <Route path="feedback" element={<FeedbackAnalytics />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="terms" element={<TermsView />} />
          </Route>
        </Route>
      </Routes>
      </BrowserRouter>
      </MaintenanceProvider>
    </AuthProvider>
  );
}

export default App;
