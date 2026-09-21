import { API_BASE_URL } from './api';
import { mobileSupabase } from './supabase';

export type LegalDataset = 'jurisprudence' | 'republic-acts';

export interface LegalSource {
  dataset: LegalDataset;
  id: string;
  title: string;
  citation?: string | null;
  date?: string | null;
  year?: number | null;
  summary?: string | null;
  score?: number | null;
  url: string;
  source_url?: string | null;
  pdf_url?: string | null;
}

export async function searchLegalSources(query: string, datasets: LegalDataset[], limit = 5) {
  const { data: { session } } = await mobileSupabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to search the Legal Library.');
  const response = await fetch(`${API_BASE_URL}/api/legal-research/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ query, datasets, limit }),
  });
  if (!response.ok) throw new Error('Legal research is temporarily unavailable.');
  return response.json() as Promise<{ jurisprudence: LegalSource[]; republic_acts: LegalSource[]; sources: LegalSource[]; unavailable: string[]; query: string }>;
}
