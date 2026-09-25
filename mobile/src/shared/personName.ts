export function cleanNamePart(value?: string | null): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

export function formatPersonName(...parts: Array<string | null | undefined>): string {
  return parts.map(cleanNamePart).filter(Boolean).join(' ');
}
