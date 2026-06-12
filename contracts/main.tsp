import "@typespec/http";

using Http;

@service(#{ title: "Booking API" })
namespace BookingApi;

@format("uuid")
@doc("Database-generated UUID.")
scalar Uuid extends string;

@doc("Calendar month in YYYY-MM format.")
scalar YearMonth extends string;

@doc("A type of event that guests can book.")
model EventType {
  id: Uuid;
  title: string;
  description: string;
  @doc("Duration of this event type in minutes.")
  @minValue(1)
  durationMinutes: int32;
}

@doc("Input used by the calendar owner to create an event type.")
model CreateEventTypeRequest {
  title: string;
  description: string;
  @doc("Duration of this event type in minutes.")
  @minValue(1)
  durationMinutes: int32;
}

@doc("A free booking slot for a selected event type in a calendar month.")
model Slot {
  startsAt: utcDateTime;
  endsAt: utcDateTime;
}

@doc("A guest booking. The end time is calculated from the event type duration.")
model Booking {
  id: Uuid;
  eventTypeId: Uuid;
  eventTypeTitle: string;
  startsAt: utcDateTime;
  @doc("Calculated as startsAt plus the selected event type duration.")
  endsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@doc("Input used by a guest to create a booking.")
model CreateBookingRequest {
  @doc("The event type selected by the guest.")
  eventTypeId: Uuid;
  @doc("Must be one of the free slot start times for the selected event type.")
  startsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@error
model ErrorResponse {
  code: string;
  message: string;
}

model CreatedEventType {
  @statusCode _: 201;
  @body eventType: EventType;
}

model CreatedBooking {
  @statusCode _: 201;
  @body booking: Booking;
}

model BadRequestError {
  @statusCode _: 400;
  @body error: ErrorResponse;
}

model NotFoundError {
  @statusCode _: 404;
  @body error: ErrorResponse;
}

model ConflictError {
  @statusCode _: 409;
  @body error: ErrorResponse;
}

@route("/event-types")
interface EventTypes {
  @doc("List event types available to guests.")
  @get list(): EventType[];

  @doc("Get an event type by its generated id.")
  @route("/{eventTypeId}")
  @get read(@path eventTypeId: Uuid): EventType | NotFoundError;
}

@route("/event-types/{eventTypeId}/slots")
interface EventTypeSlots {
  @doc("List free slots for the selected event type in a calendar month. The month query uses YYYY-MM and defaults to the current month. The timeZone query uses an IANA time zone and defaults to UTC.")
  @get list(
    @path eventTypeId: Uuid,
    @query month?: YearMonth,
    @query timeZone?: string,
  ): Slot[] | BadRequestError | NotFoundError;
}

@route("/bookings")
interface Bookings {
  @doc("Create a guest booking for a free slot. Returns 400 when the selected start time is in the past or is not one of the offered slots. Returns 409 when any existing booking already starts at the selected time, even if it belongs to another event type.")
  @post create(@body request: CreateBookingRequest): CreatedBooking | BadRequestError | NotFoundError | ConflictError;
}

@route("/admin/event-types")
interface AdminEventTypes {
  @doc("Create an event type for the predefined calendar owner.")
  @post create(@body request: CreateEventTypeRequest): CreatedEventType;
}

@route("/admin/bookings")
interface AdminBookings {
  @doc("List upcoming bookings across all event types for the predefined calendar owner.")
  @route("/upcoming")
  @get listUpcoming(): Booking[];
}
