# Integration Scenarios

The integration suite uses Playwright to exercise the frontend and backend
together in a real browser. Tests should prefer user-facing locators and should
only rely on API calls for setup when the setup itself is not part of the
scenario.

## Main Booking Flow

Covered by `e2e/booking.spec.ts`.

1. Open the admin event type page.
2. Create a unique event type with a title, description, and duration.
3. Open the guest booking page.
4. Find the newly created event type in the event type list.
5. Open its available slots.
6. Use the month calendar to select the first available day.
7. Select the first available time on that day.
8. Fill in guest name and email.
9. Create the booking.
10. Verify that the success notification appears.
11. Verify that the booked slot is no longer offered.
12. Open the admin bookings page.
13. Verify that the booking appears with the expected event title, guest name,
    and guest email.

## Additional Scenarios To Keep Covered

- Event type list loads successfully and shows empty state when the API returns
  no event types.
- Slot page shows empty state when no slots are available.
- Booking form blocks submission when required guest fields are missing.
- API conflict errors are shown when the selected slot is already booked.
- Admin bookings list shows upcoming bookings sorted by start time.

## Local Commands

Run the full e2e suite:

```sh
make e2e
```

Run Playwright in interactive mode:

```sh
make e2e-ui
```

Run the test in a visible browser with slowed-down actions:

```sh
make e2e-headed
```

Run with Playwright Inspector and step through each action:

```sh
make e2e-debug
```

The `e2e` make target starts PostgreSQL, waits for the healthcheck, applies the
database migration, and then runs Playwright. The Playwright config starts the
backend and frontend automatically.

```sh
make e2e
```
