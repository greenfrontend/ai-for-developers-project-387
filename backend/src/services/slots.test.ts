import { describe, expect, it } from 'vitest';

import type { EventType } from '../api/generated/types.gen.js';
import { generateSlots, getSlotWindow } from './slots.js';

const eventType: EventType = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Intro call',
  description: 'Short introduction',
  durationMinutes: 60,
};

function generateMonthSlots(params: {
  bookedStartsAt?: string[];
  eventType?: EventType;
  month?: string;
  now?: Date;
  timeZone?: string;
} = {}) {
  const now = params.now ?? new Date('2026-06-11T08:30:00.000Z');
  const window = getSlotWindow({
    month: params.month,
    now,
    timeZone: params.timeZone,
  });

  if (!window) {
    throw new Error('Expected a valid slot window');
  }

  return generateSlots({
    bookedStartsAt: params.bookedStartsAt ?? [],
    endExclusive: window.endExclusive,
    eventType: params.eventType ?? eventType,
    month: window.month,
    now,
    startInclusive: window.startInclusive,
    timeZone: window.timeZone,
  });
}

describe('getSlotWindow', () => {
  it('rejects invalid months, invalid time zones, and past months', () => {
    const now = new Date('2026-06-11T08:30:00.000Z');

    expect(getSlotWindow({ month: '2026-13', now, timeZone: 'UTC' })).toBeUndefined();
    expect(getSlotWindow({ month: '2026-06', now, timeZone: 'Not/AZone' })).toBeUndefined();
    expect(getSlotWindow({ month: '2026-05', now, timeZone: 'UTC' })).toBeUndefined();
  });
});

describe('generateSlots', () => {
  it('generates the remaining UTC workday slots for the current month', () => {
    const slots = generateMonthSlots();

    expect(slots).toHaveLength(20 * 8);
    expect(slots[0]).toEqual({
      startsAt: '2026-06-11T09:00:00.000Z',
      endsAt: '2026-06-11T10:00:00.000Z',
    });
    expect(slots.at(-1)).toEqual({
      startsAt: '2026-06-30T16:00:00.000Z',
      endsAt: '2026-06-30T17:00:00.000Z',
    });
  });

  it('generates a future month when requested', () => {
    const slots = generateMonthSlots({ month: '2026-07', timeZone: 'UTC' });

    expect(slots).toHaveLength(31 * 8);
    expect(slots[0]).toEqual({
      startsAt: '2026-07-01T09:00:00.000Z',
      endsAt: '2026-07-01T10:00:00.000Z',
    });
    expect(slots.at(-1)).toEqual({
      startsAt: '2026-07-31T16:00:00.000Z',
      endsAt: '2026-07-31T17:00:00.000Z',
    });
  });

  it('filters slots by the requested local month', () => {
    const slots = generateMonthSlots({
      month: '2026-06',
      now: new Date('2026-05-30T08:00:00.000Z'),
      timeZone: 'Pacific/Kiritimati',
    });

    expect(slots[0]).toEqual({
      startsAt: '2026-05-31T10:00:00.000Z',
      endsAt: '2026-05-31T11:00:00.000Z',
    });
  });

  it('does not include starts in the past for the current day', () => {
    const slots = generateMonthSlots({ now: new Date('2026-06-11T10:15:00.000Z') });

    expect(slots[0]?.startsAt).toBe('2026-06-11T11:00:00.000Z');
    expect(slots.some((slot) => slot.startsAt === '2026-06-11T10:00:00.000Z')).toBe(false);
  });

  it('uses duration as the grid step and does not cross 17:00Z', () => {
    const slots = generateMonthSlots({
      eventType: { ...eventType, durationMinutes: 90 },
      now: new Date('2026-06-11T08:00:00.000Z'),
    });

    expect(slots.slice(0, 5)).toEqual([
      { startsAt: '2026-06-11T09:00:00.000Z', endsAt: '2026-06-11T10:30:00.000Z' },
      { startsAt: '2026-06-11T10:30:00.000Z', endsAt: '2026-06-11T12:00:00.000Z' },
      { startsAt: '2026-06-11T12:00:00.000Z', endsAt: '2026-06-11T13:30:00.000Z' },
      { startsAt: '2026-06-11T13:30:00.000Z', endsAt: '2026-06-11T15:00:00.000Z' },
      { startsAt: '2026-06-11T15:00:00.000Z', endsAt: '2026-06-11T16:30:00.000Z' },
    ]);
    expect(slots.some((slot) => slot.endsAt === '2026-06-11T18:00:00.000Z')).toBe(false);
  });

  it('removes booked start times', () => {
    const slots = generateMonthSlots({
      bookedStartsAt: ['2026-06-11T09:00:00Z'],
      now: new Date('2026-06-11T08:00:00.000Z'),
    });

    expect(slots[0]?.startsAt).toBe('2026-06-11T10:00:00.000Z');
  });

  it('returns no slots when duration cannot fit inside a workday', () => {
    const slots = generateMonthSlots({
      eventType: { ...eventType, durationMinutes: 600 },
      now: new Date('2026-06-11T08:00:00.000Z'),
    });

    expect(slots).toEqual([]);
  });
});
