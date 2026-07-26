import { supabase } from '../lib/supabase';

export interface RightsCategory {
  id: string;
  title: string;
  subtitle: string | null;
  icon_name: string;
  law_reference: string | null;
  source_url?: string | null;
  reference_url?: string | null;
  url?: string | null;
  link?: string | null;
  description: string | null;
  display_order: number;
}

export interface RightsArticle {
  id: string;
  category_id: string;
  title: string;
  detail: string | null;
  law_section: string | null;
  source_url?: string | null;
  reference_url?: string | null;
  article_url?: string | null;
  url?: string | null;
  link?: string | null;
}

export const rightsService = {
  async getCategories(): Promise<RightsCategory[]> {
    const { data, error } = await supabase
      .from('rights_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getArticlesByCategory(categoryId: string): Promise<RightsArticle[]> {
    const { data, error } = await supabase
      .from('rights_articles')
      .select('*')
      .eq('category_id', categoryId);
    if (error) throw error;
    return data || [];
  },

  async getAllArticles(): Promise<RightsArticle[]> {
    const { data, error } = await supabase
      .from('rights_articles')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  async searchArticles(query: string): Promise<(RightsArticle & { category?: RightsCategory })[]> {
    // Strip characters that break PostgREST .or() filter syntax (commas, parens, percent signs, backslashes)
    const safeQuery = query.replace(/[%,()\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!safeQuery) return [];
    const { data, error } = await supabase
      .from('rights_articles')
      .select('*, rights_categories(*)')
      .or(`title.ilike.%${safeQuery}%,detail.ilike.%${safeQuery}%,law_section.ilike.%${safeQuery}%`);
    if (error) throw error;
    return data || [];
  },
};
