import {
  LayoutDashboard,
  Briefcase,
  HeartHandshake,
  Users,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import KampiFloatingChat from '../components/KampiFloatingChat';
import styles from './MainLayout.module.css';

type User = {
  name: string;
  role: string;
};

type NavigationItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
};

export type NavigationSection = {
  section: string;
  items: NavigationItem[];
};

type MainLayoutProps = {
  user: User;
  navigationSections: NavigationSection[];
  activePageTitle: string;
};

const MainLayout = ({ user, navigationSections, activePageTitle }: MainLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Find dynamic title from navigation if possible
  const activeItem = navigationSections
    .flatMap(section => section.items)
    .find(item => location.pathname === item.path || (item.path !== '/legal' && item.path !== '/admin' && location.pathname.startsWith(item.path)));

  const displayTitle = activeItem ? activeItem.label : activePageTitle;
  const isMessagesPage = location.pathname.includes('/messages');

  return (
    <div className={styles.layout}>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        user={user}
        sections={navigationSections}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.contentWrapper}>
        <Header
          user={user}
          pageTitle={displayTitle}
          className={styles.header}
          showBrand={false}
          profileLink={location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/legal/profile'}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />
        <main className={`${styles.mainContent} ${isMessagesPage ? styles.fullBleed : ''}`}>
          <div className="animate-enter">
            <Outlet />
          </div>
        </main>
      </div>
      {!isMessagesPage && <KampiFloatingChat />}
    </div>
  );
};

export default MainLayout;
