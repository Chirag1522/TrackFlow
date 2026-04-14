import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthGuard, RoleGuard } from '../guards/Guards';
import DashboardLayout from '../layouts/DashboardLayout';
import PublicLayout from '../layouts/PublicLayout';
import AuthLayout from '../layouts/AuthLayout';

const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const TrackPage = lazy(() => import('../pages/public/TrackPage'));

// Super Admin
const SuperDashboard = lazy(() => import('../pages/super-admin/DashboardPage'));
const TenantsPage = lazy(() => import('../pages/super-admin/TenantsPage'));
const PlansPage = lazy(() => import('../pages/super-admin/PlansPage'));

// Admin
const AdminDashboard = lazy(() => import('../pages/admin/DashboardPage'));
const ShipmentsPage = lazy(() => import('../pages/admin/ShipmentsPage'));
const AgentsPage = lazy(() => import('../pages/admin/AgentsPage'));
const HubsPage = lazy(() => import('../pages/admin/HubsPage'));
const AnalyticsPage = lazy(() => import('../pages/admin/AnalyticsPage'));

// Agent
const DeliveriesPage = lazy(() => import('../pages/agent/DeliveriesPage'));
const PastShipmentsPage = lazy(() => import('../pages/agent/PastShipmentsPage'));
const ScanPage = lazy(() => import('../pages/agent/ScanPage'));

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderBottomColor: '#F74B25' }} />
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route path="/track/:tracking_id?" element={<TrackPage />} />
          </Route>

          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Super Admin */}
          <Route path="/super-admin" element={
            <AuthGuard><RoleGuard roles={['super_admin']}><DashboardLayout /></RoleGuard></AuthGuard>
          }>
            <Route index element={<SuperDashboard />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="plans" element={<PlansPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={
            <AuthGuard><RoleGuard roles={['admin']}><DashboardLayout /></RoleGuard></AuthGuard>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="hubs" element={<HubsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Agent */}
          <Route path="/agent" element={
            <AuthGuard><RoleGuard roles={['agent']}><DashboardLayout /></RoleGuard></AuthGuard>
          }>
            <Route index element={<DeliveriesPage />} />
            <Route path="past-shipments" element={<PastShipmentsPage />} />
            <Route path="scan" element={<ScanPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
