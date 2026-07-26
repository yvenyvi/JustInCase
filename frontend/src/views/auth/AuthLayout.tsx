import { ReactNode } from 'react';
import styles from './auth.module.css';

interface AuthLayoutProps {
  children: ReactNode;
  visualImage?: string;
  quote?: string;
  author?: string;
}

const AuthLayout = ({ 
  children, 
  visualImage = '/auth_bg.jpg', 
  quote = "In a government of laws, existence of the government will be imperilled if it fails to observe the law scrupulously.",
  author = "Justice Louis D. Brandeis"
}: AuthLayoutProps) => {
  return (
    <div className={styles.authContainer}>
      {/* Visual Side */}
      <div className={styles.visualSide}>
        <div 
          className={styles.visualBg} 
          style={{ backgroundImage: `url(${visualImage})` }}
        />
        <div className={styles.visualOverlay} />
        
        <div className={styles.brandContent}>
          <div className={styles.logo}>
            <img src="/logo.svg" alt="JusticeLink Logo" style={{ width: '40px', height: '40px' }} />
            <span className={styles.logoText}>JusticeLink - PH</span>
          </div>
        </div>

        <div className={styles.visualFooter}>
          <p className={styles.quote}>"{quote}"</p>
          <p className={styles.author}>{author}</p>
        </div>
      </div>

      {/* Form Side */}
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
