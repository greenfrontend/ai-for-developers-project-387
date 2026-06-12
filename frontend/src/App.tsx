import { AppShell, Container } from '@mantine/core';
import { Route, Routes } from 'react-router-dom';

import { AppHeader } from './components/AppHeader';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { AdminEventTypesPage } from './pages/AdminEventTypesPage';
import { EventTypePage } from './pages/EventTypePage';
import { EventTypesPage } from './pages/EventTypesPage';

export function App() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />
      <AppShell.Main>
        <Container size="lg" py="lg">
          <Routes>
            <Route path="/" element={<EventTypesPage />} />
            <Route path="/event-types/:eventTypeId" element={<EventTypePage />} />
            <Route path="/admin/event-types" element={<AdminEventTypesPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          </Routes>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
