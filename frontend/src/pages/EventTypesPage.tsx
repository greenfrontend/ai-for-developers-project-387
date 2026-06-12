import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowRight, IconClock } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { formatApiError } from '../api/errors';
import { eventTypesList } from '../api/generated/sdk.gen';
import type { EventType } from '../api/generated/types.gen';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { formatDuration } from '../utils/dates';

export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEventTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await eventTypesList();

    if (result.error) {
      setError(formatApiError(result.error, 'Could not load event types'));
      setEventTypes([]);
    } else {
      setEventTypes(result.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEventTypes();
  }, [loadEventTypes]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>Guest booking</Title>
          <Text c="dimmed">Choose an event type and book an available slot.</Text>
        </Stack>
      </Group>

      {loading ? <PageLoader label="Loading event types" /> : null}

      {!loading && error ? <ErrorState message={error} onRetry={loadEventTypes} /> : null}

      {!loading && !error && eventTypes.length === 0 ? (
        <EmptyState
          title="No event types"
          description="There are no bookable event types in the API response."
        />
      ) : null}

      {!loading && !error && eventTypes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {eventTypes.map((eventType) => (
            <Paper key={eventType.id} withBorder p="lg" radius="sm">
              <Stack gap="md" h="100%">
                <Stack gap="xs">
                  <Group justify="space-between" gap="xs" align="flex-start">
                    <Title order={2} size="h3">
                      {eventType.title}
                    </Title>
                    <Badge leftSection={<IconClock size={12} />} variant="light">
                      {formatDuration(eventType.durationMinutes)}
                    </Badge>
                  </Group>
                  <Text c="dimmed" size="sm">
                    {eventType.description}
                  </Text>
                </Stack>
                <Button
                  component={Link}
                  to={`/event-types/${encodeURIComponent(eventType.id)}`}
                  rightSection={<IconArrowRight size={16} />}
                  mt="auto"
                >
                  View slots
                </Button>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      ) : null}
    </Stack>
  );
}
