export function parseEmails(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function uniqueEmails(value?: string | null): string[] {
  return Array.from(new Set(parseEmails(value).map((e) => e.toLowerCase())));
}