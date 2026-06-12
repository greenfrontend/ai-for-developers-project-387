export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value: string, timeZone?: string) {
  const date = parseDateValue(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeZone,
  }).format(date);
}

export function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number);

  if (!year || !month) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

export function formatTimeRange(start: string, end: string, timeZone?: string) {
  const startsAt = new Date(start);
  const endsAt = new Date(end);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return `${start} - ${end}`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });

  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

export function getDateKey(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : value.slice(0, 10);
}

export function getCurrentMonthKey(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

export function addMonths(monthKey: string, months: number) {
  const [year, month] = monthKey.split('-').map(Number);

  if (!year || !month) {
    return monthKey;
  }

  const date = new Date(year, month - 1 + months, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function parseDateValue(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
