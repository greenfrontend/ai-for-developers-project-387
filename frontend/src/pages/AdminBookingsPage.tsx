import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { formatApiError } from '../api/errors';
import { adminBookingsListUpcoming } from '../api/generated/sdk.gen';
import type { Booking } from '../api/generated/types.gen';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { formatDateTime } from '../utils/dates';

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await adminBookingsListUpcoming();

    if (result.error) {
      setError(formatApiError(result.error, 'Could not load bookings'));
      setBookings([]);
    } else {
      setBookings(result.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>Upcoming bookings</Title>
          <Text c="dimmed">Bookings across all event types from the admin endpoint.</Text>
        </Stack>
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={loadBookings}
          loading={loading}
        >
          Refresh
        </Button>
      </Group>

      {loading ? <PageLoader label="Loading bookings" /> : null}

      {!loading && error ? <ErrorState message={error} onRetry={loadBookings} /> : null}

      {!loading && !error && bookings.length === 0 ? (
        <EmptyState
          title="No upcoming bookings"
          description="The API response does not contain upcoming bookings."
        />
      ) : null}

      {!loading && !error && bookings.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {bookings.map((booking) => (
            <Paper key={booking.id} withBorder p="lg" radius="sm">
              <Stack gap="sm">
                <Stack gap={2}>
                  <Title order={2} size="h3">
                    {booking.eventTypeTitle}
                  </Title>
                  <Text c="dimmed" size="sm">
                    {booking.guestName} · {booking.guestEmail}
                  </Text>
                </Stack>
                <Text size="sm">
                  {formatDateTime(booking.startsAt)} - {formatDateTime(booking.endsAt)}
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      ) : null}
    </Stack>
  );
}
