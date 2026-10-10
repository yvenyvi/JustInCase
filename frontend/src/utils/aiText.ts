/** Plain presentation for model replies; keep raw user messages unchanged. */
export function plainAiText(text: string): string {
  return text
    .replace(/^\s*(`{3,}|~{3,})[^\n]*\n?/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*(?:\*\s*){3,}$/gm, '')
    .replace(/^\s*[*-]\s+/gm, '\u2022 ')
    .replace(/(\*{1,3}|_{1,3})(\S[\s\S]*?\S|\S)\1/g, '$2')
    .replace(/`+([^`]+)`+/g, '$1')
    .trim();
}

export function parseDraftResponse(data: { kind?: string; content?: string; response?: string }) {
  const reply = plainAiText(data.response || '');
  const kind = data.kind || (/^DOCUMENT\s*:/i.test(reply) ? 'document' : 'question');
  const content = plainAiText(data.content || reply.replace(/^(DOCUMENT|QUESTION)\s*:\s*/i, ''));
  if (!content) throw new Error('No response was received. Please try again.');
  return { kind, content };
}
