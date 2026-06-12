import { randomUUID } from 'node:crypto';

import type { Booking, CreateBookingRequest, CreateEventTypeRequest, EventType } from '../api/generated/types.gen.js';
import type { BookingRepository, CreateBookingResult, ListSlotsResult } from '../domain.js';
import { addMinutes, toIsoString } from './time.js';
import { generateSlots, getSlotWindow, isValidOfferedSlotStart, normalizeSlotStart } from './slots.js';

export type BookingService = ReturnType<typeof createBookingService>;

export function createBookingService(params: {
  now: () => Date;
  repository: BookingRepository;
}) {
  const { now, repository } = params;

  return {
    async createBooking(request: CreateBookingRequest): Promise<CreateBookingResult> {
      const eventType = await repository.findEventType(request.eventTypeId);

      if (!eventType) {
        return { status: 'not_found' };
      }

      const normalizedStartsAt = normalizeSlotStart(request.startsAt);

      if (!normalizedStartsAt) {
        return { status: 'invalid_slot' };
      }

      if (await repository.hasBookingAt(normalizedStartsAt)) {
        return { status: 'conflict' };
      }

      if (!isValidOfferedSlotStart({ eventType, now: now(), startsAt: normalizedStartsAt })) {
        return { status: 'invalid_slot' };
      }

      const startsAtDate = new Date(normalizedStartsAt);
      const endsAt = toIsoString(addMinutes(startsAtDate, eventType.durationMinutes));
      const bookingId = randomUUID();
      const createResult = await repository.createBooking({
        id: bookingId,
        eventTypeId: eventType.id,
        startsAt: normalizedStartsAt,
        endsAt,
        guestName: request.guestName,
        guestEmail: request.guestEmail,
      });

      if (createResult === 'conflict') {
        return { status: 'conflict' };
      }

      return {
        status: 'created',
        booking: {
          id: bookingId,
          eventTypeId: eventType.id,
          eventTypeTitle: eventType.title,
          startsAt: normalizedStartsAt,
          endsAt,
          guestName: request.guestName,
          guestEmail: request.guestEmail,
        },
      };
    },

    async createEventType(request: CreateEventTypeRequest): Promise<EventType> {
      return repository.createEventType({
        title: request.title,
        description: request.description,
        durationMinutes: request.durationMinutes,
      });
    },

    async listEventTypes(): Promise<EventType[]> {
      return repository.listEventTypes();
    },

    async getEventType(eventTypeId: string): Promise<EventType | undefined> {
      return repository.findEventType(eventTypeId);
    },

    async listSlots(eventTypeId: string, query: { month?: string; timeZone?: string } = {}): Promise<ListSlotsResult> {
      const eventType = await repository.findEventType(eventTypeId);

      if (!eventType) {
        return { status: 'not_found' };
      }

      const currentTime = now();
      const window = getSlotWindow({
        month: query.month,
        now: currentTime,
        timeZone: query.timeZone,
      });

      if (!window) {
        return { status: 'invalid_query' };
      }

      const bookings = await repository.listBookingsBetween(
        toIsoString(window.startInclusive),
        toIsoString(window.endExclusive),
      );

      return {
        status: 'found',
        slots: generateSlots({
          bookedStartsAt: bookings.map((booking) => booking.startsAt),
          endExclusive: window.endExclusive,
          eventType,
          month: window.month,
          now: currentTime,
          startInclusive: window.startInclusive,
          timeZone: window.timeZone,
        }),
      };
    },

    async listUpcomingBookings(): Promise<Booking[]> {
      return repository.listUpcomingBookings(toIsoString(now()));
    },
  };
}
