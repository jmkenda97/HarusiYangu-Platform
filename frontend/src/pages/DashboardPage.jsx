import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react'; // <--- ADD THIS
import api from '../api/axios'; // <--- ADD THIS
import { LayoutDashboard, CreditCard, Users, Plus, Activity, TrendingUp, Server } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]); // <--- STATE TO STORE REAL USER COUNT

  // Fetch data when page loads
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch users to get the count
        const res = await api.get('/users');
        setUsers(res.data.data || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    
    if (user?.role === 'SUPER_ADMIN') {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <div className="space-y-6">
        
        {/* Welcome Section */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {user?.role === 'SUPER_ADMIN' ? 'Platform Overview' : 'My Dashboard'}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'SUPER_ADMIN' 
              ? 'Monitor system-wide statistics and user activity.' 
              : 'Manage your upcoming events and track contributions.'}
          </p>
        </div>

        {/* SUPER ADMIN VIEW */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Users</h3>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                </div>
                {/* FIX: Display real count from database */}
                <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                <p className="text-xs text-slate-400 mt-2">Registered Accounts</p>
              </div>
              
              {/* ... Other cards remain the same ... */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Events</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">0</p>
                <p className="text-xs text-slate-400 mt-2">Active across platform</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">System Revenue</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">TZS 0</p>
                <p className="text-xs text-slate-400 mt-2">All-time transactions</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">System Status</h3>
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Server size={20}/></div>
                </div>
                <p className="text-lg font-bold text-green-600">Healthy</p>
                <p className="text-xs text-slate-400 mt-2">All services operational</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Registrations</h3>
              <p className="text-slate-500 text-sm">Connect User Management API to populate this table.</p>
            </div>
          </div>
        )}

        {/* HOST VIEW (Unchanged) */}
        {user?.role === 'HOST' && (
          <div className="space-y-6">
             {/* ... (Keep your Host code exactly as is) ... */}
             <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-8 text-white shadow-lg shadow-brand-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Planning an Event?</h3>
                <p className="text-brand-100">Create your first event to start tracking contributions and managing guests.</p>
              </div>
              <button className="bg-white text-brand-700 px-6 py-3 rounded-lg font-bold hover:bg-brand-50 transition-colors flex items-center gap-2">
                <Plus size={20} /> Create Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">My Events</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">0</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Contributions</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">TZS 0</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Guest List</h3>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">0</p>
              </div>
            </div>
          </div>
        )}

    </div>
  );
};

export default DashboardPage;