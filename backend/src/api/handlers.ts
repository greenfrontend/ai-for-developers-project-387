import type { RouteHandlers } from './generated/fastify.gen.js';
import { errors } from './errors.js';
import type { BookingService } from '../services/bookingService.js';

export function createRouteHandlers(service: BookingService): RouteHandlers {
  return {
    async adminBookingsListUpcoming(_request, reply) {
      return reply.code(200).send(await service.listUpcomingBookings());
    },

    async adminEventTypesCreate(request, reply) {
      return reply.code(201).send(await service.createEventType(request.body));
    },

    async bookingsCreate(request, reply) {
      const result = await service.createBooking(request.body);

      switch (result.status) {
        case 'created':
          return reply.code(201).send(result.booking);
        case 'not_found':
          return reply.code(404).send(errors.eventTypeNotFound());
        case 'invalid_slot':
          return reply.code(400).send(errors.invalidSlot());
        case 'conflict':
          return reply.code(409).send(errors.slotAlreadyBooked());
      }
    },

    async eventTypesList(_request, reply) {
      return reply.code(200).send(await service.listEventTypes());
    },

    async eventTypesRead(request, reply) {
      const eventType = await service.getEventType(request.params.eventTypeId);

      if (!eventType) {
        return reply.code(404).send(errors.eventTypeNotFound());
      }

      return reply.code(200).send(eventType);
    },

    async eventTypeSlotsList(request, reply) {
      const result = await service.listSlots(request.params.eventTypeId, request.query ?? {});

      switch (result.status) {
        case 'found':
          return reply.code(200).send(result.slots);
        case 'not_found':
          return reply.code(404).send(errors.eventTypeNotFound());
        case 'invalid_query':
          return reply.code(400).send(errors.invalidSlotQuery());
      }
    },
  };
}

export function toOpenApiServiceHandlers(handlers: RouteHandlers) {
  return {
    AdminBookings_listUpcoming: handlers.adminBookingsListUpcoming,
    AdminEventTypes_create: handlers.adminEventTypesCreate,
    Bookings_create: handlers.bookingsCreate,
    EventTypes_list: handlers.eventTypesList,
    EventTypes_read: handlers.eventTypesRead,
    EventTypeSlots_list: handlers.eventTypeSlotsList,
  };
}
