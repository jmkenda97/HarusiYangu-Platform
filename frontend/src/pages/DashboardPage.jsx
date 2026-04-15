import React, { useEffect, useState, useMemo } from 'react'; 
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  LayoutDashboard, CreditCard, Users, Plus, Activity, 
  TrendingUp, Server, Calendar, ArrowRight, Phone, 
  CheckCircle, Clock, MapPin, Wallet, Calculator, ScanLine,
  UserCheck, Settings, Briefcase, FileText, Loader2, Store,
  Building2, Package, FileCheck, FileX, Shield
} from 'lucide-react';
import { SkeletonCard, SkeletonTable, PageLoader } from '../components/SkeletonLoader';


// --- OPTIMIZATION: MEMOIZED COMPONENTS ---
// We extract the table rows and cards into separate components and wrap them in React.memo.
// This prevents React from re-rendering the entire list if only one item changes or if the parent re-renders.

const SuperAdminHostRow = React.memo(({ host, events, formatCurrency }) => {
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
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                        {host.first_name?.[0]}{host.last_name?.[0]}
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">{host.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Phone size={10} /> {host.phone}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center font-medium text-slate-900 dark:text-white">{hostEvents.length}</td>
            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{hostGuests}</td>
            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">{hostContributors}</td>
            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{formatCurrency(hostPledges)}</td>
            <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(hostPaid)}</td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${host.status === 'ACTIVE' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${host.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                    {host.status}
                </span>
            </td>
        </tr>
    );
});

const HostEventCard = React.memo(({ event, formatCurrency, formatDate }) => {
    const eventGuests = event.contacts?.length || 0;
    const eventContributors = event.contacts?.filter(c => c.pledge).length || 0;
    const eventPledged = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
    const eventCollected = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
    
    const daysLeft = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
    const targetBudget = parseFloat(event.target_budget) || 0;
    const progressPercent = targetBudget > 0 ? Math.round((eventCollected / targetBudget) * 100) : 0;

    return (
        <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 md:w-1/4">
                    <div className="h-12 w-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex flex-col items-center justify-center font-bold text-brand-700 dark:text-brand-300 shrink-0">
                        <span className="text-lg leading-none">{new Date(event.event_date).getDate()}</span>
                        <span className="text-[10px] uppercase leading-none">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.event_name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {event.venue_name || 'TBD'}</span>
                            <span className={`flex items-center gap-1 font-medium ${daysLeft < 7 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                <Clock size={14} /> {daysLeft > 0 ? `${daysLeft} days left` : 'Past Event'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 md:w-2/4 w-full">
                    <div className="text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Guests</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{eventGuests}</p>
                    </div>
                    <div className="text-center border-l border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Contributors</p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{eventContributors}</p>
                    </div>
                    <div className="text-center border-l border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Pledged</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(eventPledged)}</p>
                    </div>
                    <div className="text-center border-l border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">Collected</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(eventCollected)}</p>
                    </div>
                </div>

                <div className="md:w-1/4 flex md:justify-end">
                    <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors w-full md:w-auto flex items-center justify-center gap-2">
                        Manage Event <ArrowRight size={14} />
                    </button>
                </div>
            </div>
            
            {targetBudget > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400">Budget Progress</span>
                        <span className={`font-bold ${progressPercent >= 100 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
                    </div>
                    {progressPercent >= 100 && <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-medium">Target Exceeded!</p>}
                </div>
            )}
        </div>
    );
});

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [vendorStats, setVendorStats] = useState({ total: 0, pending: 0, active: 0, blacklisted: 0 });

  // Fetch Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel for speed
        const [usersRes, eventsRes] = await Promise.all([
          api.get('/users'),
          api.get('/events')
        ]);
        
        const usersData = usersRes.data.data || [];
        const basicEvents = eventsRes.data.data || [];
        
        setUsers(usersData);
        
        // If no events, set empty and finish loading
        if (basicEvents.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }

        // Fetch vendor stats for SUPER_ADMIN (in parallel with event details)
        let vendorStatsData = { total: 0, pending: 0, active: 0, blacklisted: 0 };
        if (user?.role === 'SUPER_ADMIN') {
          try {
            const vendorsRes = await api.get('/admin/vendors');
            const vendors = vendorsRes.data.data || [];
            vendorStatsData = {
              total: vendors.length,
              pending: vendors.filter(v => v.status === 'PENDING_APPROVAL').length,
              active: vendors.filter(v => v.status === 'ACTIVE').length,
              blacklisted: vendors.filter(v => v.status === 'BLACKLISTED').length
            };
          } catch (err) {
            console.error("Failed to load vendor stats", err);
          }
        }

        // Fetch event details in parallel
        setLoadingDetails(true);
        const detailPromises = basicEvents.map(event => api.get(`/events/${event.id}`));
        const detailResponses = await Promise.allSettled(detailPromises);
        
        // Filter successful responses
        const enrichedEvents = detailResponses
          .filter(res => res.status === 'fulfilled')
          .map(res => res.value.data.data);
        
        setEvents(enrichedEvents);
        setVendorStats(vendorStatsData);
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

  // --- OPTIMIZATION: USE MEMO ---
  // We cache the results of these calculations so they don't run on every single render.
  const myEvents = events; 

  const stats = useMemo(() => {
    let totalGuests = 0;
    let totalPledged = 0;
    let totalCollected = 0;
    let totalContributors = 0; 

    myEvents.forEach(ev => {
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
  }, [myEvents]);

  const formatDate = (dateString) => {
      if (!dateString) return 'TBD';
      return new Date(dateString).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    // Show skeleton loaders based on user role
    if (user?.role === 'SUPER_ADMIN') {
      return (
        <div className="space-y-6">
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
          </div>
          <SkeletonTable rows={5} />
        </div>
      );
    }
    
    return <PageLoader message="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-6">
        {/* --- HEADER SECTION --- */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {user?.role === 'SUPER_ADMIN' ? 'Platform Overview' : 
             user?.role === 'TREASURER' ? 'Financial Dashboard' :
             user?.role === 'SECRETARY' ? 'Guest Management Dashboard' :
             user?.role === 'GATE_OFFICER' ? 'Scanner Access' : 'My Dashboard'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
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
              {[
                { label: 'Registered Hosts', val: users.length, icon: Users, color: 'purple' },
                { label: 'Total Events', val: events.length, icon: Activity, color: 'blue' },
                { label: 'Total Guests', val: stats.totalGuests, icon: UserCheck, color: 'emerald' },
                { label: 'Total Contributors', val: stats.totalContributors, icon: CreditCard, color: 'indigo' },
                { label: 'Platform Pledges', val: formatCurrency(stats.totalPledged), icon: TrendingUp, color: 'orange', isCurrency: true },
                { label: 'Platform Paid', val: formatCurrency(stats.totalCollected), icon: Wallet, color: 'green', isCurrency: true }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.label}</h3>
                    <div className={`p-2 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-lg`}>
                        <stat.icon size={20}/>
                    </div>
                  </div>
                  <p className={`text-3xl font-bold text-slate-900 dark:text-white ${stat.isCurrency ? 'text-2xl' : ''}`}>{stat.val}</p>
                  <p className="text-xs text-slate-400 mt-2">{idx === 0 ? 'Active Accounts' : idx === 1 ? 'Scheduled Events' : ''}</p>
                </div>
              ))}
            </div>

            {/* Vendor Management Stats */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vendor Management</h3>
                <button 
                  onClick={() => window.location.href='/admin/vendors'}
                  className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 flex items-center gap-1"
                >
                  Manage Vendors <ArrowRight size={14} />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Store size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Vendors</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{vendorStats.total}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{vendorStats.pending}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{vendorStats.active}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-red-600 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase">Blacklisted</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{vendorStats.blacklisted}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Host Directory</h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">Total: {users.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Host Info</th>
                      <th className="px-6 py-4 text-center">Events</th>
                      <th className="px-6 py-4 text-center">Guests</th>
                      <th className="px-6 py-4 text-center">Contributors</th>
                      <th className="px-6 py-4 text-center">Pledged</th>
                      <th className="px-6 py-4 text-center">Paid</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map(host => (
                        <SuperAdminHostRow key={host.id} host={host} events={events} formatCurrency={formatCurrency} />
                    ))}
                    {users.length === 0 && (
                        <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No hosts registered yet.</td></tr>
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
              {[
                { label: 'Total Budget', val: formatCurrency(myEvents.reduce((sum, e) => sum + (parseFloat(e.target_budget) || 0), 0)), icon: Activity, color: 'blue', isCurrency: true },
                { label: 'Total Guests', val: stats.totalGuests, icon: Users, color: 'purple' },
                { label: 'Contributors', val: stats.totalContributors, icon: CreditCard, color: 'indigo' },
                { label: 'Money Raised', val: formatCurrency(stats.totalCollected), icon: Wallet, color: 'emerald', isCurrency: true, sub: `of ${formatCurrency(stats.totalPledged)} Pledged` }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.label}</h3>
                    <div className={`p-2 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-lg`}>
                        <stat.icon size={20}/>
                    </div>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold text-slate-900 dark:text-white ${stat.isCurrency ? '' : 'text-3xl'}`}>{stat.val}</p>
                    {stat.sub && <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {myEvents.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Events</h3>
                    <button onClick={() => window.location.href='/events'} className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 flex items-center gap-1">
                      Manage All <ArrowRight size={14} />
                    </button>
                  </div>
                  <div>
                    {myEvents.slice(0, 5).map(event => (
                        <HostEventCard key={event.id} event={event} formatCurrency={formatCurrency} formatDate={formatDate} />
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
              {[
                { label: 'Total Pledged', val: formatCurrency(stats.totalPledged), icon: Activity, color: 'blue', isCurrency: true },
                { label: 'Total Paid', val: formatCurrency(stats.totalCollected), icon: Wallet, color: 'emerald', isCurrency: true },
                { label: 'Outstanding', val: formatCurrency(stats.totalPledged - stats.totalCollected), icon: TrendingUp, color: 'red', isCurrency: true },
                { label: 'Contributors', val: stats.totalContributors, icon: CreditCard, color: 'indigo' }
              ].map((stat, idx) => (
                 <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.label}</h3>
                      <div className={`p-2 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-lg`}>
                          <stat.icon size={20}/>
                      </div>
                    </div>
                    <p className={`text-3xl font-bold ${stat.color === 'red' ? 'text-red-600 dark:text-red-400' : stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{stat.val}</p>
                    <p className="text-xs text-slate-400 mt-2">{idx === 0 ? 'Commitments from guests' : idx === 1 ? 'Paid to date' : idx === 2 ? 'Balance to collect' : 'Active pledges'}</p>
                  </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Events Financials</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myEvents.map((event) => {
                        const eventPledged = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
                        const eventCollected = event.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
                        const eventContributors = event.contacts?.filter(c => c.pledge).length || 0;
                        return (
                            <div key={event.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <Calculator className="text-slate-400 dark:text-slate-500" size={24} />
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{event.event_name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.event_date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Contributors</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{eventContributors}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Pledged</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(eventPledged)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Collected</p>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(eventCollected)}</p>
                                    </div>
                                    <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-900/40">
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
                {[
                    { label: 'Total Guests', val: stats.totalGuests, icon: Users, color: 'purple' },
                    { label: 'Contributors', val: stats.totalContributors, icon: CreditCard, color: 'indigo' },
                    { label: 'Upcoming Events', val: myEvents.length, icon: Calendar, color: 'brand' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.label}</p>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">{stat.val}</p>
                        </div>
                        <div className={`h-12 w-12 bg-${stat.color === 'brand' ? 'brand' : stat.color}-100 dark:bg-${stat.color === 'brand' ? 'brand' : stat.color}-900/20 text-${stat.color === 'brand' ? 'brand' : stat.color}-600 dark:text-${stat.color === 'brand' ? 'brand' : stat.color}-400 rounded-full flex items-center justify-center`}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Guest Lists Overview</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myEvents.map((event) => (
                        <div key={event.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <FileText className="text-slate-400 dark:text-slate-500" size={24} />
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{event.event_name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{event.venue_name || 'No Venue'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm w-full md:w-auto justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck size={16} className="text-slate-500" />
                                    <span className="font-medium text-slate-900 dark:text-white">{event.contacts?.length || 0} Guests</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-indigo-500" />
                                    <span className="font-medium text-slate-900 dark:text-white">{event.contacts?.filter(c => c.pledge).length || 0} Contributors</span>
                                </div>
                                <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded text-xs font-bold transition-colors">
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
                  {[
                      { label: 'Assigned Events', val: myEvents.length, icon: Briefcase },
                      { label: 'Total Budget', val: formatCurrency(myEvents.reduce((sum, e) => sum + (parseFloat(e.target_budget) || 0), 0)), icon: Wallet, isCurrency: true },
                      { label: 'Total Guests', val: stats.totalGuests, icon: Users }
                  ].map((stat, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.label}</h3>
                              <stat.icon className="text-slate-400 dark:text-slate-500" size={20} />
                          </div>
                          <p className={`text-3xl font-bold text-slate-900 dark:text-white ${stat.isCurrency ? 'text-2xl' : ''}`}>{stat.val}</p>
                          {idx === 0 && <p className="text-xs text-slate-400 mt-2">Events to coordinate</p>}
                      </div>
                  ))}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Events Requiring Coordination</h3>
                  <div className="space-y-4">
                      {myEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"><MapPin size={16} /></div>
                                  <div>
                                      <p className="font-bold text-slate-900 dark:text-white">{event.event_name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{event.venue_name}</p>
                                  </div>
                              </div>
                              <button onClick={() => window.location.href=`/events/${event.id}`} className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline">Vendors & Log</button>
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
                       <div key={event.id} onClick={() => window.location.href=`/events/${event.id}`} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group">
                           <div className="flex items-center justify-between mb-4">
                               <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                   <ScanLine size={24} />
                               </div>
                               <ArrowRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 transition-colors" size={20} />
                           </div>
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{event.event_name}</h4>
                           <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{formatDate(event.event_date)} • {event.venue_name}</p>
                           <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                               <Users size={14} /> {event.contacts?.length || 0} Guests Expected
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* ========================================= */}
        {/* 7. VENDOR DASHBOARD */}
        {/* ========================================= */}
        {user?.role === 'VENDOR' && <VendorDashboardSummary />}

        {/* ========================================= */}
        {/* 8. GENERIC COMMITTEE MEMBER FALLBACK */}
        {/* ========================================= */}
        {(user?.role === 'COMMITTEE_MEMBER' && user?.role !== 'TREASURER' && user?.role !== 'SECRETARY' && user?.role !== 'COORDINATOR' && user?.role !== 'GATE_OFFICER') && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Calendar className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Your Committee Assignments</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">You are assigned to {myEvents.length} events. Please visit the Events tab to view details.</p>
                <button onClick={() => window.location.href='/events'} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    Go to Events
                </button>
            </div>
        )}
    </div>
  );
};

// --- SHARED UTILITY ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);

// --- VENDOR DASHBOARD SUMMARY COMPONENT ---
const VendorDashboardSummary = React.memo(() => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchVendorData = async () => {
            try {
                const res = await api.get('/vendors/dashboard');
                setData(res.data.data);
            } catch (err) {
                console.error('Failed to fetch vendor dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchVendorData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Vendor Dashboard</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Complete your vendor profile to see your dashboard.</p>
                <button onClick={() => window.location.href='/vendor/profile'} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    Complete Profile
                </button>
            </div>
        );
    }

    const { profile, services, documents, events, financials } = data;
    const approvedDocs = documents?.filter(d => d.verification_status === 'APPROVED').length || 0;
    const pendingDocs = documents?.filter(d => d.verification_status === 'PENDING').length || 0;

    const getStatusBadge = (status) => {
        const styles = {
            PENDING_APPROVAL: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            ACTIVE: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
            INACTIVE: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            BLACKLISTED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.INACTIVE}`}>
                {status === 'ACTIVE' && <CheckCircle size={12} />}
                {status === 'PENDING_APPROVAL' && <Clock size={12} />}
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Profile Status</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Building2 size={20}/>
                        </div>
                    </div>
                    {getStatusBadge(profile?.verification_status || 'PENDING_APPROVAL')}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Services</h3>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Package size={20}/>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{services?.length || 0}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending Documents</h3>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                            <FileText size={20}/>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingDocs}</p>
                        <span className="text-xs text-slate-400">/ {documents?.length || 0} total</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Assigned Events</h3>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Calendar size={20}/>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{events?.length || 0}</p>
                </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Earnings</h3>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Wallet size={20}/>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financials?.total_earnings)}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending Balance</h3>
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                            <TrendingUp size={20}/>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(financials?.pending_balance)}</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-4">Vendor Quick Links</h3>
                <div className="flex flex-wrap gap-3">
                    <a href="/vendor/dashboard" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Building2 size={16} /> Full Dashboard
                    </a>
                    <a href="/vendor/profile" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Package size={16} /> Manage Profile
                    </a>
                </div>
            </div>
        </div>
    );
});

export default DashboardPage;