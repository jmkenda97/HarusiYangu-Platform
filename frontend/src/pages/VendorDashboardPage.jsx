import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Building2, Package, FileText, Calendar, DollarSign, ArrowRight,
    CheckCircle, Clock, FileCheck, FileX, Loader2, AlertCircle,
    Briefcase, Wallet, TrendingUp, Activity, X, User, Users, Star, MessageSquare,
    Shield, Download
} from 'lucide-react';
import { SkeletonCard, PageLoader } from '../components/SkeletonLoader';

const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount || 0);

const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`} style={{zIndex: 9999}}>
            {type === 'success' ? <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center"><span className="text-green-600 dark:text-green-200 text-xs">✓</span></div> : <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center"><span className="text-red-600 dark:text-red-200 text-xs">!</span></div>}
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16} /></button>
        </div>
    );
};

const StatCard = React.memo(({ label, value, icon: Icon, color, subtext, isCurrency, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
    >
        <div className="flex items-center justify-between mb-6">
            <div className={`p-4 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24}/>
            </div>
            <ArrowRight size={18} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
            <p className={`text-2xl font-black text-slate-900 dark:text-white leading-tight`}>{value}</p>
            {subtext && <p className="text-xs font-medium text-slate-400 mt-2">{subtext}</p>}
        </div>
    </div>
));

const StatusBadge = React.memo(({ status }) => {
    const styles = {
        PENDING_APPROVAL: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        ACTIVE: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-yellow-800',
        INACTIVE: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        BLACKLISTED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.INACTIVE}`}>
            {status === 'ACTIVE' && <CheckCircle size={12} />}
            {status === 'PENDING_APPROVAL' && <Clock size={12} />}
            {(status === 'INACTIVE' || status === 'BLACKLISTED') && <AlertCircle size={12} />}
            {status.replace('_', ' ')}
        </span>
    );
});

const VendorDashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendors/dashboard');
            setDashboardData(res.data.data);
        } catch (err) {
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const stats = useMemo(() => {
        if (!dashboardData) return null;
        const { profile, inquiries, wallet, events } = dashboardData;

        return {
            profileStatus: profile?.status || 'PENDING_APPROVAL',
            pendingInquiries: inquiries?.filter(i => i.status === 'INQUIRY').length || 0,
            activeBookings: events?.length || 0,
            totalEarnings: wallet?.total_earnings || 0,
            pendingBalance: wallet?.pending_balance || 0,
            availableBalance: wallet?.available_balance || 0
        };
    }, [dashboardData]);

    const rejectionItems = useMemo(() => {
        if (!dashboardData) return [];
        const { profile, services, documents } = dashboardData;
        const items = [];
        if (profile?.status === 'INACTIVE' && profile?.notes) {
            const reason = profile.notes.split('Rejection Reason:').pop().trim();
            items.push({ type: 'Account', name: profile.business_name || 'Your Profile', reason });
        }
        documents?.filter(d => d.verification_status === 'REJECTED').forEach(d => {
            items.push({ type: 'Document', name: d.document_name, reason: d.rejection_reason || 'Check requirements' });
        });
        services?.filter(s => s.rejection_reason).forEach(s => {
            items.push({ type: 'Service', name: s.service_name, reason: s.rejection_reason });
        });
        return items;
    }, [dashboardData]);

    if (loading) return <PageLoader message="Personalizing your workspace..." />;

    if (stats && stats.profileStatus === 'PENDING_APPROVAL') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
                        <Clock size={40} className="animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Account Under Review</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Your business profile and documents are being verified by our team. You'll be notified once approved.</p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-left space-y-4">
                        <div className="flex gap-3">
                            <div className="h-5 w-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black">1</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Admin reviews your Tanzanian Business Credentials.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="h-5 w-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black">2</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">System activates your Vendor Catalog listing.</p>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs">Refresh Status</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Habari, {user?.first_name}</h2>
                        <StatusBadge status={stats.profileStatus} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium tracking-tight">Here is your business performance at a glance.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/vendor/profile')} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"><User size={14} /> My Profile</button>
                    <button onClick={() => navigate('/vendor/bookings')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"><Briefcase size={14} /> All Bookings</button>
                </div>
            </div>

            {/* Alerts for Rejections */}
            {rejectionItems.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 animate-in slide-in-from-top duration-500">
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 rounded-2xl">
                            <AlertCircle size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-red-900 dark:text-red-100 tracking-tight">Action Required: Verification Issues</h3>
                            <p className="text-red-700 dark:text-red-300 font-medium mt-1 mb-6">Some items require your attention to maintain your verified status.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rejectionItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-red-100 dark:border-red-900/50 group hover:border-red-500 transition-all">
                                        <p className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-1">{item.type}</p>
                                        <p className="font-black text-slate-900 dark:text-white truncate">{item.name}</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic font-medium">"{item.reason}"</p>
                                        <button 
                                            onClick={() => navigate(`/vendor/profile?tab=${item.type === 'Document' ? 'documents' : item.type === 'Service' ? 'services' : 'profile'}`)}
                                            className="mt-4 w-full py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            Fix Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Available Balance" 
                    value={formatCurrency(stats.availableBalance)} 
                    icon={Wallet} 
                    color="emerald" 
                    subtext="Ready for withdrawal"
                    onClick={() => navigate('/vendor/bookings?tab=transactions')}
                />
                <StatCard 
                    label="Escrow Balance" 
                    value={formatCurrency(stats.pendingBalance)} 
                    icon={Shield} 
                    color="amber" 
                    subtext="Held until completion"
                    onClick={() => navigate('/vendor/bookings?tab=transactions')}
                />
                <StatCard 
                    label="Pending Inquiries" 
                    value={stats.pendingInquiries} 
                    icon={MessageSquare} 
                    color="brand" 
                    subtext="Requires your quote"
                    onClick={() => navigate('/vendor/bookings?tab=inquiries')}
                />
                <StatCard 
                    label="Confirmed Hires" 
                    value={stats.activeBookings} 
                    icon={Calendar} 
                    color="blue" 
                    subtext="Active event contracts"
                    onClick={() => navigate('/vendor/bookings?tab=bookings')}
                />
            </div>

            {/* Recent Business Activity & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Inquiries</h3>
                        <button onClick={() => navigate('/vendor/bookings?tab=inquiries')} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-1">Manage All <ArrowRight size={14} /></button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                        {dashboardData?.inquiries?.length === 0 ? (
                            <div className="p-16 text-center">
                                <MessageSquare className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No inquiries yet.</p>
                            </div>
                        ) : (
                            dashboardData.inquiries.slice(0, 4).map((inquiry) => (
                                <div key={inquiry.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-brand-600">
                                            {inquiry.event_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white">{inquiry.event_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{inquiry.assigned_service}</span>
                                                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                                <span className="text-xs text-slate-500 font-medium">{inquiry.host_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{inquiry.status}</p>
                                        <button onClick={() => navigate('/vendor/bookings?tab=inquiries')} className="text-xs font-black text-brand-600 hover:text-brand-700">View Quote</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Business Health */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Business Overview</h3>
                    <div className="bg-slate-900 dark:bg-brand-900/20 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                        <Activity className="absolute -right-4 -bottom-4 text-white/10" size={140} />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Lifetime Revenue</p>
                            <p className="text-3xl font-black tracking-tighter mb-8">{formatCurrency(stats.totalEarnings)}</p>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase opacity-40">Services Listed</p>
                                        <p className="text-xl font-black">{dashboardData?.services?.length || 0}</p>
                                    </div>
                                    <TrendingUp className="text-emerald-400" size={20} />
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase opacity-40">Verified Docs</p>
                                        <p className="text-xl font-black">{dashboardData?.documents?.filter(d => d.verification_status === 'APPROVED').length || 0}</p>
                                    </div>
                                    <Shield className="text-blue-400" size={20} />
                                </div>
                            </div>

                            <button onClick={() => navigate('/vendor/profile?tab=services')} className="mt-10 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Optimize My Services</button>
                        </div>
                    </div>

                    <div className="bg-brand-50 dark:bg-brand-900/10 rounded-3xl p-6 border border-brand-100 dark:border-brand-900/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-xl"><Star size={18} /></div>
                            <h4 className="font-black text-slate-900 dark:text-white text-sm">Pro Tip</h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Respond to inquiries within 2 hours to increase your acceptance rate by up to 40%.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorDashboardPage;
