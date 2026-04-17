import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  LayoutDashboard, CreditCard, Users, Plus, Activity, 
  TrendingUp, Server, Calendar, ArrowRight, Wallet, 
  Clock, CheckCircle, Briefcase, Shield, Settings, UserCheck, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../components/SkeletonLoader';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);     // For Everyone: List of Events
  const [vendorDashboard, setVendorDashboard] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);

  // Fetch Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // --- VENDOR DASHBOARD FETCH ---
        if (user?.role === 'VENDOR') {
          const res = await api.get('/vendors/dashboard');
          setVendorDashboard(res.data.data);
          setLoading(false);
          return;
        }

        // 1. Fetch Users
        const usersRes = await api.get('/users');
        setUsers(usersRes.data.data || []);

        // --- FETCH VENDOR STATS FOR ADMIN ---
        if (user?.role === 'SUPER_ADMIN') {
          try {
            const vStatsRes = await api.get('/admin/vendors/stats');
            setVendorStats(vStatsRes.data.data);
          } catch (vErr) {
            console.error("Failed to fetch vendor stats", vErr);
          }
        }

        // 2. Fetch Events List
        const eventsRes = await api.get('/events');
        const basicEvents = eventsRes.data.data || [];

        if (basicEvents.length === 0) {
          setMyEvents([]);
          setEvents([]);
        } else {
          // 3. Fetch Full Details for each event to get contribution totals
          const fullEvents = await Promise.all(
            basicEvents.map(async (e) => {
              try {
                const detailRes = await api.get(`/events/${e.id}`);
                return detailRes.data.data;
              } catch (err) {
                return e;
              }
            })
          );
          setMyEvents(fullEvents);
          setEvents(fullEvents);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  // Calculations for Admin Dashboard
  const calculateTotals = (eventList) => {
    let totalPledged = 0;
    let totalCollected = 0;
    let totalGuests = 0;
    let totalContributors = 0;

    eventList.forEach(event => {
      totalGuests += event.guests?.length || 0;
      if (event.guests) {
        event.guests.forEach(guest => {
          if (guest.pledge) {
            totalContributors++;
            totalPledged += parseFloat(guest.pledge.amount || 0);
            totalCollected += parseFloat(guest.pledge.paid_amount || 0);
          }
        });
      }
    });

    return { totalGuests, totalPledged, totalCollected, totalContributors };
  };

  const stats = calculateTotals(myEvents);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- VENDOR DASHBOARD COMPONENT ---
  const VendorDashboardView = ({ data }) => {
    if (!data) return null;
    const { profile, wallet } = data;
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Status</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle size={20}/></div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${profile.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                        {profile.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">Vendor Verification</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Earnings</h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.total_earnings)}</p>
                    <p className="text-xs text-slate-400 mt-2">Lifetime Revenue</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending</h3>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock size={20}/></div>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(wallet.pending_balance)}</p>
                    <p className="text-xs text-slate-400 mt-2">Held until completion</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Available</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CreditCard size={20}/></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.available_balance)}</p>
                    <p className="text-xs text-slate-400 mt-2">Ready for withdrawal</p>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* --- 1. VENDOR VIEW --- */}
        {user?.role === 'VENDOR' && (
          <VendorDashboardView data={vendorDashboard} />
        )}

        {/* ========================================= */}
        {/* 2. SUPER ADMIN DASHBOARD (SYSTEM WIDE) */}
        {/* ========================================= */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <SkeletonCard count={4} />
              ) : (
                <>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Registered Hosts</h3>
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                    <p className="text-xs text-slate-400 mt-2">Active Accounts</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Vendors</h3>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{vendorStats?.vendors?.total || 0}</p>
                    <p className="text-xs text-slate-400 mt-2">{vendorStats?.vendors?.pending || 0} Pending Verification</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Scheduled Events</h3>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{events.length}</p>
                    <p className="text-xs text-slate-400 mt-2">Active Across Platform</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Collected</h3>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalCollected)}</p>
                    <p className="text-xs text-slate-400 mt-2">Platform-wide Contributions</p>
                  </div>
                </>
              )}
            </div>

            {/* Financial Overview Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Active Events Summary</h3>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Event Name</th>
                        <th className="px-6 py-4">Target</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                         <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">Loading events...</td></tr>
                      ) : myEvents.length === 0 ? (
                         <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">No active events found.</td></tr>
                      ) : myEvents.slice(0, 5).map(event => (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{event.event_name}</p>
                            <p className="text-xs text-slate-400">{formatDate(event.event_date)} • {event.event_type}</p>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(event.target_budget)}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => navigate(`/events/${event.id}`)}
                              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              <ArrowRight size={18}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vendor Compliance Widget */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-brand-600" /> Vendor Compliance Health
                </h3>
                
                {loading ? (
                   <div className="space-y-4">
                      <div className="h-16 bg-slate-50 animate-pulse rounded-lg"></div>
                      <div className="h-16 bg-slate-50 animate-pulse rounded-lg"></div>
                   </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Verified Vendors</span>
                        <CheckCircle size={16} className="text-emerald-500" />
                      </div>
                      <p className="text-2xl font-black text-emerald-700">{vendorStats?.vendors?.active || 0}</p>
                      <p className="text-[10px] text-emerald-600/70 mt-1 font-medium italic">Approved and active on platform</p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Review</span>
                        <Clock size={16} className="text-amber-500" />
                      </div>
                      <p className="text-2xl font-black text-amber-700">{vendorStats?.vendors?.pending || 0}</p>
                      <p className="text-[10px] text-amber-600/70 mt-1 font-medium italic">Require administrator attention</p>
                    </div>

                    <button 
                      onClick={() => navigate('/vendors')}
                      className="w-full mt-auto py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      Manage All Vendors <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

    </div>
  );
};

export default DashboardPage;
