function toDate(iso: string): Date {
  return new Date(iso);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "6:00 PM"
export function formatTime(iso: string): string {
  return toDate(iso).toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

//"Today 6:00PM or 13 Aug 7.40PM"
export function formatDayAndTime(iso: string): string {
  const date = toDate(iso);
  const now = new Date();

  if (isSameDay(date, now)) {
    return `Today, ${formatTime(iso)}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, tomorrow)) {
    return `Tomorrow, ${formatTime(iso)}`;
  }

  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${day}, ${formatTime(iso)}`;
}

// "By 9:00PM"
export function formatDeadline(iso: string): string {
  return `By ${formatTime(iso)}`;
}

//True if ISO string falls in current calendar month
export function isThisMonth(iso: string): boolean {
  const date = toDate(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
/**
 * Date entry and display helpers.
 *
 * There is no date picker in this project: adding one means a new dependency,
 * and the stack is fixed. Donors type dates in a fixed format instead, and
 * these helpers parse, validate and format them consistently.
 *
 * Everything the API receives is an ISO 8601 string. Everything shown to a
 * donor is local time.
 */

export const DATE_TIME_HINT = 'YYYY-MM-DD HH:MM';
export const DATE_HINT = 'YYYY-MM-DD';

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses "2026-08-20 18:30" or "2026-08-20" as LOCAL time.
 *
 * new Date('2026-08-20') would be parsed as UTC midnight, which in Sri Lanka
 * is 5:30am the same day. Building the Date from parts avoids that, so what
 * the donor typed is what they meant.
 */
export function parseLocalDateTime(input: string): Date | null {
  const value = input.trim();
  if (!value) return null;

  const withTime = DATE_TIME_PATTERN.exec(value);
  if (withTime) {
    const [, y, m, d, hh, mm] = withTime;
    return buildDate(+y!, +m!, +d!, +hh!, +mm!);
  }

  const dateOnly = DATE_ONLY_PATTERN.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    // End of day: a "use by 20 August" item is good all through the 20th.
    return buildDate(+y!, +m!, +d!, 23, 59);
  }

  return null;
}

function buildDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): Date | null {
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  // Rejects things like 2026-02-31, which JavaScript would silently roll over.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a Date into the same shape parseLocalDateTime accepts. */
export function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** "20 Aug, 6:30 pm" for display. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const hours24 = date.getHours();
  const suffix = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${date.getDate()} ${months[date.getMonth()]}, ${hours12}:${pad(
    date.getMinutes(),
  )} ${suffix}`;
}

/**
 * "in 3 hours", "in 2 days", "expired".
 *
 * This is what makes urgency legible: a donor reads "in 3 hours" far faster
 * than a timestamp.
 */
export function formatTimeUntil(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'expired';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/** Human label for a listing status. */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
