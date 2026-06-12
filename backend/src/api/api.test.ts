import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { InMemoryBookingRepository } from '../repositories/inMemoryBookingRepository.js';

const now = new Date('2026-06-11T08:00:00.000Z');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const introEventTypeId = '00000000-0000-4000-8000-000000000001';
const pairingEventTypeId = '00000000-0000-4000-8000-000000000002';

async function createTestApp(repository = new InMemoryBookingRepository()) {
  return buildApp({
    enableResponseValidation: true,
    frontendDistPath: false,
    now: () => now,
    repository,
  });
}

describe('Booking API', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('rejects malformed request bodies through OpenAPI validation', async () => {
    app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/admin/event-types',
      payload: {
        title: 'Intro',
        description: 'Intro call',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('creates and lists event types with generated UUID ids', async () => {
    app = await createTestApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/admin/event-types',
      payload: {
        title: 'Intro',
        description: 'Intro call',
        durationMinutes: 60,
      },
    });
    const createdEventType = createResponse.json();
    const listResponse = await app.inject({ method: 'GET', url: '/event-types' });

    expect(createResponse.statusCode).toBe(201);
    expect(createdEventType).toMatchObject({
      title: 'Intro',
      description: 'Intro call',
      durationMinutes: 60,
    });
    expect(createdEventType.id).toMatch(uuidPattern);
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([createdEventType]);
  });

  it('reads event types by generated id', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const response = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: introEventTypeId,
      title: 'Intro',
      description: 'Intro call',
      durationMinutes: 60,
    });
  });

  it('returns 404 when reading an unknown event type', async () => {
    app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}` });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: 'EVENT_TYPE_NOT_FOUND',
      message: 'Event type was not found.',
    });
  });

  it('lists slots for the current month by default', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const response = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}/slots` });
    const slots = response.json();

    expect(response.statusCode).toBe(200);
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

  it('lists slots for an explicit future month', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const response = await app.inject({
      method: 'GET',
      url: `/event-types/${introEventTypeId}/slots?month=2026-07&timeZone=UTC`,
    });
    const slots = response.json();

    expect(response.statusCode).toBe(200);
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

  it('returns 400 for invalid slot query values', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const invalidMonthResponse = await app.inject({
      method: 'GET',
      url: `/event-types/${introEventTypeId}/slots?month=2026-13&timeZone=UTC`,
    });
    const invalidTimeZoneResponse = await app.inject({
      method: 'GET',
      url: `/event-types/${introEventTypeId}/slots?month=2026-06&timeZone=Not/AZone`,
    });
    const pastMonthResponse = await app.inject({
      method: 'GET',
      url: `/event-types/${introEventTypeId}/slots?month=2026-05&timeZone=UTC`,
    });

    for (const response of [invalidMonthResponse, invalidTimeZoneResponse, pastMonthResponse]) {
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        code: 'INVALID_SLOT_QUERY',
        message: 'Slot month or time zone query is invalid.',
      });
    }
  });

  it('returns 404 for slots of an unknown event type', async () => {
    app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}/slots` });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: 'EVENT_TYPE_NOT_FOUND',
      message: 'Event type was not found.',
    });
  });

  it('creates a booking for an offered slot and removes the slot', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );
    const slotsResponse = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}/slots` });
    const [slot] = slotsResponse.json();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: {
        eventTypeId: introEventTypeId,
        startsAt: slot.startsAt,
        guestName: 'Ada Lovelace',
        guestEmail: 'ada@example.com',
      },
    });
    const nextSlotsResponse = await app.inject({ method: 'GET', url: `/event-types/${introEventTypeId}/slots` });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      eventTypeId: introEventTypeId,
      eventTypeTitle: 'Intro',
      startsAt: '2026-06-11T09:00:00.000Z',
      endsAt: '2026-06-11T10:00:00.000Z',
      guestName: 'Ada Lovelace',
      guestEmail: 'ada@example.com',
    });
    expect(createResponse.json().id).toMatch(uuidPattern);
    expect(nextSlotsResponse.json().some((nextSlot: { startsAt: string }) => nextSlot.startsAt === slot.startsAt)).toBe(
      false,
    );
  });

  it('creates a booking for a future slot outside the old 14-day window', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: {
        eventTypeId: introEventTypeId,
        startsAt: '2026-07-15T09:00:00.000Z',
        guestName: 'Ada Lovelace',
        guestEmail: 'ada@example.com',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      eventTypeId: introEventTypeId,
      startsAt: '2026-07-15T09:00:00.000Z',
      endsAt: '2026-07-15T10:00:00.000Z',
    });
  });

  it('returns 400 when selected start time is not an offered slot', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
      ]),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: {
        eventTypeId: introEventTypeId,
        startsAt: '2026-06-11T08:00:00.000Z',
        guestName: 'Ada Lovelace',
        guestEmail: 'ada@example.com',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'INVALID_SLOT',
      message: 'Selected start time is not one of the available slots.',
    });
  });

  it('returns 409 when the same start is booked across event types', async () => {
    app = await createTestApp(
      new InMemoryBookingRepository([
        {
          id: introEventTypeId,
          title: 'Intro',
          description: 'Intro call',
          durationMinutes: 60,
        },
        {
          id: pairingEventTypeId,
          title: 'Pairing',
          description: 'Pairing session',
          durationMinutes: 60,
        },
      ]),
    );
    const startsAt = '2026-06-11T09:00:00.000Z';

    await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: {
        eventTypeId: introEventTypeId,
        startsAt,
        guestName: 'Ada Lovelace',
        guestEmail: 'ada@example.com',
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: {
        eventTypeId: pairingEventTypeId,
        startsAt,
        guestName: 'Grace Hopper',
        guestEmail: 'grace@example.com',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'SLOT_ALREADY_BOOKED',
      message: 'Selected start time is already booked.',
    });
  });

  it('lists upcoming bookings sorted by startsAt', async () => {
    const repository = new InMemoryBookingRepository([
      {
        id: introEventTypeId,
        title: 'Intro',
        description: 'Intro call',
        durationMinutes: 60,
      },
    ]);
    await repository.createBooking({
      id: '00000000-0000-4000-8000-000000000101',
      eventTypeId: introEventTypeId,
      startsAt: '2026-06-11T07:00:00.000Z',
      endsAt: '2026-06-11T08:00:00.000Z',
      guestName: 'Past Guest',
      guestEmail: 'past@example.com',
    });
    await repository.createBooking({
      id: '00000000-0000-4000-8000-000000000102',
      eventTypeId: introEventTypeId,
      startsAt: '2026-06-11T12:00:00.000Z',
      endsAt: '2026-06-11T13:00:00.000Z',
      guestName: 'Late Guest',
      guestEmail: 'late@example.com',
    });
    await repository.createBooking({
      id: '00000000-0000-4000-8000-000000000103',
      eventTypeId: introEventTypeId,
      startsAt: '2026-06-11T10:00:00.000Z',
      endsAt: '2026-06-11T11:00:00.000Z',
      guestName: 'Early Guest',
      guestEmail: 'early@example.com',
    });
    app = await createTestApp(repository);

    const response = await app.inject({ method: 'GET', url: '/admin/bookings/upcoming' });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((booking: { id: string }) => booking.id)).toEqual([
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000102',
    ]);
  });

  it('serves the frontend for browser routes without changing JSON API 404s', async () => {
    const frontendDistPath = await mkdtemp(join(tmpdir(), 'booking-frontend-'));
    await mkdir(join(frontendDistPath, 'assets'));
    await writeFile(join(frontendDistPath, 'index.html'), '<!doctype html><div id="root"></div>');
    app = await buildApp({
      frontendDistPath,
      repository: new InMemoryBookingRepository(),
    });

    const browserResponse = await app.inject({
      headers: { accept: 'text/html' },
      method: 'GET',
      url: '/admin/bookings',
    });
    const apiResponse = await app.inject({
      headers: { accept: 'application/json' },
      method: 'GET',
      url: '/not-an-api-route',
    });

    expect(browserResponse.statusCode).toBe(200);
    expect(browserResponse.headers['content-type']).toContain('text/html');
    expect(browserResponse.body).toContain('<div id="root"></div>');
    expect(apiResponse.statusCode).toBe(404);
    expect(apiResponse.json()).toEqual({
      code: 'NOT_FOUND',
      message: 'Route not found.',
    });
  });
});
