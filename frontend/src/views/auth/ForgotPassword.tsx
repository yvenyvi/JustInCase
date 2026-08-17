import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import styles from './auth.module.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

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

      {success ? (
        <div className={styles.successMessage} style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Password reset link sent! Please check your email inbox (and spam folder).
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage} style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <div className={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                placeholder="e.g. juandelacruz@email.com"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
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
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      <div className={styles.switchAuth}>
        <Link to="/login" className={styles.switchLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginLeft: 0 }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
