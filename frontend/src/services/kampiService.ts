type KampiRole = 'user' | 'assistant';

export interface KampiHistoryMessage {
  role: KampiRole;
  content: string;
}

export interface KampiRightsContextItem {
  title: string;
  detail?: string | null;
  lawSection?: string | null;
  lawReference?: string | null;
}

export interface KampiChatRequest {
  message: string;
  history?: KampiHistoryMessage[];
  rightsContext?: KampiRightsContextItem[];
}

interface KampiChatResponse {
  reply: string;
}

const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const kampiService = {
  async chat(request: KampiChatRequest): Promise<KampiChatResponse> {
    const response = await fetch(`${apiBaseUrl}/api/kampi/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: request.message,
        history: request.history ?? [],
        rightsContext: request.rightsContext ?? [],
      }),
    });

    if (!response.ok) {
      let detail = 'Kampi is unavailable right now.';
      try {
        const body = await response.json();
        detail = body?.detail || detail;
      } catch {
        // Keep default message when response isn't JSON.
      }
      throw new Error(detail);
    }

    return response.json() as Promise<KampiChatResponse>;
  },
};