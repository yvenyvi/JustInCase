import { ReactNode } from 'react';
import styles from './auth.module.css';
import JusticeIllustration from '../../components/JusticeIllustration';

interface AuthLayoutProps {
  children: ReactNode;
  quote?: string;
  author?: string;
}

const AuthLayout = ({ 
  children, 
  quote = 'Mas malinaw na hakbang tungo sa tulong na kailangan mo.',
  author = 'LAYA • Gabay sa legal na suporta'
}: AuthLayoutProps) => {
  return (
    <div className={styles.authContainer}>
      {/* Visual Side */}
      <div className={styles.visualSide}>
        <div className={styles.visualBg} aria-hidden="true" />
        <div className={styles.visualOverlay} />
        
        <div className={styles.brandContent}>
          <div className={styles.logo}>
            <img src="/logo-mark.png" alt="LAYA bird and justice scales emblem" style={{ width: '46px', height: '40px', objectFit: 'contain' }} />
            <span className={styles.logoText}>LAYA</span>
          </div>
        </div>

        <div className={styles.authArtwork} aria-hidden="true">
          <JusticeIllustration />
        </div>

        <div className={styles.visualFooter}>
          <p className={styles.quote}>"{quote}"</p>
          <p className={styles.author}>{author}</p>
        </div>
      </div>

      {/* Form Side */}
      <main className={styles.formSide}>
        <div className={styles.formContainer}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
