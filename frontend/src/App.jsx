import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext'; // <--- IMPORT THIS
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';

// --- OPTIMIZATION: LAZY LOADING ---
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const EventsPage = React.lazy(() => import('./pages/EventsPage'));
const EventDetailsPage = React.lazy(() => import('./pages/EventDetailsPage'));

function App() {
  return (
    // <--- WRAP EVERYTHING IN THEMEPROVIDER HERE
    <ThemeProvider> 
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route path="/" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Dashboard...</div>}>
                  <DashboardPage />
                </Suspense>
              } />
              <Route path="/dashboard" element={
                <Suspense fallback={<div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading Dashboard...</div>}>
                  <DashboardPage />
                </Suspense>
              } />
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
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;