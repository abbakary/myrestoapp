export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowTimestampStr(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

export function nowTimeStr(): string {
  return new Date().toTimeString().substring(0, 5);
}

export function formatTzs(amountInTzs: number): string {
  return `TZS ${Math.round(amountInTzs).toLocaleString()}`;
}

export function slugify(text: string, fallback = 'tenant'): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  );
}
