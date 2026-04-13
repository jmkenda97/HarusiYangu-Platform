import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Building2, Package, FileText, Calendar, DollarSign, ArrowRight,
    CheckCircle, Clock, FileCheck, FileX, Loader2, AlertCircle,
    Briefcase, Wallet, TrendingUp, Activity, X
} from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);

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

// --- MEMOIZED COMPONENTS ---

const StatCard = React.memo(({ label, value, icon: Icon, color, subtext, isCurrency }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{label}</h3>
            <div className={`p-2 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 rounded-lg`}>
                <Icon size={20}/>
            </div>
        </div>
        <div>
            <p className={`text-2xl font-bold text-slate-900 dark:text-white ${isCurrency ? '' : 'text-3xl'}`}>{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
        </div>
    </div>
));

const StatusBadge = React.memo(({ status }) => {
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
            {(status === 'INACTIVE' || status === 'BLACKLISTED') && <AlertCircle size={12} />}
            {status.replace('_', ' ')}
        </span>
    );
});

const DocumentStatusBadge = React.memo(({ status }) => {
    const styles = {
        PENDING: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        APPROVED: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        REJECTED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    };
    const icons = {
        PENDING: <Clock size={12} />,
        APPROVED: <FileCheck size={12} />,
        REJECTED: <FileX size={12} />
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.PENDING}`}>
            {icons[status]}
            {status}
        </span>
    );
});

const EventRow = React.memo(({ event }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td className="px-6 py-4">
            <div className="font-medium text-slate-900 dark:text-white">{event.event_name}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">{new Date(event.event_date).toLocaleDateString()}</div>
        </td>
        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{event.assigned_service}</td>
        <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(event.agreed_amount)}</td>
        <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(event.amount_paid)}</td>
        <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400">{formatCurrency(event.balance_due)}</td>
    </tr>
));

const VendorDashboardPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

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

    // --- MEMOIZED STATS ---
    const stats = useMemo(() => {
        if (!dashboardData) return null;

        const { profile, services, documents, events, financials } = dashboardData;

        const approvedDocs = documents?.filter(d => d.verification_status === 'APPROVED').length || 0;
        const pendingDocs = documents?.filter(d => d.verification_status === 'PENDING').length || 0;
        const rejectedDocs = documents?.filter(d => d.verification_status === 'REJECTED').length || 0;

        return {
            profileStatus: profile?.verification_status || 'PENDING_APPROVAL',
            totalServices: services?.length || 0,
            documentSummary: { approved: approvedDocs, pending: pendingDocs, rejected: rejectedDocs },
            assignedEvents: events?.length || 0,
            totalEarnings: financials?.total_earnings || 0,
            pendingBalance: financials?.pending_balance || 0
        };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Failed to load dashboard</h3>
                <button
                    onClick={fetchDashboardData}
                    className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { profile, services, documents, events, financials } = dashboardData;

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Welcome back, {user?.first_name || 'Vendor'}. Manage your services and track your events.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Profile Status</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Building2 size={20}/>
                        </div>
                    </div>
                    <StatusBadge status={stats.profileStatus} />
                    <p className="text-xs text-slate-400 mt-2">
                        {stats.profileStatus === 'ACTIVE' ? 'Your profile is verified and active' : 'Complete your profile to get verified'}
                    </p>
                </div>

                <StatCard
                    label="Total Services"
                    value={stats.totalServices}
                    icon={Package}
                    color="purple"
                    subtext="Services offered"
                />

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Documents</h3>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                            <FileText size={20}/>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.documentSummary.approved}</p>
                            <p className="text-xs text-slate-400">Approved</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.documentSummary.pending}</p>
                            <p className="text-xs text-slate-400">Pending</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.documentSummary.rejected}</p>
                            <p className="text-xs text-slate-400">Rejected</p>
                        </div>
                    </div>
                </div>

                <StatCard
                    label="Assigned Events"
                    value={stats.assignedEvents}
                    icon={Calendar}
                    color="indigo"
                    subtext="Events you're working on"
                />

                <StatCard
                    label="Total Earnings"
                    value={formatCurrency(stats.totalEarnings)}
                    icon={Wallet}
                    color="emerald"
                    isCurrency
                    subtext="Payments received"
                />

                <StatCard
                    label="Pending Balance"
                    value={formatCurrency(stats.pendingBalance)}
                    icon={TrendingUp}
                    color="red"
                    isCurrency
                    subtext="Outstanding payments"
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <a
                        href="/vendor/profile"
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Building2 size={16} /> Manage Profile
                    </a>
                    <button
                        onClick={() => window.location.href = '/vendor/profile?tab=services'}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Package size={16} /> Add Service
                    </button>
                    <button
                        onClick={() => window.location.href = '/vendor/profile?tab=documents'}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <FileText size={16} /> Upload Document
                    </button>
                </div>
            </div>

            {/* Assigned Events Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Events</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">
                        Total: {events?.length || 0}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    {events?.length === 0 ? (
                        <div className="p-12 text-center">
                            <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">No events assigned yet.</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Complete your profile to start receiving event assignments.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4 text-right">Agreed Amount</th>
                                    <th className="px-6 py-4 text-right">Paid</th>
                                    <th className="px-6 py-4 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {events.map(event => (
                                    <EventRow key={event.id} event={event} />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Document Status */}
            {documents?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Document Status</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {documents.map((doc) => (
                            <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <FileText size={20} className="text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{doc.document_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{doc.document_type.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <DocumentStatusBadge status={doc.verification_status} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Services Overview */}
            {services?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Services</h3>
                        <button
                            onClick={() => window.location.href = '/vendor/profile?tab=services'}
                            className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 flex items-center gap-1"
                        >
                            Manage All <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {services.slice(0, 6).map((service) => (
                            <div key={service.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-brand-300 dark:hover:border-brand-500 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold px-2 py-1 rounded uppercase">
                                        {service.service_type.replace('_', ' ')}
                                    </span>
                                    {service.is_available ? (
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Available</span>
                                    ) : (
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Unavailable</span>
                                    )}
                                </div>
                                <h4 className="font-medium text-slate-900 dark:text-white mb-1">{service.service_name}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorDashboardPage;
