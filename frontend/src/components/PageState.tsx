import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconInbox, IconRefresh } from '@tabler/icons-react';

type PageLoaderProps = {
  label?: string;
};

export function PageLoader({ label = 'Loading data' }: PageLoaderProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <Loader />
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Alert icon={<IconInbox size={18} />} color="gray" variant="light" title={title}>
      {description}
    </Alert>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      icon={<IconAlertCircle size={18} />}
      color="red"
      variant="light"
      title="Request failed"
    >
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {onRetry ? (
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            color="red"
            onClick={onRetry}
            w="fit-content"
          >
            Retry
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}
