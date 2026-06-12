import type { Booking, CreateEventTypeRequest, EventType, Slot } from './api/generated/types.gen.js';

export type BookingDraft = {
  id: string;
  eventTypeId: string;
  startsAt: string;
  endsAt: string;
  guestName: string;
  guestEmail: string;
};

export type CreateBookingResult =
  | { status: 'created'; booking: Booking }
  | { status: 'not_found' }
  | { status: 'invalid_slot' }
  | { status: 'conflict' };

export type ListSlotsResult =
  | { status: 'found'; slots: Slot[] }
  | { status: 'not_found' }
  | { status: 'invalid_query' };

export interface BookingRepository {
  createBooking(booking: BookingDraft): Promise<'created' | 'conflict'>;
  createEventType(eventType: CreateEventTypeRequest): Promise<EventType>;
  findEventType(eventTypeId: string): Promise<EventType | undefined>;
  hasBookingAt(startsAt: string): Promise<boolean>;
  listBookingsBetween(startInclusive: string, endExclusive: string): Promise<Booking[]>;
  listEventTypes(): Promise<EventType[]>;
  listUpcomingBookings(now: string): Promise<Booking[]>;
}
