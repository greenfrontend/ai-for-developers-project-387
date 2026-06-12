import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MonthView, type ScheduleEventData } from '@mantine/schedule';
import {
  IconArrowLeft,
  IconCalendarCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconSend,
} from '@tabler/icons-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { formatApiError } from '../api/errors';
import { bookingsCreate, eventTypeSlotsList, eventTypesRead } from '../api/generated/sdk.gen';
import type { EventType, Slot } from '../api/generated/types.gen';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import {
  addMonths,
  formatDate,
  formatDuration,
  formatMonth,
  formatTimeRange,
  getCurrentMonthKey,
  getDateKey,
} from '../utils/dates';

type BookingForm = {
  guestName: string;
  guestEmail: string;
};

type AvailabilityPayload = {
  dateKey: string;
};

const initialForm: BookingForm = {
  guestName: '',
  guestEmail: '',
};

export function EventTypePage() {
  const { eventTypeId = '' } = useParams();
  const decodedEventTypeId = useMemo(() => decodeURIComponent(eventTypeId), [eventTypeId]);
  const timeZone = useMemo(getBrowserTimeZone, []);
  const currentMonth = useMemo(() => getCurrentMonthKey(timeZone), [timeZone]);
  const [month, setMonth] = useState(() => getCurrentMonthKey(timeZone));
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [eventTypeLoading, setEventTypeLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const slotsByDate = useMemo(() => groupSlotsByDate(slots, timeZone), [slots, timeZone]);
  const selectedDateSlots = selectedDate ? slotsByDate.get(selectedDate) ?? [] : [];
  const availabilityEvents = useMemo(() => getAvailabilityEvents(slotsByDate), [slotsByDate]);
  const canGoPrevious = month > currentMonth;
  const loading = eventTypeLoading || slotsLoading;

  const selectDate = useCallback(
    (dateKey: string) => {
      if (!slotsByDate.has(dateKey)) {
        return;
      }

      setSelectedDate(dateKey);
      setSelectedSlot('');
    },
    [slotsByDate],
  );

  const loadEventType = useCallback(async () => {
    if (!decodedEventTypeId) {
      setEventTypeLoading(false);
      setError('Event type id is missing from the route');
      return;
    }

    setEventTypeLoading(true);
    setError(null);

    const result = await eventTypesRead({
      path: { eventTypeId: decodedEventTypeId },
    });

    if (result.error) {
      setError(formatApiError(result.error, 'Could not load event type'));
      setEventType(null);
    } else {
      setEventType(result.data ?? null);
    }

    setEventTypeLoading(false);
  }, [decodedEventTypeId]);

  const loadSlots = useCallback(async () => {
    if (!decodedEventTypeId) {
      setSlotsLoading(false);
      setError('Event type id is missing from the route');
      return;
    }

    setSlotsLoading(true);
    setError(null);

    const result = await eventTypeSlotsList({
      path: { eventTypeId: decodedEventTypeId },
      query: { month, timeZone },
    });

    if (result.error) {
      setError(formatApiError(result.error, 'Could not load slots'));
      setSlots([]);
      setSelectedDate('');
      setSelectedSlot('');
    } else {
      const nextSlots = [...(result.data ?? [])].sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
      );
      const nextSlotsByDate = groupSlotsByDate(nextSlots, timeZone);

      setSlots(nextSlots);
      setSelectedSlot('');
      setSelectedDate((current) =>
        current && nextSlotsByDate.has(current) ? current : getFirstAvailableDate(nextSlotsByDate),
      );
    }

    setSlotsLoading(false);
  }, [decodedEventTypeId, month, timeZone]);

  useEffect(() => {
    void loadEventType();
  }, [loadEventType]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedSlot) {
      setSubmitError('Choose a time before submitting the booking.');
      return;
    }

    setSubmitting(true);

    const result = await bookingsCreate({
      body: {
        eventTypeId: decodedEventTypeId,
        startsAt: selectedSlot,
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim(),
      },
    });

    if (result.error) {
      setSubmitError(formatApiError(result.error, 'Could not create booking'));
    } else {
      notifications.show({
        color: 'teal',
        icon: <IconCalendarCheck size={18} />,
        message: result.data
          ? `Booking created for ${formatDate(result.data.startsAt, timeZone)}`
          : 'Booking created.',
        title: 'Booking created',
      });
      setForm(initialForm);
      setSelectedSlot('');
      await loadSlots();
    }

    setSubmitting(false);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={1}>{eventType?.title ?? 'Available slots'}</Title>
          {eventType ? (
            <>
              <Text c="dimmed">{eventType.description}</Text>
              <Badge leftSection={<IconClock size={12} />} variant="light" w="fit-content">
                {formatDuration(eventType.durationMinutes)}
              </Badge>
            </>
          ) : null}
        </Stack>
        <Button component={Link} to="/" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
          Back
        </Button>
      </Group>

      {loading ? <PageLoader label="Loading availability" /> : null}

      {!loading && error ? <ErrorState message={error} onRetry={() => void Promise.all([loadEventType(), loadSlots()])} /> : null}

      {!loading && !error && slots.length === 0 ? (
        <EmptyState
          title="No free slots"
          description="This event type has no available slots for the selected month."
        />
      ) : null}

      {!loading && !error && slots.length > 0 ? (
        <Paper withBorder p="lg" radius="sm">
          <Grid gap="xl">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Stack gap="md">
                <Group justify="space-between" wrap="nowrap">
                  <ActionIcon
                    aria-label="Previous month"
                    disabled={!canGoPrevious}
                    onClick={() => {
                      if (canGoPrevious) {
                        setMonth(addMonths(month, -1));
                      }
                    }}
                    variant="subtle"
                  >
                    <IconChevronLeft size={18} />
                  </ActionIcon>
                  <Title order={2} size="h3" ta="center">
                    {formatMonth(month)}
                  </Title>
                  <ActionIcon
                    aria-label="Next month"
                    onClick={() => setMonth(addMonths(month, 1))}
                    variant="subtle"
                  >
                    <IconChevronRight size={18} />
                  </ActionIcon>
                </Group>

                <MonthView
                  consistentWeeks={false}
                  date={`${month}-01`}
                  events={availabilityEvents}
                  firstDayOfWeek={1}
                  getDayProps={(date) => {
                    const count = slotsByDate.get(date)?.length ?? 0;

                    return {
                      'aria-label': count > 0 ? `${date}, ${count} available slots` : `${date}, no available slots`,
                      disabled: count === 0,
                      mod: { 'drag-selected': date === selectedDate },
                    };
                  }}
                  maxEventsPerDay={1}
                  onDayClick={(date) => selectDate(date)}
                  onEventClick={(event) => {
                    const dateKey = event.payload?.dateKey;

                    if (typeof dateKey === 'string') {
                      selectDate(dateKey);
                    }
                  }}
                  radius="sm"
                  weekdayFormat="ddd"
                  withHeader={false}
                />
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <form onSubmit={handleSubmit}>
                <Stack gap="lg">
                  <Stack gap={4}>
                    <Group justify="space-between" gap="xs" align="flex-start">
                      <Title order={2} size="h3">
                        {selectedDate ? formatDate(selectedDate, timeZone) : 'Select a day'}
                      </Title>
                      {selectedDateSlots.length > 0 ? (
                        <Badge variant="light">{selectedDateSlots.length} slots</Badge>
                      ) : null}
                    </Group>
                    <Text c="dimmed" size="sm">
                      {timeZone}
                    </Text>
                  </Stack>

                  {selectedDateSlots.length > 0 ? (
                    <SimpleGrid cols={{ base: 1, sm: 3, md: 2 }} spacing="xs">
                      {selectedDateSlots.map((slot) => (
                        <Button
                          key={slot.startsAt}
                          data-slot-starts-at={slot.startsAt}
                          type="button"
                          variant={selectedSlot === slot.startsAt ? 'filled' : 'light'}
                          onClick={() => setSelectedSlot(slot.startsAt)}
                        >
                          {formatTimeRange(slot.startsAt, slot.endsAt, timeZone)}
                        </Button>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Choose a day with available slots.
                    </Text>
                  )}

                  <Group grow align="flex-start">
                    <TextInput
                      label="Guest name"
                      value={form.guestName}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setForm((current) => ({ ...current, guestName: value }));
                      }}
                      required
                    />
                    <TextInput
                      label="Guest email"
                      type="email"
                      value={form.guestEmail}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setForm((current) => ({ ...current, guestEmail: value }));
                      }}
                      required
                    />
                  </Group>

                  {submitError ? (
                    <Alert color="red" variant="light">
                      {submitError}
                    </Alert>
                  ) : null}

                  <Button
                    type="submit"
                    loading={submitting}
                    disabled={!selectedSlot}
                    leftSection={<IconSend size={16} />}
                  >
                    Create booking
                  </Button>
                </Stack>
              </form>
            </Grid.Col>
          </Grid>
        </Paper>
      ) : null}
    </Stack>
  );
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function groupSlotsByDate(slots: Slot[], timeZone: string) {
  const groupedSlots = new Map<string, Slot[]>();

  for (const slot of slots) {
    const dateKey = getDateKey(slot.startsAt, timeZone);
    const daySlots = groupedSlots.get(dateKey) ?? [];

    daySlots.push(slot);
    groupedSlots.set(dateKey, daySlots);
  }

  for (const daySlots of groupedSlots.values()) {
    daySlots.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }

  return groupedSlots;
}

function getFirstAvailableDate(slotsByDate: Map<string, Slot[]>) {
  return Array.from(slotsByDate.keys()).sort()[0] ?? '';
}

function getAvailabilityEvents(slotsByDate: Map<string, Slot[]>): ScheduleEventData<AvailabilityPayload>[] {
  return Array.from(slotsByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, daySlots]) => ({
      id: dateKey,
      title: `${daySlots.length} ${daySlots.length === 1 ? 'slot' : 'slots'}`,
      start: `${dateKey} 00:00:00`,
      end: `${dateKey} 23:59:59`,
      color: 'teal',
      variant: 'light',
      payload: { dateKey },
    }));
}
