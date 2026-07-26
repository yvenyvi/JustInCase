import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  isLoading: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isMaintenanceMode: false,
  isLoading: true,
});

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSetting = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      setIsMaintenanceMode(data?.value === 'true');
      setIsLoading(false);
    };

    fetchSetting();

    // Re-fetch after login so RLS-protected read succeeds with an authenticated session
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          fetchSetting();
        }
      }
    );

    // Real-time: reflect changes the instant an admin saves
    const channel = supabase
      .channel('maintenance_mode_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          const row = payload.new as { key?: string; value?: string } | null;
          if (row?.key === 'maintenance_mode') {
            setIsMaintenanceMode(row.value === 'true');
          }
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, isLoading }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);
