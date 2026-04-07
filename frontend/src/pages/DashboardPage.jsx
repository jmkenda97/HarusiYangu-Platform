import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  LayoutDashboard, CreditCard, Users, Plus, Activity, 
  TrendingUp, Server, Calendar, ArrowRight, Phone, 
  CheckCircle, Clock, MapPin, Wallet, Calculator, ScanLine,
  UserCheck, Settings, Briefcase, FileText, Loader2
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [users, setUsers] = useState([]);     // For Admin: List of Hosts
  const [events, setEvents] = useState([]);     // For Everyone: List of Events

  // Fetch Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

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

  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
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
             user?.role === 'GATE_OFFICER' ? 'Scanner Access' : 'My Dashboard'}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'SUPER_ADMIN' 
              ? 'Monitor platform performance and host activities.' 
              : user?.role === 'TREASURER'
              ? 'Track pledges, payments, and budget utilization.'
              : user?.role === 'SECRETARY'
              ? 'Manage guest lists, RSVPs, and invitations.'
              : `Welcome back, ${user?.first_name || 'User'}. Manage your assigned events.`}
          </p>
        </div>

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
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Guests</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalGuests}</p>
                <p className="text-xs text-slate-400 mt-2">Across all events</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Contributors</h3>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CreditCard size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalContributors}</p>
                <p className="text-xs text-slate-400 mt-2">People who pledged</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Platform Pledges</h3>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPledged)}</p>
                <p className="text-xs text-slate-400 mt-2">Total committed value</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Platform Paid</h3>
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Wallet size={20}/></div>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Money actually received</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Host Directory</h3>
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">Total: {users.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Host Info</th>
                      <th className="px-6 py-4 text-center">Events</th>
                      <th className="px-6 py-4 text-center">Guests</th>
                      <th className="px-6 py-4 text-center">Contributors</th>
                      <th className="px-6 py-4 text-center">Pledged</th>
                      <th className="px-6 py-4 text-center">Paid</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      {/* ACTION COLUMN REMOVED AS REQUESTED */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((host) => {
                        const hostEvents = events.filter(e => e.owner_user_id === host.id);
                        
                        const hostGuests = hostEvents.reduce((acc, ev) => acc + (ev.contacts?.length || 0), 0);
                        
                        let hostContributors = 0;
                        let hostPledges = 0;
                        let hostPaid = 0;

                        hostEvents.forEach(ev => {
                            if(ev.contacts) {
                                ev.contacts.forEach(c => {
                                    if(c.pledge) {
                                        hostContributors++;
                                        hostPledges += parseFloat(c.pledge.pledge_amount || 0);
                                        hostPaid += parseFloat(c.pledge.amount_paid || 0);
                                    }
                                });
                            }
                        });

                        return (
                        <tr key={host.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                        {host.first_name?.[0]}{host.last_name?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{host.full_name}</p>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Phone size={10} /> {host.phone}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-900">{hostEvents.length}</td>
                            <td className="px-6 py-4 text-center text-slate-600">{hostGuests}</td>
                            <td className="px-6 py-4 text-center text-slate-600 font-medium">{hostContributors}</td>
                            <td className="px-6 py-4 text-center text-slate-600">{formatCurrency(hostPledges)}</td>
                            <td className="px-6 py-4 text-center text-emerald-600 font-bold">{formatCurrency(hostPaid)}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${host.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${host.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                    {host.status}
                                </span>
                            </td>
                            {/* ACTION TD REMOVED AS REQUESTED */}
                        </tr>
                        );
                    })}
                    {users.length === 0 && (
                        /* ColSpan updated from 8 to 7 */
                        <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-400">No hosts registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* 2. HOST DASHBOARD (OWNER FOCUS) */}
        {/* ========================================= */}
        {user?.role === 'HOST' && (
          <div className="space-y-6">
            
            {myEvents.length === 0 && (
               <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-8 text-white shadow-lg shadow-brand-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Start Planning Your Event</h3>
                  <p className="text-brand-100 max-w-md">Create your first event to start tracking contributions, managing your guest list, and organizing your committee members.</p>
                </div>
                <button onClick={() => window.location.href='/events'} className="bg-white text-brand-700 px-6 py-3 rounded-lg font-bold hover:bg-brand-50 transition-colors flex items-center gap-2 shadow-lg">
                  <Plus size={20} /> Create Event
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Budget</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(myEvents.reduce((sum, e) => sum + (parseFloat(e.target_budget) || 0), 0))}</p>
                <p className="text-xs text-slate-400 mt-2">Target across {myEvents.length} events</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Guests</h3>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalGuests}</p>
                <p className="text-xs text-slate-400 mt-2">Invited & Registered</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Contributors</h3>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CreditCard size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalContributors}</p>
                <p className="text-xs text-slate-400 mt-2">Active Pledges</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Money Raised</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCollected)}</p>
                    <p className="text-xs text-slate-400 mt-2">Collected of {formatCurrency(stats.totalPledged)} Pledged</p>
                </div>
              </div>
            </div>

            {myEvents.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Your Events</h3>
                    <button onClick={() => window.location.href='/events'} className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
                      Manage All <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {myEvents.slice(0, 5).map((event) => (
                        (() => {
                            const eventGuests = event.contacts?.length || 0;
                            const eventContributors = event.contacts?.filter(c => c.pledge).length || 0;
                            const eventPledged = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
                            const eventCollected = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
                            
                            const daysLeft = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
                            const targetBudget = parseFloat(event.target_budget) || 0;
                            
                            // Calculate Progress Percentage
                            const progressPercent = targetBudget > 0 
                                ? Math.round((eventCollected / targetBudget) * 100) 
                                : 0;
                            
                            return (
                                <div key={event.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 md:w-1/4">
                                            <div className="h-12 w-12 rounded-lg bg-brand-50 text-brand-600 flex flex-col items-center justify-center font-bold text-brand-700 shrink-0">
                                                <span className="text-lg leading-none">{new Date(event.event_date).getDate()}</span>
                                                <span className="text-[10px] uppercase leading-none">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-slate-900">{event.event_name}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1"><MapPin size={14} /> {event.venue_name || 'TBD'}</span>
                                                    <span className={`flex items-center gap-1 font-medium ${daysLeft < 7 ? 'text-red-600' : 'text-blue-600'}`}>
                                                        <Clock size={14} /> {daysLeft > 0 ? `${daysLeft} days left` : 'Past Event'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-4 md:w-2/4 w-full">
                                            <div className="text-center">
                                                <p className="text-xs text-slate-400 uppercase">Guests</p>
                                                <p className="text-lg font-bold text-slate-900">{eventGuests}</p>
                                            </div>
                                            <div className="text-center border-l border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase">Contributors</p>
                                                <p className="text-lg font-bold text-indigo-600">{eventContributors}</p>
                                            </div>
                                            <div className="text-center border-l border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase">Pledged</p>
                                                <p className="text-sm font-bold text-slate-900">{formatCurrency(eventPledged)}</p>
                                            </div>
                                            <div className="text-center border-l border-slate-100">
                                                <p className="text-xs text-slate-400 uppercase">Collected</p>
                                                <p className="text-sm font-bold text-emerald-600">{formatCurrency(eventCollected)}</p>
                                            </div>
                                        </div>

                                        <div className="md:w-1/4 flex md:justify-end">
                                            <button 
                                                onClick={() => window.location.href=`/events/${event.id}`}
                                                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors w-full md:w-auto flex items-center justify-center gap-2"
                                            >
                                                Manage Event <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* PROGRESS BAR SECTION */}
                                    {targetBudget > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Budget Progress</span>
                                                <span className={`font-bold ${progressPercent >= 100 ? 'text-red-600' : 'text-slate-700'}`}>{progressPercent}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    // CHANGE: If >= 100% (Exceeded), turn RED
                                                    className={`h-2 rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-red-500' : 'bg-brand-500'}`} 
                                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                ></div>
                                            </div>
                                            {progressPercent >= 100 && (
                                                <p className="text-[10px] text-red-600 mt-1 font-medium">Target Exceeded!</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ))}
                  </div>
                </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* 3. TREASURER DASHBOARD (FINANCIAL FOCUS) */}
        {/* ========================================= */}
        {user?.role === 'TREASURER' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Pledged</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalPledged)}</p>
                <p className="text-xs text-slate-400 mt-2">Commitments from guests</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Paid</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Paid to date</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Outstanding</h3>
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalPledged - stats.totalCollected)}</p>
                <p className="text-xs text-slate-400 mt-2">Balance to collect</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Contributors</h3>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CreditCard size={20}/></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalContributors}</p>
                <p className="text-xs text-slate-400 mt-2">Active pledges</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Assigned Events Financials</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {myEvents.map((event) => {
                        const eventPledged = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
                        const eventCollected = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
                        const eventContributors = event.contacts?.filter(c => c.pledge).length || 0;
                        
                        return (
                            <div key={event.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <Calculator className="text-slate-400" size={24} />
                                    <div>
                                        <h4 className="font-bold text-slate-900">{event.event_name}</h4>
                                        <p className="text-xs text-slate-500">{formatDate(event.event_date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400">Contributors</p>
                                        <p className="font-bold text-slate-900">{eventContributors}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400">Pledged</p>
                                        <p className="font-bold text-slate-900">{formatCurrency(eventPledged)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400">Collected</p>
                                        <p className="font-bold text-emerald-600">{formatCurrency(eventCollected)}</p>
                                    </div>
                                    <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-100">
                                        View Budget
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* 4. SECRETARY DASHBOARD (GUEST FOCUS) */}
        {/* ========================================= */}
        {user?.role === 'SECRETARY' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase">Total Guests</p>
                        <p className="text-4xl font-bold text-slate-900">{stats.totalGuests}</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase">Contributors</p>
                        <p className="text-4xl font-bold text-slate-900">{stats.totalContributors}</p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <CreditCard size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase">Upcoming Events</p>
                        <p className="text-4xl font-bold text-brand-600">{myEvents.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Guest Lists Overview</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {myEvents.map((event) => (
                        <div key={event.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <FileText className="text-slate-400" size={24} />
                                <div>
                                    <h4 className="font-bold text-slate-900">{event.event_name}</h4>
                                    <p className="text-xs text-slate-500">{event.venue_name || 'No Venue'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm w-full md:w-auto justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck size={16} className="text-slate-500" />
                                    <span className="font-medium text-slate-900">{event.contacts?.length || 0} Guests</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-indigo-500" />
                                    <span className="font-medium text-slate-900">{event.contacts?.filter(c => c.pledge).length || 0} Contributors</span>
                                </div>
                                <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                    Manage List
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* 5. COORDINATOR DASHBOARD (VENDOR/LOGISTICS) */}
        {/* ========================================= */}
        {user?.role === 'COORDINATOR' && (
           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-500 uppercase">Assigned Events</h3>
                          <Briefcase className="text-slate-400" size={20} />
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{myEvents.length}</p>
                      <p className="text-xs text-slate-400 mt-2">Events to coordinate</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Budget</h3>
                          <Wallet className="text-slate-400" size={20} />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(myEvents.reduce((sum, e) => sum + (parseFloat(e.target_budget) || 0), 0))}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Guests</h3>
                          <Users className="text-slate-400" size={20} />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalGuests}</p>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Events Requiring Coordination</h3>
                  <div className="space-y-4">
                      {myEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded"><MapPin size={16} /></div>
                                  <div>
                                      <p className="font-bold text-slate-900">{event.event_name}</p>
                                      <p className="text-xs text-slate-500">{event.venue_name}</p>
                                  </div>
                              </div>
                              <button onClick={() => window.location.href=`/events/${event.id}`} className="text-sm text-brand-600 font-medium hover:underline">Vendors & Log</button>
                          </div>
                      ))}
                  </div>
              </div>
           </div>
        )}

        {/* ========================================= */}
        {/* 6. GATE OFFICER DASHBOARD (SCANNER) */}
        {/* ========================================= */}
        {user?.role === 'GATE_OFFICER' && (
           <div className="space-y-6">
               <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-8 text-white text-center shadow-lg">
                   <ScanLine size={48} className="mx-auto mb-4 opacity-80" />
                   <h3 className="text-2xl font-bold mb-2">Event Access Scanner</h3>
                   <p className="text-indigo-100 max-w-md mx-auto mb-6">Select an event below to access the guest list scanner and manage entry.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {myEvents.map((event) => (
                       <div key={event.id} onClick={() => window.location.href=`/events/${event.id}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group">
                           <div className="flex items-center justify-between mb-4">
                               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                   <ScanLine size={24} />
                               </div>
                               <ArrowRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" size={20} />
                           </div>
                           <h4 className="text-lg font-bold text-slate-900 mb-1">{event.event_name}</h4>
                           <p className="text-sm text-slate-500 mb-2">{formatDate(event.event_date)} • {event.venue_name}</p>
                           <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                               <Users size={14} /> {event.contacts?.length || 0} Guests Expected
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* ========================================= */}
        {/* 7. GENERIC COMMITTEE MEMBER FALLBACK */}
        {/* ========================================= */}
        {(user?.role === 'COMMITTEE_MEMBER' && user?.role !== 'TREASURER' && user?.role !== 'SECRETARY' && user?.role !== 'COORDINATOR' && user?.role !== 'GATE_OFFICER') && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Your Committee Assignments</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">You are assigned to {myEvents.length} events. Please visit the Events tab to view details.</p>
                <button onClick={() => window.location.href='/events'} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    Go to Events
                </button>
            </div>
        )}

    </div>
  );
};

export default DashboardPage;