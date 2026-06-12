import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const eventTypes = pgTable('event_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
});

export const bookings = pgTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    eventTypeId: uuid('event_type_id')
      .notNull()
      .references(() => eventTypes.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'date', withTimezone: true }).notNull(),
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
  },
  (table) => ({
    startsAtUnique: uniqueIndex('bookings_starts_at_unique').on(table.startsAt),
  }),
);
