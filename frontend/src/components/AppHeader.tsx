import { ActionIcon, AppShell, Button, Group, Menu, Text, Tooltip, rem } from '@mantine/core';
import {
  IconCalendarEvent,
  IconClipboardList,
  IconListDetails,
  IconMenu2,
  IconPlus,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

type NavItem = {
  icon: typeof IconCalendarEvent;
  label: string;
  to: string;
};

const navItems: NavItem[] = [
  { icon: IconCalendarEvent, label: 'Guest booking', to: '/' },
  { icon: IconPlus, label: 'Create event type', to: '/admin/event-types' },
  { icon: IconClipboardList, label: 'Upcoming bookings', to: '/admin/bookings' },
];

export function AppHeader() {
  const location = useLocation();

  return (
    <AppShell.Header>
      <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconListDetails size={24} stroke={1.8} />
          <Text fw={700} size="lg">
            Booking UI
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap" visibleFrom="sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                variant={active ? 'filled' : 'subtle'}
                leftSection={<Icon size={rem(16)} stroke={1.8} />}
                size="sm"
              >
                {item.label}
              </Button>
            );
          })}
        </Group>
        <Menu position="bottom-end" width={220} shadow="md">
          <Menu.Target>
            <Tooltip label="Navigation">
              <ActionIcon hiddenFrom="sm" variant="light" aria-label="Navigation menu">
                <IconMenu2 size={18} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <Menu.Item
                  key={item.to}
                  component={Link}
                  to={item.to}
                  color={active ? 'teal' : undefined}
                  leftSection={<Icon size={rem(16)} stroke={1.8} />}
                >
                  {item.label}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </AppShell.Header>
  );
}
