import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  LayoutDashboard, CreditCard, Users, Plus, Activity, 
  TrendingUp, Server, Calendar, ArrowRight, Phone, 
  CheckCircle, Clock, MapPin, Wallet, Calculator, ScanLine,
  UserCheck, Settings, Briefcase, FileText, Loader2, Shield
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [users, setUsers] = useState([]);     // For Admin: List of Hosts
  const [events, setEvents] = useState([]);     // For Everyone: List of Events
  const [vendorDashboard, setVendorDashboard] = useState(null);

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

        // 2. Fetch Events List
        const eventsRes = await api.get('/events');
        const basicEvents = eventsRes.data.data || [];

        if (basicEvents.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }

        // 3. Fetch Details for accurate numbers
        setLoadingDetails(true);
        
        const detailPromises = basicEvents.map(event => api.get(`/events/${event.id}`));
        const detailResponses = await Promise.all(detailPromises);
        
        const enrichedEvents = detailResponses.map(res => res.data.data);
        setEvents(enrichedEvents);
        
        setLoadingDetails(false);

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
        setLoadingDetails(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  // --- HELPER: CALCULATE REAL DATA ---
  const myEvents = events; 

  const calculateTotals = (eventList) => {
    let totalGuests = 0;
    let totalPledged = 0;
    let totalCollected = 0;
    let totalContributors = 0; 

    eventList.forEach(ev => {
      const guests = ev.contacts?.length || 0; 
      totalGuests += guests;

      if (ev.contacts) {
        ev.contacts.forEach(contact => {
          if (contact.pledge) {
            totalContributors++;
            totalPledged += parseFloat(contact.pledge.pledge_amount || 0);
            totalCollected += parseFloat(contact.pledge.amount_paid || 0);
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
                        <div className="p-2 bg-brand-50 text-brand-600 rounded-lg"><CreditCard size={20}/></div>
                    </div>
                    <p className="text-2xl font-bold text-brand-600">{formatCurrency(wallet.available_balance)}</p>
                    <p className="text-xs text-slate-400 mt-2">Ready for withdrawal</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-8 text-white shadow-xl shadow-brand-900/20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Welcome, {profile.business_name}!</h3>
                        <p className="text-brand-100 max-w-lg text-sm">Manage your inquiries, bookings, and financial tracking all in one place. Your professionalism is what makes HarusiYangu great.</p>
                    </div>
                    <div className="flex gap-4">
                        <a href="/vendor/profile" className="bg-white text-brand-700 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition-colors">Manage Profile</a>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
        <p className="text-slate-600 font-medium">Loading Dashboard Data...</p>
    </div>
  );

  return (
    <div className="space-y-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {user?.role === 'SUPER_ADMIN' ? 'Platform Overview' : 
             user?.role === 'TREASURER' ? 'Financial Dashboard' :
             user?.role === 'SECRETARY' ? 'Guest Management Dashboard' :
             user?.role === 'GATE_OFFICER' ? 'Scanner Access' : 
             user?.role === 'VENDOR' ? 'Vendor Dashboard' : 'My Dashboard'}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'SUPER_ADMIN' 
              ? 'Monitor platform performance and host activities.' 
              : user?.role === 'TREASURER'
              ? 'Track pledges, payments, and budget utilization.'
              : user?.role === 'SECRETARY'
              ? 'Manage guest lists, RSVPs, and invitations.'
              : user?.role === 'VENDOR'
              ? 'Manage your business, inquiries and earnings.'
              : `Welcome back, ${user?.first_name || 'User'}. Manage your assigned events.`}
          </p>
        </div>

        {/* ========================================= */}
        {/* 0. VENDOR DASHBOARD */}
        {/* ========================================= */}
        {user?.role === 'VENDOR' && <VendorDashboardView data={vendorDashboard} />}

        {/* ========================================= */}
        {/* 1. SUPER ADMIN DASHBOARD (SYSTEM WIDE) */}
        {/* ========================================= */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Registered Hosts</h3>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                <p className="text-xs text-slate-400 mt-2">Active Accounts</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Events</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{events.length}</p>
                <p className="text-xs text-slate-400 mt-2">Scheduled Events</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Collected</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Platform-wide Contributions</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Recent Active Events</h3>
                <a href="/events" className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight size={14}/></a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Event Name</th>
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Budget</th>
                      <th className="px-6 py-4">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.slice(0, 5).map(event => (
                      <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{event.event_name}</td>
                        <td className="px-6 py-4 text-slate-600">{event.owner?.full_name || 'System'}</td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(event.event_date)}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(event.target_budget)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${(calculateTotals([event]).totalCollected / calculateTotals([event]).totalPledged * 100) || 0}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {((calculateTotals([event]).totalCollected / calculateTotals([event]).totalPledged * 100) || 0).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* 2. HOST / COMMITTEE DASHBOARD */}
        {/* ========================================= */}
        {user?.role !== 'SUPER_ADMIN' && user?.role !== 'VENDOR' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">My Guests</h3>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalGuests}</p>
                <p className="text-xs text-slate-400 mt-2">Across {myEvents.length} events</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pledged</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalPledged)}</p>
                <p className="text-xs text-slate-400 mt-2">Total Commitments</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Collected</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Confirmed Payments</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Remaining</h3>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.totalPledged - stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Outstanding Pledges</p>
              </div>
            </div>

            {/* Financial Overview Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Active Events Summary</h3>
                  <button onClick={() => navigate('/events')} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowRight size={14}/></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Event Name</th>
                        <th className="px-6 py-4">Target</th>
                        <th className="px-6 py-4">Progress</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myEvents.map(event => (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{event.event_name}</p>
                            <p className="text-xs text-slate-400">{formatDate(event.event_date)} ΓÇó {event.event_type}</p>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(event.target_budget)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${(calculateTotals([event]).totalCollected / calculateTotals([event]).totalPledged * 100) || 0}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {((calculateTotals([event]).totalCollected / calculateTotals([event]).totalPledged * 100) || 0).toFixed(0)}%
                              </span>
                            </div>
                          </td>
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

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => navigate('/events')} className="flex items-center gap-3 p-4 bg-brand-50 text-brand-700 rounded-xl hover:bg-brand-100 transition-colors font-bold text-sm">
                    <Plus size={20}/> Create New Event
                  </button>
                  <button onClick={() => navigate('/profile')} className="flex items-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm">
                    <UserCheck size={20}/> Update My Profile
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm">
                    <Settings size={20}/> Account Settings
                  </button>
                </div>

                <div className="bg-brand-600 rounded-xl p-6 text-white shadow-lg shadow-brand-900/20">
                  <h4 className="font-bold mb-1">Help Center</h4>
                  <p className="text-xs text-brand-100 mb-4">Need assistance managing your event? Our support is 24/7.</p>
                  <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">Contact Support</button>
                </div>
              </div>

            </div>

          </div>
        )}

    </div>
  );
};

export default DashboardPage;
