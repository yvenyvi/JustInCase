import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ChevronRight, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Sidebar.module.css';

type NavigationItem = {
  id?: string;
  label: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: number;
};

type NavigationSection = {
  section: string;
  items: NavigationItem[];
};

type User = {
  name: string;
  role: string;
};

type SidebarProps = {
  sections?: NavigationSection[];
  user?: User;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
};

const Sidebar = ({ sections = [], user, className = '', isOpen = false, onClose }: SidebarProps) => {
  const { signOut, profile } = useAuth();
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${className}`}>
      <div className={styles.logoContainer}>
        <img src="/logo.svg" alt="JusticeLink Logo" className={styles.logoIcon} />
        <h1 className={styles.logoText}>JusticeLink - PH</h1>
        {/* Close button — visible only on mobile */}
        <button className={styles.mobileCloseBtn} onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className={styles.nav}>
        {sections.map((group) => (
          <div key={group.section} className={styles.navSection}>
            <h3 className={styles.sectionHeader}>{group.section}</h3>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                  }
                >
                  <div className={styles.iconContainer}>
                    <Icon className={styles.navIcon} size={20} />
                  </div>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className={styles.navBadge}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  <ChevronRight size={14} className={styles.chevron} />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        {user && (
          <div className={styles.userBlock}>
            <div className={`${styles.userAvatar} ${profile?.avatar_url ? styles.userAvatarPhoto : ''}`}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className={styles.userAvatarImg} />
                : <UserIcon size={20} />
              }
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
            <button
              className={styles.logoutBtn}
              aria-label="Sign Out"
              onClick={() => void signOut()}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
        <div className={styles.proBonoBadge}>
          <span className={styles.badgeText}>Pro-Bono Portal</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
