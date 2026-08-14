import React, { createContext, useContext, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const [showPendingModal, setShowPendingModal] = useState(false);

  const resolveRole = async (userId: string) => {
    const { data, error } = await mobileSupabase
      .from('users')
      .select('role, status_verification')
      .eq('id', userId)
      .single();

    if (error || !data?.role) {
      setRole('public');
      return;
    }

    if (data.status_verification === 'pending' || data.status_verification === 'unverified') {
      await mobileSupabase.auth.signOut();
      setShowPendingModal(true);
      setRole(null);
      setSession(null);
      setUser(null);
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
      
      <Modal
        visible={showPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⏳</Text>
            </View>
            <Text style={styles.modalTitle}>Account Under Review</Text>
            <Text style={styles.modalBody}>
              Your account is currently under review by our administrators. Please allow up to 7 days for verification before you can access the platform.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPendingModal(false)}
            >
              <Text style={styles.modalButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  return useContext(MobileAuthContext);
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});