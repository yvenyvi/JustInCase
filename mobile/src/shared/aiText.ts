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

/** Quick replies are answers the user can send, not explanations from the assistant. */
export function userAnswerSuggestions(value: unknown, reply: string): string[] {
  if (!Array.isArray(value) || !reply.includes('?')) return [];
  const assistantVoice = /\b(?:here['’]?s|here is|here are|let me|i can (?:help|explain|provide|summari[sz]e)|i(?:['’]ll| will) (?:help|explain|provide|summari[sz]e)|you (?:should|must|can)|your rights|under (?:the )?(?:labor code|law)|narito|ito ang|maaari kitang|matutulungan kita|ipapaliwanag ko|karapatan mo|karapatan ninyo|dapat (?:mong|ninyong))\b/i;
  return [...new Set(value.filter((item): item is string => typeof item === 'string')
    .map(item => plainAiText(item).trim())
    .filter(item => item.length > 0 && item.length <= 140 && !item.includes('?')
      && item.toLowerCase() !== reply.toLowerCase() && !assistantVoice.test(item)))].slice(0, 4);
}

export function parseDraftResponse(data: { kind?: string; content?: string; response?: string }) {
  const reply = plainAiText(data.response || '');
  const kind = data.kind || (/^DOCUMENT\s*:/i.test(reply) ? 'document' : 'question');
  const content = plainAiText(data.content || reply.replace(/^(DOCUMENT|QUESTION)\s*:\s*/i, ''));
  if (!content) throw new Error('No response was received. Please try again.');
  return { kind, content };
}
