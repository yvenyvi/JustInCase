import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { mobileSupabase } from './supabase';
import type { Role } from '../navigation/types';

type MobileAuthContextValue = {
  isBootstrapping: boolean;
  role: Role | null;
  session: Session | null;
  user: User | null;
};

const MobileAuthContext = createContext<MobileAuthContextValue>({
  isBootstrapping: true,
  role: null,
  session: null,
  user: null,
});

const roleMap: Record<string, Role> = {
  Citizen: 'public',
  'Volunteer Attorney': 'legal',
  'Super Administrator': 'admin',
};

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const resolveRole = async (userId: string) => {
    const { data, error } = await mobileSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data?.role) {
      setRole('public');
      return;
    }

    setRole(roleMap[data.role] ?? 'public');
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data } = await mobileSupabase.auth.getSession();
        if (!mounted) {
          return;
        }

        const nextSession = data.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await resolveRole(nextSession.user.id);
        } else {
          setRole(null);
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    const { data: authListener } = mobileSupabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await resolveRole(nextSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <MobileAuthContext.Provider value={{ isBootstrapping, role, session, user }}>
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  return useContext(MobileAuthContext);
}