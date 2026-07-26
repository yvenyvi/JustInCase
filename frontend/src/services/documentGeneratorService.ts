export interface DocumentFieldSpec {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  required: boolean;
  placeholder?: string;
}

export interface DocumentTemplate {
  id?: string | null;
  slug: string;
  title: string;
  description: string;
  category: string;
  estimated_minutes: number;
  law_basis: string;
  required_fields: DocumentFieldSpec[];
  optional_fields: DocumentFieldSpec[];
}

export interface GenerateDocumentRequest {
  templateId?: string;
  templateSlug?: string;
  values: Record<string, string>;
}

export interface GeneratedDocumentDraft {
  documentId?: string | null;
  templateTitle: string;
  fileName: string;
  content: string;
  warnings: string[];
  generatedAt: string;
  source: 'database' | 'fallback';
  generationMode?: 'ai' | 'template';
  aiAssisted?: boolean;
}

import { supabase } from '../lib/supabase';

const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function _getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const documentGeneratorService = {
  async getTemplates(): Promise<DocumentTemplate[]> {
    const response = await fetch(`${apiBaseUrl}/api/documents/templates`);
    if (!response.ok) {
      throw new Error('Unable to load document templates.');
    }

    const payload = await response.json();
    return payload.templates || [];
  },

  async generateDraft(request: GenerateDocumentRequest): Promise<GeneratedDocumentDraft> {
    const token = await _getAccessToken();
    if (!token) {
      throw new Error('You must be signed in to generate a document.');
    }

    const response = await fetch(`${apiBaseUrl}/api/documents/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let detail = 'Unable to generate document draft.';
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch {
        // Keep default fallback error detail.
      }
      throw new Error(detail);
    }

    return response.json() as Promise<GeneratedDocumentDraft>;
  },

  async downloadDraft(fileName: string, content: string) {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const marginX = 20;
    const marginTop = 24;
    const marginBottom = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginX * 2;

    // Header bar
    doc.setFillColor(30, 58, 138); // --color-primary deep blue
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('JusticeLink — Generated Legal Draft', marginX, 9.5);

    // Body text
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setLineHeightFactor(1.45);

    const lines = doc.splitTextToSize(content, maxWidth) as string[];
    let y = marginTop + 4; // start below header bar

    lines.forEach((line: string) => {
      if (y + 6 > pageHeight - marginBottom) {
        doc.addPage();
        // Repeat header on new pages
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('JusticeLink — Generated Legal Draft', marginX, 9.5);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        y = marginTop + 4;
      }
      doc.text(line, marginX, y);
      y += 6;
    });

    // Footer on every page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(
        'This document is a draft for reference only. Consult a licensed lawyer before filing.',
        marginX,
        pageHeight - 8,
      );
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }

    const pdfFileName = fileName.replace(/\.txt$/i, '.pdf');
    doc.save(pdfFileName);
  },
};
