import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import styles from './auth.module.css';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // When redirected from email, the access token is in the hash
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    // If there's an access token in the URL hash, Supabase usually handles it automatically
    // and creates a session. We just need to check if we have a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !accessToken) {
        setError("Invalid or expired password reset link. Please request a new one.");
      }
    });
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
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
        <h1 className={styles.title}>Update Password</h1>
        <p className={styles.subtitle}>Please enter your new password below.</p>
      </div>

      {success ? (
        <div className={styles.successMessage} style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Password updated successfully! Redirecting to login...
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage} style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">New Password</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type="password"
                placeholder="Enter new password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Lock className={styles.inputIcon} size={18} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
            <div className={styles.inputWrapper}>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Lock className={styles.inputIcon} size={18} />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className={styles.submitButton}
            icon={Save}
            disabled={isLoading || !!(error && error.includes('Invalid'))}
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      )}

      <div className={styles.switchAuth}>
        <button 
          onClick={() => navigate('/login')} 
          className={styles.switchLink} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginLeft: 0, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back to Login
        </button>
      </div>
    </AuthLayout>
  );
};

export default UpdatePassword;
