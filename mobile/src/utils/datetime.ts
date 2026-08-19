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
}
