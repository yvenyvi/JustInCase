import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const SupabaseTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Checking...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('_test_').select('*').limit(1);
        
        // Note: Even if '_test_' table doesn't exist, we can check if the client initialized
        if (error && error.code === 'PGRST116') {
           // This means the table doesn't exist but the client talked to the database!
           setStatus('Connected to Supabase (Table not found, which is normal)');
        } else if (error) {
           setStatus(`Error: ${error.message}`);
        } else {
           setStatus('Connection Successful!');
        }
      } catch (err: any) {
        setStatus(`Unexpected error: ${err.message}`);
      }
    };

    checkConnection();
  }, []);

  return (
    <div style={{ padding: '20px', borderRadius: '8px', background: '#f0f4f8', border: '1px solid #d1d9e0', margin: '10px' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1a2b3c' }}>Supabase Connection Test</h3>
      <p style={{ margin: 0, fontWeight: 'bold', color: status.includes('Successful') || status.includes('Connected') ? '#28a745' : '#d73a49' }}>
        Status: {status}
      </p>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        If you see "Error: Supabase credentials missing", please create a <code>.env</code> file.
      </p>
    </div>
  );
};

export default SupabaseTest;
