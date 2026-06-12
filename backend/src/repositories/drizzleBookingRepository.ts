import { and, asc, eq, gte, lt } from 'drizzle-orm';

import type { Booking, CreateEventTypeRequest, EventType } from '../api/generated/types.gen.js';
import { bookings, eventTypes } from '../db/schema.js';
import type { Database } from '../db/client.js';
import type { BookingDraft, BookingRepository } from '../domain.js';

function toEventType(row: typeof eventTypes.$inferSelect): EventType {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
  };
}

function toBooking(row: {
  id: string;
  eventTypeId: string;
  eventTypeTitle: string;
  startsAt: Date;
  endsAt: Date;
  guestName: string;
  guestEmail: string;
}): Booking {
  return {
    id: row.id,
    eventTypeId: row.eventTypeId,
    eventTypeTitle: row.eventTypeTitle,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === '23505');
}

export class DrizzleBookingRepository implements BookingRepository {
  constructor(private readonly db: Database) {}

  async createBooking(booking: BookingDraft): Promise<'created' | 'conflict'> {
    try {
      await this.db.insert(bookings).values({
        id: booking.id,
        eventTypeId: booking.eventTypeId,
        startsAt: new Date(booking.startsAt),
        endsAt: new Date(booking.endsAt),
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
      });

      return 'created';
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'conflict';
      }

      throw error;
    }
  }

  async createEventType(eventType: CreateEventTypeRequest): Promise<EventType> {
    const [createdEventType] = await this.db
      .insert(eventTypes)
      .values({
        title: eventType.title,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes,
      })
      .returning();

    return toEventType(createdEventType);
  }

  async findEventType(eventTypeId: string): Promise<EventType | undefined> {
    const [eventType] = await this.db
      .select()
      .from(eventTypes)
      .where(eq(eventTypes.id, eventTypeId))
      .limit(1);

    return eventType ? toEventType(eventType) : undefined;
  }

  async hasBookingAt(startsAt: string): Promise<boolean> {
    const [booking] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.startsAt, new Date(startsAt)))
      .limit(1);

    return Boolean(booking);
  }

  async listBookingsBetween(startInclusive: string, endExclusive: string): Promise<Booking[]> {
    const rows = await this.db
      .select({
        id: bookings.id,
        eventTypeId: bookings.eventTypeId,
        eventTypeTitle: eventTypes.title,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        guestName: bookings.guestName,
        guestEmail: bookings.guestEmail,
      })
      .from(bookings)
      .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
      .where(
        and(gte(bookings.startsAt, new Date(startInclusive)), lt(bookings.startsAt, new Date(endExclusive))),
      )
      .orderBy(asc(bookings.startsAt));

    return rows.map(toBooking);
  }

  async listEventTypes(): Promise<EventType[]> {
    const rows = await this.db
      .select()
      .from(eventTypes)
      .orderBy(asc(eventTypes.title), asc(eventTypes.id));

    return rows.map(toEventType);
  }

  async listUpcomingBookings(now: string): Promise<Booking[]> {
    const rows = await this.db
      .select({
        id: bookings.id,
        eventTypeId: bookings.eventTypeId,
        eventTypeTitle: eventTypes.title,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        guestName: bookings.guestName,
        guestEmail: bookings.guestEmail,
      })
      .from(bookings)
      .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
      .where(gte(bookings.startsAt, new Date(now)))
      .orderBy(asc(bookings.startsAt));

    return rows.map(toBooking);
  }
}
