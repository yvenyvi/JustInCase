import { User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import styles from './Header.module.css';

type HeaderUser = {
  name?: string;
  role?: string;
};

type HeaderProps = {
  user?: HeaderUser;
  pageTitle?: string;
  className?: string;
  showBrand?: boolean;
  profileLink?: string;
  onMenuToggle?: () => void;
};

/** Returns up to 2 uppercase initials from a display name. */
const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

const Header = ({
  user = {},
  pageTitle = 'Dashboard',
  className = '',
  showBrand = true,
  profileLink = '/legal/profile',
  onMenuToggle,
}: HeaderProps) => {
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = getInitials(user.name || '');

  return (
    <header className={`${styles.header} ${className}`}>
      <div className={styles.leftSection}>
        {/* Hamburger — only visible below 1024px */}
        {onMenuToggle && (
          <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Open menu">
            <Menu size={22} />
          </button>
        )}
        {showBrand && (
          <div className={styles.brand}>
            <img src="/logo.png" alt="LAYA" style={{ width: '28px', height: '28px', marginRight: '0.65rem' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)', marginRight: '1.25rem', whiteSpace: 'nowrap' }}>LAYA</span>
          </div>
        )}
        <h2
          className={styles.pageTitle}
          style={showBrand ? { borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '1.5rem' } : {}}
        >
          {pageTitle}
        </h2>
      </div>

      <div className={styles.rightSection}>
        <NotificationBell />

        <Link to={profileLink} className={styles.userProfile} style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name || 'Jane Doe, Esq.'}</span>
            <span className={styles.userRole}>{user.role || 'Volunteer Attorney'}</span>
          </div>
          <div className={`${styles.avatar} ${avatarUrl ? styles.avatarPhoto : ''}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name || 'Profile'} className={styles.avatarImg} />
            ) : initials ? (
              <span className={styles.avatarInitials}>{initials}</span>
            ) : (
              <User size={20} className={styles.avatarIcon} />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
