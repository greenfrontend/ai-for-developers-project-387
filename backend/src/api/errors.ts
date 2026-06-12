import type { ErrorResponse } from './generated/types.gen.js';

export function errorResponse(code: string, message: string): ErrorResponse {
  return { code, message };
}

export const errors = {
  eventTypeNotFound: () => errorResponse('EVENT_TYPE_NOT_FOUND', 'Event type was not found.'),
  invalidSlot: () =>
    errorResponse('INVALID_SLOT', 'Selected start time is not one of the available slots.'),
  invalidSlotQuery: () =>
    errorResponse('INVALID_SLOT_QUERY', 'Slot month or time zone query is invalid.'),
  slotAlreadyBooked: () =>
    errorResponse('SLOT_ALREADY_BOOKED', 'Selected start time is already booked.'),
  validation: (message: string) => errorResponse('VALIDATION_ERROR', message),
};
