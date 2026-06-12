import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';

import { formatApiError } from '../api/errors';
import { adminEventTypesCreate } from '../api/generated/sdk.gen';

type EventTypeForm = {
  title: string;
  description: string;
  durationMinutes: number | '';
};

const initialForm: EventTypeForm = {
  title: '',
  description: '',
  durationMinutes: 30,
};

export function AdminEventTypesPage() {
  const [form, setForm] = useState<EventTypeForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (form.durationMinutes === '' || form.durationMinutes < 1) {
      setError('Duration must be at least 1 minute.');
      return;
    }

    setSubmitting(true);

    const result = await adminEventTypesCreate({
      body: {
        title: form.title.trim(),
        description: form.description.trim(),
        durationMinutes: form.durationMinutes,
      },
    });

    if (result.error) {
      setError(formatApiError(result.error, 'Could not create event type'));
    } else {
      notifications.show({
        color: 'teal',
        icon: <IconPlus size={18} />,
        message: result.data
          ? `${result.data.title} is now available in the API response.`
          : 'Event type created.',
        title: 'Event type created',
      });
      setForm(initialForm);
    }

    setSubmitting(false);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>Create event type</Title>
          <Text c="dimmed">Add a bookable event type through the contract API.</Text>
        </Stack>
      </Group>

      <Paper withBorder p="lg" radius="sm">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <NumberInput
                label="Duration, minutes"
                min={1}
                value={form.durationMinutes}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: typeof value === 'number' ? value : '',
                  }))
                }
                required
              />
            </Group>

            <TextInput
              label="Title"
              value={form.title}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setForm((current) => ({ ...current, title: value }));
              }}
              required
            />

            <Textarea
              label="Description"
              minRows={4}
              value={form.description}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setForm((current) => ({
                  ...current,
                  description: value,
                }));
              }}
              required
            />

            {error ? (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            ) : null}

            <Button type="submit" loading={submitting} leftSection={<IconPlus size={16} />}>
              Create event type
            </Button>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
