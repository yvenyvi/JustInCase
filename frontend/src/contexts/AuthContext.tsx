import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  phone_number: string | null;
  street_address: string | null;
  region: string | null;
  province: string | null;
  city_municipality: string | null;
  barangay: string | null;
  date_of_birth?: string | null;
  firm_name?: string | null;
  ibp_number?: string | null;
  roll_number?: string | null;
  avatar_url?: string | null;
  id_picture_url?: string | null;
  selfie_url?: string | null;
  role: 'public' | 'legal' | 'admin';
  language: string;
  languages?: string;
  created_at: string;
  updated_at: string;
  last_details_update?: string | null;
  interests: string[];
  is_didit_verified: boolean;
  status_verification: string;
  pro_bono_period_start?: string | null;
  terms_accepted_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  acceptTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitialLoading: true,
  signOut: async () => {},
  updateProfile: async () => ({ error: 'Not implemented' }),
  acceptTerms: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          setIsInitialLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) setIsInitialLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'User:', session?.user?.email);
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          if (session?.user) {
            console.log('Auth state change: User detected, fetching profile in background...');
            fetchProfile(session.user.id);
          } else {
            console.log('Auth state change: No user, resetting profile.');
            setProfile(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('fetchProfile: Starting fetch for:', userId);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('fetchProfile: Error fetching profile:', error);
      } else if (data) {
        console.log('fetchProfile: Successfully fetched profile data:', data.role);
        // Map database roles to application roles
        const roleMap: Record<string, 'public' | 'legal' | 'admin'> = {
          'Citizen': 'public',
          'Volunteer Attorney': 'legal',
          'Super Administrator': 'admin'
        };
        
        const mappedData: Profile = {
          ...data,
          role: roleMap[data.role] || 'public',
          interests: data.interests || [],
          language: data.languages || 'Filipino, English'
        };
        setProfile(mappedData);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const acceptTerms = async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    await supabase.from('users').update({ terms_accepted_at: now }).eq('id', user.id);
    // Update local profile state immediately so the gate dismisses without a refetch
    setProfile(prev => prev ? { ...prev, terms_accepted_at: now } : prev);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { error: 'No user logged in' };
    
    // Don't allow updating internal fields via this function if not needed
    const { created_at, updated_at, id, email, role, ...cleanUpdates } = updates as any;

    const { error } = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('id', user.id);

    if (!error) {
      // Refresh local profile state
      await fetchProfile(user.id);
    }
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isInitialLoading,
    signOut,
    updateProfile,
    acceptTerms,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
