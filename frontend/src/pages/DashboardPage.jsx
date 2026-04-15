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

// --- SHARED UTILITY ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { 
    style: 'currency', 
    currency: 'TZS',
    maximumFractionDigits: 0 
}).format(amount || 0);

// --- OPTIMIZATION: MEMOIZED COMPONENTS ---
const SuperAdminHostRow = React.memo(({ host, events }) => {
    const hostEvents = events.filter(e => e.owner_user_id === host.id);
    const hostPledges = hostEvents.reduce((acc, ev) => acc + (parseFloat(ev.total_pledged) || 0), 0);
    const hostPaid = hostEvents.reduce((acc, ev) => acc + (parseFloat(ev.total_collected) || 0), 0);

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                        {host.first_name?.[0]}{host.last_name?.[0]}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{host.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{host.phone}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{hostEvents.length}</td>
            <td className="px-6 py-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{formatCurrency(hostPledges)}</td>
            <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(hostPaid)}</td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${host.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {host.status}
                </span>
            </td>
        </tr>
    );
});

const HostEventCard = React.memo(({ event }) => {
    const daysLeft = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
    const collected = parseFloat(event.total_collected) || 0;
    const pledged = parseFloat(event.total_pledged) || 0;
    const progressPercent = pledged > 0 ? Math.round((collected / pledged) * 100) : 0;

    return (
        <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4 lg:w-1/3">
                    <div className="h-14 w-14 rounded-2xl bg-brand-600 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                        <span className="text-xl leading-none">{new Date(event.event_date).getDate()}</span>
                        <span className="text-[10px] uppercase leading-none mt-1">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">{event.event_name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={12} className="text-brand-500" /> {event.venue_name || 'TBD'}</span>
                            <span className={`flex items-center gap-1 font-bold ${daysLeft < 7 ? 'text-red-600' : 'text-blue-600'}`}>
                                <Clock size={12} /> {daysLeft > 0 ? `${daysLeft} days left` : 'Past Event'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:w-1/2">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Collected</p>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(collected)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Pledged</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(pledged)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Progress</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 transition-all duration-500" style={{width: `${Math.min(progressPercent, 100)}%`}} />
                            </div>
                            <span className="text-[10px] font-black">{progressPercent}%</span>
                        </div>
                    </div>
                </div>

                <div className="lg:w-1/6 flex justify-end">
                    <button onClick={() => window.location.href=`/events/${event.id}`} className="bg-slate-900 dark:bg-brand-600 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-brand-700 transition-all w-full lg:w-auto shadow-lg shadow-black/10 active:scale-95 flex items-center justify-center gap-2">
                        Manage <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
});

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [vendorStats, setVendorStats] = useState({ total: 0, pending: 0, active: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [usersRes, eventsRes] = await Promise.all([
          api.get('/users'),
          api.get('/events')
        ]);
        setUsers(usersRes.data.data || []);
        setEvents(eventsRes.data.data || []);

        if (user?.role === 'SUPER_ADMIN') {
            const vRes = await api.get('/admin/vendors');
            const vendors = vRes.data.data || [];
            setVendorStats({
                total: vendors.length,
                pending: vendors.filter(v => v.status === 'PENDING_APPROVAL').length,
                active: vendors.filter(v => v.status === 'ACTIVE').length
            });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {user?.role === 'SUPER_ADMIN' ? 'Platform Command' : 'My Dashboard'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                    Logged in as <span className="text-brand-600 dark:text-brand-400 underline decoration-brand-500/30">@{user?.role}</span>
                </p>
            </div>
            {user?.role === 'HOST' && (
                <button onClick={() => window.location.href='/events'} className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
                    <Plus size={18} /> New Event
                </button>
            )}
        </div>

        {/* --- SUPER ADMIN VIEW --- */}
        {user?.role === 'SUPER_ADMIN' && (
            <div className="space-y-8">
                {/* Platform Overview Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Registered Hosts" val={users.length} icon={Users} color="blue" />
                    <StatCard label="Live Events" val={events.length} icon={Activity} color="purple" />
                    <StatCard label="Total Pledges" val={formatCurrency(events.reduce((s, e) => s + (parseFloat(e.total_pledged) || 0), 0))} icon={TrendingUp} color="orange" isSmall />
                    <StatCard label="Total Collected" val={formatCurrency(events.reduce((s, e) => s + (parseFloat(e.total_collected) || 0), 0))} icon={Wallet} color="emerald" isSmall />
                </div>

                {/* Vendor & User Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Host List */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Host Performance</h3>
                            <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[10px] font-black">{users.length} TOTAL</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Host Details</th>
                                        <th className="px-6 py-4 text-center">Events</th>
                                        <th className="px-6 py-4 text-right">Pledged</th>
                                        <th className="px-6 py-4 text-right">Collected</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {users.slice(0, 10).map(host => <SuperAdminHostRow key={host.id} host={host} events={events} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Vendor Quick Stats */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 h-24 w-24 bg-brand-50 dark:bg-brand-900/20 rounded-full blur-2xl" />
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <Store size={18} className="text-brand-600" /> Vendor Pipeline
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Verified</span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white">{vendorStats.active}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Pending Review</span>
                                    <span className="text-xl font-black text-amber-700 dark:text-amber-400 animate-pulse">{vendorStats.pending}</span>
                                </div>
                                <button onClick={() => window.location.href='/admin/vendors'} className="w-full mt-4 bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                    Open Vendor Manager <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- HOST VIEW --- */}
        {user?.role === 'HOST' && (
            <div className="space-y-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Combined Pledges</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(events.reduce((s, e) => s + (parseFloat(e.total_pledged) || 0), 0))}</p>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                            <span className="text-xs font-bold text-slate-500">Live contributions tracking</span>
                        </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle size={80} /></div>
                        <p className="text-[10px] font-black text-emerald-700/60 dark:text-emerald-400/60 uppercase tracking-widest mb-2">Total Collected Funds</p>
                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">{formatCurrency(events.reduce((s, e) => s + (parseFloat(e.total_collected) || 0), 0))}</p>
                        <p className="text-xs font-bold text-emerald-600/60 mt-4 italic">Available for milestone releases</p>
                    </div>
                    <div className="bg-slate-900 dark:bg-brand-600 p-8 rounded-3xl text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20"><Calendar size={80} /></div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Active Event Assignments</p>
                        <p className="text-4xl font-black tracking-tighter">{events.length}</p>
                        <button onClick={() => window.location.href='/events'} className="mt-4 bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2">View List <ArrowRight size={12} /></button>
                    </div>
                </div>

                {/* Event Performance List */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">Your Active Lifecycle</h3>
                        <div className="flex gap-2">
                            <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black">TRACKING {events.length}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {events.length === 0 ? (
                            <div className="p-20 text-center">
                                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-500 font-bold">No active events yet. Start planning today!</p>
                            </div>
                        ) : events.map(event => <HostEventCard key={event.id} event={event} />)}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const StatCard = ({ label, val, icon: Icon, color, isSmall }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</h3>
            <div className={`p-2 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 rounded-xl group-hover:scale-110 transition-transform`}>
                <Icon size={18}/>
            </div>
        </div>
        <p className={`${isSmall ? 'text-xl' : 'text-3xl'} font-black text-slate-900 dark:text-white tracking-tighter truncate`} title={val}>{val}</p>
    </div>
);

export default DashboardPage;
