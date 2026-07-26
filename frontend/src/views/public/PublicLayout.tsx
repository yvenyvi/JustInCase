import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header';
import KampiFloatingChat from '../../components/KampiFloatingChat';
import type { NavigationSection } from '../MainLayout';
import styles from './PublicLayout.module.css';

interface PublicLayoutProps {
  user: { name: string; role: string };
  navigationSections: NavigationSection[];
}

const PublicLayout = ({ user, navigationSections }: PublicLayoutProps) => {
  const location = useLocation();
  
  // Find the active navigation item to get the page title
  const activeItem = navigationSections
    .flatMap(section => section.items)
    .find(item => location.pathname === item.path || (item.path !== '/public' && location.pathname.startsWith(item.path)));
  
  const pageTitle = activeItem ? activeItem.label : 'JusticeLink';
  
  // Ensure we check exactly for the messages route
  const isMessagesPage = location.pathname.endsWith('/messages') || location.pathname.includes('/messages/');

  return (
    <div className={styles.container}>
      {/* Desktop Sidebar */}
      <Sidebar 
        user={user} 
        sections={navigationSections} 
        className={styles.sidebar} 
      />

      <div className={styles.mainWrapper}>
        {/* Simplified Top Header for Public Side - Hidden on Messages to maximize space */}
        {!isMessagesPage && (
          <Header 
            user={user} 
            pageTitle={pageTitle} 
            className={styles.header} 
            showBrand={false} 
            profileLink="/public/profile"
          />
        )}

        <main className={`${styles.mainContent} ${isMessagesPage ? styles.fullBleed : ''}`}>
          <div className={styles.contentWrapper}>
            <Outlet />
          </div>
        </main>

        {/* Bottom Navigation for Mobile ONLY */}
        <nav className={styles.bottomNav}>
          {navigationSections.flatMap(s => s.items).filter(i => ['home', 'triage', 'messages', 'guides'].includes(i.id)).map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link 
                key={item.id} 
                to={item.path} 
                className={`${styles.mobileNavItem} ${isActive ? styles.mobileActive : ''}`}
              >
                <div className={styles.mobileIcon}><item.icon size={20} /></div>
                <span className={styles.mobileLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      {!isMessagesPage && <KampiFloatingChat />}
    </div>
  );
};

export default PublicLayout;
