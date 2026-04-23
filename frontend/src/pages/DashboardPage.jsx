import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { 
  LayoutDashboard, CreditCard, Users, Plus, Activity, 
  TrendingUp, Server, Calendar, ArrowRight, Wallet, 
  Clock, CheckCircle, Briefcase, Shield, Settings, UserCheck, X,
  MapPin, Phone, Calculator, ScanLine
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../components/SkeletonLoader';

// --- SHARED UTILITIES ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount || 0);
const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorDashboard, setVendorDashboard] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);

  
  // --- ROLE DETECTION ---
  // If the user has committee memberships, we find the highest role among them
  const committeeProfile = useMemo(() => {
    if (!user?.committee_memberships || user.committee_memberships.length === 0) return null;
    
    // Priority: CHAIRPERSON > TREASURER > SECRETARY > COORDINATOR > MEMBER
    const roles = user.committee_memberships.map(m => m.committee_role);
    if (roles.includes('CHAIRPERSON')) return { role: 'CHAIRPERSON', label: 'Chairperson' };
    if (roles.includes('TREASURER')) return { role: 'TREASURER', label: 'Treasurer' };
    if (roles.includes('SECRETARY')) return { role: 'SECRETARY', label: 'Secretary' };
    if (roles.includes('COORDINATOR')) return { role: 'COORDINATOR', label: 'Coordinator' };
    if (roles.includes('GATE_OFFICER')) return { role: 'GATE_OFFICER', label: 'Gate Officer' };
    return { role: 'MEMBER', label: 'Committee Member' };
  }, [user]);

  // Calculations Helper (Unified for Platform)
  const calculateTotals = useCallback((eventList) => {
    let totalPledged = 0;
    let totalCollected = 0;
    let totalGuests = 0;
    let totalContributors = 0;
    let pendingActions = 0;

    eventList.forEach(event => {
      const contacts = event.contacts || [];
      totalGuests += contacts.length;
      
      contacts.forEach(contact => {
        if (contact.pledge) {
          totalContributors++;
          totalPledged += parseFloat(contact.pledge.pledge_amount || 0);
          totalCollected += parseFloat(contact.pledge.amount_paid || 0);
        }
      });

      if (event.vendors) {
          event.vendors.forEach(v => {
              if (v.status === 'QUOTED') pendingActions++;
          });
      }
    });

    return { totalGuests, totalPledged, totalCollected, totalContributors, pendingActions };
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. VENDOR DASHBOARD
        if (user?.role === 'VENDOR') {
          const res = await api.get('/vendors/dashboard');
          setVendorDashboard(res.data.data);
          setLoading(false);
          return;
        }

        // 2. ADMIN STATS
        if (user?.role === 'SUPER_ADMIN') {
          const usersRes = await api.get('/users');
          setUsers(usersRes.data.data || []);
          try {
            const vStatsRes = await api.get('/admin/vendors/stats');
            setVendorStats(vStatsRes.data.data);
          } catch (vErr) { console.error("Vendor stats error:", vErr); }
        }

        // 3. EVENTS (HOST & ADMIN & COMMITTEE)
        const eventsRes = await api.get('/events');
        const basicEvents = eventsRes.data.data || [];

        if (basicEvents.length === 0) {
          setMyEvents([]);
        } else {
          // Fetch details for first 5 events to show budget progress on dashboard
          const detailedEvents = await Promise.all(
            basicEvents.slice(0, 5).map(async (e) => {
              try {
                const detailRes = await api.get(`/events/${e.id}`);
                return detailRes.data.data;
              } catch { return e; }
            })
          );
          setMyEvents([...detailedEvents, ...basicEvents.slice(5)]);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  const stats = useMemo(() => calculateTotals(myEvents), [myEvents, calculateTotals]);

  // --- SUB-COMPONENTS ---

  const StatCard = ({ label, value, icon: Icon, color, sub, isCurrency, loading }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</h3>
            <div className={`p-2 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 rounded-lg`}><Icon size={20}/></div>
        </div>
        {loading ? (
          <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-24 animate-pulse"></div>
        ) : (
          <p className={`text-2xl font-bold text-slate-900 dark:text-white ${!isCurrency ? 'text-3xl' : ''}`}>{value}</p>
        )}
        {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );

  const HostEventRow = ({ event }) => {
    const eventStats = calculateTotals([event]);
    const targetBudget = parseFloat(event.target_budget) || 1;
    const progress = (eventStats.totalCollected / targetBudget) * 100;

    return (
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td className="px-6 py-4">
          <p className="font-bold text-slate-900 dark:text-white">{event.event_name}</p>
          <p className="text-xs text-slate-400">{formatDate(event.event_date)}</p>
        </td>
        <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{formatCurrency(event.target_budget)}</td>
        <td className="px-6 py-4">
           <div className="flex items-center justify-center gap-2">
              <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-brand-600 h-full rounded-full" style={{ width: `${Math.min(100, progress)}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{progress.toFixed(0)}%</span>
           </div>
        </td>
        <td className="px-6 py-4 text-right">
           <button onClick={() => navigate(`/events/${event.id}`)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand-600 rounded-lg transition-all"><ArrowRight size={18} /></button>
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* 1. VENDOR VIEW */}
        {user?.role === 'VENDOR' && vendorDashboard && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><CheckCircle size={20}/></div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${vendorDashboard.profile.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                        {vendorDashboard.profile.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">Account Verification</p>
                </div>
                <StatCard label="Earnings" value={formatCurrency(vendorDashboard.wallet.total_earnings)} icon={Wallet} color="emerald" sub="Lifetime Revenue" isCurrency />
                <StatCard label="Pending" value={formatCurrency(vendorDashboard.wallet.pending_balance)} icon={Clock} color="orange" sub="Held for milestones" isCurrency />
                <StatCard label="Available" value={formatCurrency(vendorDashboard.wallet.available_balance)} icon={CreditCard} color="purple" sub="Ready for withdrawal" isCurrency />
             </div>
          </div>
        )}

        {/* 2. SUPER ADMIN VIEW */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? <SkeletonCard count={4} /> : (
                <>
                  <StatCard label="Registered Hosts" value={users.length} icon={Users} color="purple" sub="Active Accounts" />
                  <StatCard label="Total Vendors" value={vendorStats?.vendors?.total || 0} icon={Briefcase} color="blue" sub={`${vendorStats?.vendors?.pending || 0} Pending Verification`} />
                  <StatCard label="Scheduled Events" value={myEvents.length} icon={Activity} color="amber" sub="Active Across Platform" />
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Collected</h3>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Wallet size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalCollected)}</p>
                    <p className="text-xs text-slate-400 mt-2">Platform-wide Contributions</p>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Active Events Summary</h3></div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500 dark:text-slate-400"><tr><th className="px-6 py-4">Event Name</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (<tr><td colSpan="2" className="px-6 py-12 text-center text-slate-400">Loading events...</td></tr>) : myEvents.length === 0 ? (<tr><td colSpan="2" className="px-6 py-12 text-center text-slate-400">No active events found.</td></tr>) : myEvents.slice(0, 5).map(event => (
                        <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4"><p className="font-bold text-slate-900 dark:text-white">{event.event_name}</p><p className="text-xs text-slate-400">{formatDate(event.event_date)} • {event.event_type}</p></td>
                          <td className="px-6 py-4 text-right"><button onClick={() => navigate(`/events/${event.id}`)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"><ArrowRight size={18}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 flex items-center gap-2"><Shield size={18} className="text-brand-600" /> Vendor Compliance</h3>
                <div className="space-y-4 flex-1">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Verified</span><CheckCircle size={16} className="text-emerald-500" /></div>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{vendorStats?.vendors?.active || 0}</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Review</span><Clock size={16} className="text-amber-500" /></div>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{vendorStats?.vendors?.pending || 0}</p>
                  </div>
                  <button onClick={() => navigate('/admin/vendors')} className="w-full mt-auto py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2">Manage All Vendors <ArrowRight size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. HOST VIEW */}
        {user?.role === 'HOST' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Planning Dashboard</h2><p className="text-slate-500 dark:text-slate-400 mt-1">Hello, {user?.first_name}. Track your wedding progress here.</p></div>
              <button onClick={() => navigate('/events')} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-brand-500/20"><Plus size={18}/> Plan New Event</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading || !stats ? <SkeletonCard count={4} /> : (
                <>
                  <StatCard label="My Events" value={myEvents.length} icon={Activity} color="purple" sub="Active Celebrations" />
                  <StatCard label="Total Pledged" value={formatCurrency(stats.totalPledged)} icon={TrendingUp} color="blue" sub={`From ${stats.totalContributors} contributors`} isCurrency />
                  <StatCard label="Money Raised" value={formatCurrency(stats.totalCollected)} icon={Wallet} color="emerald" sub="In your event wallet" isCurrency />
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendor Actions</h3>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg"><Briefcase size={20}/></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.pendingActions}</p>
                    <p className="text-xs text-slate-400 mt-2">New quotes to review</p>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Events Overview</h3><button onClick={() => navigate('/events')} className="text-brand-600 dark:text-brand-400 text-sm font-bold flex items-center gap-1 hover:underline">Manage All <ArrowRight size={14}/></button></div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800"><tr><th className="px-6 py-4">Event</th><th className="px-6 py-4 text-center">Budget Target</th><th className="px-6 py-4 text-center">Progress</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (<tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">Loading your events...</td></tr>) : myEvents.length === 0 ? (<tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">No events yet. <button onClick={() => navigate('/events')} className="text-brand-600 font-bold underline">Create your first one</button></td></tr>) : myEvents.slice(0, 5).map(event => (
                        <HostEventRow key={event.id} event={event} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <h3 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">Quick Shortcuts</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => navigate('/vendors')} className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-xl hover:bg-brand-100 transition-colors font-bold text-sm text-left group"><Briefcase size={20} className="group-hover:scale-110 transition-transform" /> Browse Vendors</button>
                  <button onClick={() => navigate('/events')} className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors font-bold text-sm text-left group"><Plus size={20} className="group-hover:scale-110 transition-transform" /> Manage Events</button>
                  <button onClick={() => navigate('/profile')} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm text-left group"><UserCheck size={20} className="group-hover:scale-110 transition-transform" /> My Profile</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. COMMITTEE VIEWS (FIXED TO PREVENT DOUBLE DASHBOARD FOR HOSTS) */}
        {committeeProfile && (user?.role === 'COMMITTEE_MEMBER' || user?.role === 'GATE_OFFICER') && (
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Committee Hub</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Logged in as <span className="text-brand-600 font-bold">{committeeProfile.label}</span>. Manage your assigned tasks here.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <>
                    <StatCard label="Assigned Guests" value={stats.totalGuests} icon={Users} color="purple" loading={loading} />
                    
                    {/* ONLY SHOW BUDGET DATA TO TREASURERS OR CHAIRPERSONS */}
                    {(committeeProfile.role === 'TREASURER' || committeeProfile.role === 'CHAIRPERSON') && (
                      <>
                        <StatCard label="Total Pledged" value={formatCurrency(stats.totalPledged)} icon={TrendingUp} color="blue" isCurrency loading={loading} />
                        <StatCard label="Money Collected" value={formatCurrency(stats.totalCollected)} icon={Wallet} color="emerald" isCurrency loading={loading} />
                      </>
                    )}

                    {/* GATE OFFICER SPECIFIC WIDGET */}
                    {(committeeProfile.role === 'GATE_OFFICER') && (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verification</h3>
                          <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg"><ScanLine size={20}/></div>
                        </div>
                        {loading ? <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-24 animate-pulse"></div> : <p className="text-3xl font-bold text-slate-900 dark:text-white">Active</p>}
                        <p className="text-xs text-slate-400 mt-2">QR Scanner Ready</p>
                      </div>
                    )}

                    <StatCard label="My Events" value={myEvents.length} icon={Calendar} color="indigo" sub="Your Assignments" loading={loading} />
                  </>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white">Assigned Events Overview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Event</th>
                        <th className="px-6 py-4 text-center">Role</th>
                        <th className="px-6 py-4 text-center">Collection</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        [...Array(3)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-2"></div><div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-16"></div></td>
                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-12 mx-auto"></div></td>
                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
                            <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-slate-50 dark:bg-slate-800 rounded-lg ml-auto"></div></td>
                          </tr>
                        ))
                      ) : myEvents.length === 0 ? (<tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">No assigned events.</td></tr>) : myEvents.map(event => (
                        <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900 dark:text-white">{event.event_name}</p>
                            <p className="text-xs text-slate-500">{formatDate(event.event_date)}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">
                             <span className="px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded text-[10px] font-black uppercase tracking-widest">
                                {event.committee?.find(m => m.user_id === user.id)?.committee_role || 'MEMBER'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600">
                             {(committeeProfile.role === 'TREASURER' || committeeProfile.role === 'CHAIRPERSON') ? formatCurrency(calculateTotals([event]).totalCollected) : '---'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => navigate(`/events/${event.id}`)} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg transition-all"><ArrowRight size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
        )}
    </div>
  );
};

export default DashboardPage;
