import { ScrollText } from 'lucide-react';
import TermsContent from '../components/TermsContent';
import styles from './TermsView.module.css';

const TermsView = () => {
  return (
    <div className={styles.container}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.iconWrap}>
          <ScrollText size={22} />
        </div>
        <div>
          <div className={styles.badge}>LEGAL</div>
          <h1 className={styles.title}>Terms and Conditions</h1>
          <p className={styles.subtitle}>
            Review the full terms governing your use of JusticeLink Philippines.
          </p>
        </div>
      </div>

      {/* T&C card */}
      <div className={styles.card}>
        <TermsContent />
      </div>

      <p className={styles.footer}>
        Questions? Reach us at{' '}
        <a href="mailto:justicelink.ph@gmail.com" className={styles.link}>
          justicelink.ph@gmail.com
        </a>
      </p>
    </div>
  );
};

export default TermsView;
