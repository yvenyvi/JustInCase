import { supabase } from '../lib/supabase';

export type LegalDataset = 'jurisprudence' | 'republic-acts';

export interface LegalSource {
  dataset: LegalDataset;
  id: string;
  title: string;
  citation?: string | null;
  date?: string | null;
  year?: number | null;
  summary?: string | null;
  url: string;
  source_url?: string | null;
  pdf_url?: string | null;
}

const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function searchLegalSources(query: string, datasets: LegalDataset[], limit = 8) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to search the Legal Library.');
  const response = await fetch(`${apiBaseUrl}/api/legal-research/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, datasets, limit }),
  });
  if (!response.ok) throw new Error('Legal research is temporarily unavailable.');
  return response.json() as Promise<{ sources: LegalSource[]; unavailable: string[]; query: string }>;
}
