import { RouterProvider, useLocation } from './services/router';
import { LandingPage } from './pages/LandingPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { NewRequest } from './pages/NewRequest';
import { History } from './pages/History';
import { AuditLogs } from './pages/AuditLogs';
import { Reports } from './pages/Reports';

function AppRoutes() {
  const { pathname } = useLocation();

  if (pathname === '/app') {
    return (
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    );
  }

  if (pathname === '/app/new-request') {
    return (
      <DashboardLayout>
        <NewRequest />
      </DashboardLayout>
    );
  }

  if (pathname === '/app/history') {
    return (
      <DashboardLayout>
        <History />
      </DashboardLayout>
    );
  }

  if (pathname === '/app/audit-logs') {
    return (
      <DashboardLayout>
        <AuditLogs />
      </DashboardLayout>
    );
  }

  if (pathname === '/app/reports') {
    return (
      <DashboardLayout>
        <Reports />
      </DashboardLayout>
    );
  }

  if (pathname.startsWith('/app')) {
    return (
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    );
  }

  // Default: Landing Page (/)
  return <LandingPage />;
}

export function App() {
  return (
    <RouterProvider>
      <AppRoutes />
    </RouterProvider>
  );
}

export default App;
