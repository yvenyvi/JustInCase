import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Loader2, Clock } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';
import styles from './auth.module.css';

const Login = () => {
  const navigate = useNavigate();
  const { user, profile, isInitialLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const isLoggingIn = useRef(false);

  useEffect(() => {
    if (isInitialLoading || !user || !profile || isLoggingIn.current) {
      return;
    }

    const mappedRole = profile.role;

    if (mappedRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (mappedRole === 'legal') {
      navigate('/legal/dashboard', { replace: true });
      return;
    }
    navigate('/public/dashboard', { replace: true });
  }, [isInitialLoading, user, profile, navigate]);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    isLoggingIn.current = true;
    setIsLoading(true);
    setError('');
    setPendingVerification(false);
    
    try {
      console.log('Attempting login for:', loginEmail);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPass,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }

      if (data.user) {
        // Fetch role and verification status from users table
        console.log('Fetching role/status for user ID:', data.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, status_verification')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile role/status:', profileError);
        }

        const roleMap: Record<string, string> = {
          'Citizen': 'public',
          'Volunteer Attorney': 'legal',
          'Super Administrator': 'admin'
        };
        const userRole = roleMap[profile?.role] || 'public';

        // Block legal users who have not yet been approved by an admin
        if (userRole === 'legal' && profile?.status_verification !== 'verified') {
          await supabase.auth.signOut();
          setPendingVerification(true);
          return;
        }

        // If there's a specific page they were trying to access, go there
        const from = (location.state as any)?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
          return;
        }

        // Otherwise route by role
        auditService.log('User Login', `User logged in as ${userRole}`);
        if (userRole === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (userRole === 'legal') {
          navigate('/legal/dashboard', { replace: true });
        } else {
          navigate('/public/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      isLoggingIn.current = false;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    await performLogin(email, password);
  };

  return (
    <AuthLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your JusticeLink account</p>
      </div>

      {pendingVerification && (
        <div style={{ backgroundColor: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.4)', color: '#fcd34d', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Clock size={17} />
            Account Pending Verification
          </div>
          <p style={{ margin: 0, color: 'rgba(253, 230, 138, 0.85)', lineHeight: 1.5 }}>
            Your attorney account has been submitted and is awaiting admin approval. You will be able to log in once your credentials have been reviewed.
          </p>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}



      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">Email Address</label>
          <div className={styles.inputWrapper}>
            <input
              id="email"
              type="text"
              placeholder="e.g. juandelacruz@email.com or admin@justicelink.ph"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Mail className={styles.inputIcon} size={18} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Lock className={styles.inputIcon} size={18} />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className={styles.footerActions}>
            <Link to="/forgot-password" className={styles.forgotPassword}>
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button 
          type="submit" 
          variant="primary" 
          size="lg" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
          <span style={{ marginLeft: isLoading ? '0.5rem' : '0' }}>{isLoading ? 'Signing in...' : 'Sign In'}</span>
        </Button>
      </form>

      <div className={styles.divider}>or</div>

      <div className={styles.switchAuth}>
        Don't have an account? 
        <Link to="/register" className={styles.switchLink}>Create Account</Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
