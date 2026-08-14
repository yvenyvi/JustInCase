import { Scale } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './MaintenancePage.module.css';

export default function MaintenancePage() {
  const { signOut } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <div className={styles.ring} />
          <div className={styles.ringOuter} />
          <div className={styles.iconBox}>
            <Scale size={36} strokeWidth={1.5} />
          </div>
        </div>

        <div className={styles.badge}>Under Maintenance</div>

        <h1 className={styles.title}>System Under Maintenance</h1>
        <p className={styles.message}>
          We're performing scheduled maintenance to improve your experience.
          <br />
          We'll be back up shortly — thank you for your patience.
        </p>

        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>

        <button className={styles.signOutBtn} onClick={signOut}>
          Sign Out
        </button>
      </div>

      <p className={styles.footer}>LAYA &mdash; Connecting Filipinos to Justice</p>
    </div>
  );
}
