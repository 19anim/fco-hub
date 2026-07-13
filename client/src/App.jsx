import { BrowserRouter, Route, Routes } from 'react-router-dom';
import FcoApp from './fco/FcoApp';
import { AssetProvider } from './fco/assets/AssetProvider.jsx';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/admin/LoginPage';
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import UsersPage from './pages/admin/UsersPage';
import MonetizationListPage from './pages/admin/MonetizationListPage';
import MonetizationEditPage from './pages/admin/MonetizationEditPage';
import PlacementsPage from './pages/admin/PlacementsPage';
import DataOpsPage from './pages/admin/DataOpsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SettingsPage from './pages/admin/SettingsPage';
import AssetsPage from './pages/admin/AssetsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public admin auth routes (no layout) */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={<ChangePasswordPage />} />

          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AssetProvider>
                  <AdminLayout />
                </AssetProvider>
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="monetization" element={<MonetizationListPage />} />
            <Route path="monetization/new" element={<MonetizationEditPage />} />
            <Route path="monetization/:id" element={<MonetizationEditPage />} />
            <Route path="placements" element={<PlacementsPage />} />
            <Route path="data-ops" element={<DataOpsPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Public app — existing FcoApp handles all hash-based routing internally */}
          <Route path="/*" element={<FcoApp />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
