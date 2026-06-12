import { randomUUID } from 'node:crypto';

import type { Booking, CreateEventTypeRequest, EventType } from '../api/generated/types.gen.js';
import type { BookingDraft, BookingRepository } from '../domain.js';
import { normalizeSlotStart } from '../services/slots.js';

export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, BookingDraft>();
  private readonly eventTypes = new Map<string, EventType>();

  constructor(initialEventTypes: EventType[] = []) {
    for (const eventType of initialEventTypes) {
      this.eventTypes.set(eventType.id, eventType);
    }
  }

  async createBooking(booking: BookingDraft): Promise<'created' | 'conflict'> {
    const normalizedStartsAt = normalizeSlotStart(booking.startsAt);

    if (!normalizedStartsAt || this.bookings.has(normalizedStartsAt)) {
      return 'conflict';
    }

    this.bookings.set(normalizedStartsAt, { ...booking, startsAt: normalizedStartsAt });

    return 'created';
  }

  async createEventType(eventType: CreateEventTypeRequest): Promise<EventType> {
    const createdEventType = {
      id: randomUUID(),
      ...eventType,
    };

    this.eventTypes.set(createdEventType.id, createdEventType);

    return createdEventType;
  }

  async findEventType(eventTypeId: string): Promise<EventType | undefined> {
    return this.eventTypes.get(eventTypeId);
  }

  async hasBookingAt(startsAt: string): Promise<boolean> {
    const normalizedStartsAt = normalizeSlotStart(startsAt);

    return normalizedStartsAt ? this.bookings.has(normalizedStartsAt) : false;
  }

  async listBookingsBetween(startInclusive: string, endExclusive: string): Promise<Booking[]> {
    return this.toSortedBookings().filter(
      (booking) => booking.startsAt >= startInclusive && booking.startsAt < endExclusive,
    );
  }

  async listEventTypes(): Promise<EventType[]> {
    return Array.from(this.eventTypes.values()).sort(compareEventTypes);
  }

  async listUpcomingBookings(now: string): Promise<Booking[]> {
    return this.toSortedBookings().filter((booking) => booking.startsAt >= now);
  }

  private toSortedBookings(): Booking[] {
    return Array.from(this.bookings.values())
      .map((booking) => {
        const eventType = this.eventTypes.get(booking.eventTypeId);

        if (!eventType) {
          throw new Error(`Missing event type ${booking.eventTypeId}`);
        }

        return {
          id: booking.id,
          eventTypeId: booking.eventTypeId,
          eventTypeTitle: eventType.title,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
        };
      })
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }
}

function compareEventTypes(left: EventType, right: EventType): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}
