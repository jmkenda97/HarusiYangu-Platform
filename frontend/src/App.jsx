import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext'; 
// <--- UPDATED IMPORT: Added useAuth
import { AuthProvider, useAuth } from './context/AuthContext'; 
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';

// --- OPTIMIZATION: LAZY LOADING ---
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const EventsPage = React.lazy(() => import('./pages/EventsPage'));
const EventDetailsPage = React.lazy(() => import('./pages/EventDetailsPage'));

// --- HOST: Vendor Catalog ---
const VendorCatalogPage = React.lazy(() => import('./pages/VendorCatalogPage'));
const VendorProfilePage = React.lazy(() => import('./pages/VendorProfilePage'));
const VendorDashboardPage = React.lazy(() => import('./pages/VendorDashboardPage'));
const AdminVendorsPage = React.lazy(() => import('./pages/AdminVendorsPage'));

// ============================================================
// SMART REDIRECT COMPONENT (THE FIX)
// ============================================================
const SmartRedirect = () => {
  const { user, loading } = useAuth();

  // Wait until we know who the user is
  if (loading) {
    return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Verifying account...</div>;
  }

  // If we have the user data, check their role
  if (user) {
    if (user.role === 'VENDOR') {
        // VENDOR -> Go to Vendor Dashboard
        return <Navigate to="/vendor/dashboard" replace />;
    } else {
        // HOST (or ADMIN) -> Go to Host Dashboard
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Safety net: If no user data but inside PrivateRoute, send to login
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider> 
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes Wrapper */}
            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              
              {/* --- ROOT PATH: NOW USES SMART REDIRECT --- */}
              {/* When user logs in or registers, they land here. 
                  SmartRedirect checks their role and sends them to the correct dashboard. */}
              <Route path="/" element={<SmartRedirect />} />

              {/* --- HOST DASHBOARD --- */}
              <Route path="/dashboard" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Dashboard...</div>}>
                  <DashboardPage />
                </Suspense>
              } />
              
              {/* --- HOST PAGES --- */}
              <Route path="/users" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Users...</div>}>
                  <UsersPage />
                </Suspense>
              } />
              <Route path="/profile" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Profile...</div>}>
                  <ProfilePage />
                </Suspense>
              } />
              <Route path="events" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Events...</div>}>
                  <EventsPage />
                </Suspense>
              } />
              <Route path="events/:id" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Event Details...</div>}>
                  <EventDetailsPage />
                </Suspense>
              } />

              {/* --- HOST: VENDOR CATALOG --- */}
              <Route path="/vendor-catalog" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Vendor Catalog...</div>}>
                  <VendorCatalogPage />
                </Suspense>
              } />
              
              {/* --- VENDOR ROUTES --- */}
              <Route path="/vendor/profile" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Vendor Profile...</div>}>
                  <VendorProfilePage />
                </Suspense>
              } />
              
              <Route path="/vendor/dashboard" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Vendor Dashboard...</div>}>
                  <VendorDashboardPage />
                </Suspense>
              } />

              {/* --- ADMIN ROUTES --- */}
              <Route path="/admin/vendors" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Vendors...</div>}>
                  <AdminVendorsPage />
                </Suspense>
              } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;