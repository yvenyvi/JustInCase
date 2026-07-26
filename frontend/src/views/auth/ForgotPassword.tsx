import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import styles from './auth.module.css';

const ForgotPassword = () => {
  return (
    <AuthLayout
      visualImage="/auth_bg.jpg"
      quote="The quality of mercy is not strained; It droppeth as the gentle rain from heaven."
      author="William Shakespeare, The Merchant of Venice"
    >
      <div className={styles.header}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>We'll send you instructions to reset your password</p>
      </div>

      <form className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">Email Address</label>
          <div className={styles.inputWrapper}>
            <input
              id="email"
              type="email"
              placeholder="e.g. juandelacruz@email.com"
              className={styles.input}
              required
            />
            <Mail className={styles.inputIcon} size={18} />
          </div>
        </div>

        <Button 
          type="submit" 
          variant="primary" 
          size="lg" 
          className={styles.submitButton}
          icon={Send}
        >
          Send Reset Link
        </Button>
      </form>

      <div className={styles.switchAuth}>
        <Link to="/login" className={styles.switchLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginLeft: 0 }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
