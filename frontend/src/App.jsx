import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import EventsPage from './pages/EventsPage';      // <--- IMPORT
import EventDetailsPage from './pages/EventDetailsPage'; // <--- IMPORT

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes wrapped in Dashboard Layout */}
          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetailsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


