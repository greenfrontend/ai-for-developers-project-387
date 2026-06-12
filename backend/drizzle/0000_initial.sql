CREATE TABLE IF NOT EXISTS event_types (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  duration_minutes integer NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  event_type_id text NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_starts_at_unique ON bookings (starts_at);
