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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/legal-research/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ query: query.slice(0, 20000), datasets, limit }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (response.status === 400 || response.status === 422) {
        throw new Error('This case could not be prepared for research. Please refresh the case and try again.');
      }
      if (response.status === 429) {
        throw new Error('Legal research is busy right now. Please wait a moment and try again.');
      }
      throw new Error('Juris legal research is temporarily unavailable. Please try again shortly.');
    }
    return response.json() as Promise<{ jurisprudence: LegalSource[]; republic_acts: LegalSource[]; sources: LegalSource[]; unavailable: string[]; query: string }>;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Legal research took too long to respond. Please try again.');
    }
    if (error instanceof Error && error.message !== 'Failed to fetch' && error.message !== 'Network request failed') {
      throw error;
    }
    throw new Error('Could not connect to legal research. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}
