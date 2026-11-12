const pad = (n: number): string => String(n).padStart(2, '0');

// ISO string (UTC) -> value for <input type="datetime-local">, in LOCAL time
export function toLocalInputValue(value: string | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// "2026-12-10T17:00" (local time) -> ISO string in UTC, or null if invalid
export function fromLocalInputValue(value: string): string | null {
  if (!value) {
    return null;
  }

  // A date-time without an offset is parsed as local time
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device time zone';
  } catch {
    return 'your device time zone';
  }
}