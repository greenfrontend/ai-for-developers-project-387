import type { EventType, Slot } from '../api/generated/types.gen.js';
import { addMinutes, addUtcDays, atUtcTime, parseDateTime, startOfUtcDay, toIsoString } from './time.js';

const DEFAULT_TIME_ZONE = 'UTC';
const WORKDAY_START_HOUR_UTC = 9;
const WORKDAY_END_HOUR_UTC = 17;
const YEAR_MONTH_PATTERN = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])$/;

export type SlotWindow = {
  endExclusive: Date;
  month: string;
  startInclusive: Date;
  timeZone: string;
};

type YearMonth = {
  month: number;
  year: number;
};

export function getSlotWindow(params: {
  month?: string;
  now: Date;
  timeZone?: string;
}): SlotWindow | undefined {
  const timeZone = params.timeZone?.trim() || DEFAULT_TIME_ZONE;

  if (!isValidTimeZone(timeZone)) {
    return undefined;
  }

  const currentMonth = getYearMonthInTimeZone(params.now, timeZone);
  const requestedMonth = params.month ? parseYearMonth(params.month) : currentMonth;

  if (!requestedMonth || compareYearMonths(requestedMonth, currentMonth) < 0) {
    return undefined;
  }

  const monthStart = new Date(Date.UTC(requestedMonth.year, requestedMonth.month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(requestedMonth.year, requestedMonth.month, 1));

  return {
    month: formatYearMonth(requestedMonth),
    timeZone,
    startInclusive: addUtcDays(monthStart, -2),
    endExclusive: addUtcDays(nextMonthStart, 2),
  };
}

export function normalizeSlotStart(value: string): string | undefined {
  const date = parseDateTime(value);

  return date ? toIsoString(date) : undefined;
}

export function generateSlots(params: {
  bookedStartsAt: Iterable<string>;
  endExclusive: Date;
  eventType: EventType;
  month?: string;
  now: Date;
  startInclusive: Date;
  timeZone?: string;
}): Slot[] {
  const { bookedStartsAt, endExclusive, eventType, month, now, startInclusive, timeZone } = params;
  const booked = new Set(Array.from(bookedStartsAt, (startsAt) => normalizeSlotStart(startsAt)));
  const slots: Slot[] = [];

  for (
    let day = startOfUtcDay(startInclusive);
    day.getTime() < endExclusive.getTime();
    day = addUtcDays(day, 1)
  ) {
    const workdayEnd = atUtcTime(day, WORKDAY_END_HOUR_UTC);

    for (
      let startsAt = atUtcTime(day, WORKDAY_START_HOUR_UTC);
      addMinutes(startsAt, eventType.durationMinutes).getTime() <= workdayEnd.getTime();
      startsAt = addMinutes(startsAt, eventType.durationMinutes)
    ) {
      const endsAt = addMinutes(startsAt, eventType.durationMinutes);
      const startsAtIso = toIsoString(startsAt);

      if (
        startsAt.getTime() <= now.getTime() ||
        booked.has(startsAtIso) ||
        (timeZone && month && !isInYearMonth(startsAt, { month }, timeZone))
      ) {
        continue;
      }

      slots.push({
        startsAt: startsAtIso,
        endsAt: toIsoString(endsAt),
      });
    }
  }

  return slots;
}

export function isValidOfferedSlotStart(params: {
  eventType: EventType;
  now: Date;
  startsAt: string;
}): boolean {
  const normalizedStartsAt = normalizeSlotStart(params.startsAt);

  if (!normalizedStartsAt) {
    return false;
  }

  const startsAt = new Date(normalizedStartsAt);
  const startsAtTime = startsAt.getTime();

  if (startsAtTime <= params.now.getTime()) {
    return false;
  }

  const day = startOfUtcDay(startsAt);
  const workdayStart = atUtcTime(day, WORKDAY_START_HOUR_UTC);
  const workdayEnd = atUtcTime(day, WORKDAY_END_HOUR_UTC);
  const endsAt = addMinutes(startsAt, params.eventType.durationMinutes);
  const offsetMinutes = (startsAtTime - workdayStart.getTime()) / 60_000;

  return (
    startsAtTime >= workdayStart.getTime() &&
    endsAt.getTime() <= workdayEnd.getTime() &&
    Number.isInteger(offsetMinutes) &&
    offsetMinutes % params.eventType.durationMinutes === 0
  );
}

function isInYearMonth(date: Date, window: Pick<SlotWindow, 'month'>, timeZone: string): boolean {
  return formatYearMonth(getYearMonthInTimeZone(date, timeZone)) === window.month;
}

function parseYearMonth(value: string): YearMonth | undefined {
  const match = YEAR_MONTH_PATTERN.exec(value);

  if (!match) {
    return undefined;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function formatYearMonth(value: YearMonth): string {
  return `${value.year.toString().padStart(4, '0')}-${value.month.toString().padStart(2, '0')}`;
}

function compareYearMonths(left: YearMonth, right: YearMonth): number {
  return left.year - right.year || left.month - right.month;
}

function getYearMonthInTimeZone(date: Date, timeZone: string): YearMonth {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  return {
    year: Number(year),
    month: Number(month),
  };
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}
