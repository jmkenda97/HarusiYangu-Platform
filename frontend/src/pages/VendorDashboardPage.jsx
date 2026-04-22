import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Building2, Package, FileText, Calendar, DollarSign, ArrowRight,
    CheckCircle, Clock, FileCheck, FileX, Loader2, AlertCircle,
    Briefcase, Wallet, TrendingUp, Activity, X, User, Users, Star, MessageSquare,
    ChevronLeft, ChevronRight, Shield, Download
} from 'lucide-react';
import { SkeletonCard, PageLoader } from '../components/SkeletonLoader';

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
        ACTIVE: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-yellow-800',
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

const QuoteModal = ({ inquiry, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(inquiry?.last_quote_amount || '');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/bookings/${inquiry.id}/quote`, {
                quote_amount: amount,
                notes: notes
            });
            onSuccess();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send quote');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <h3 className="font-bold text-slate-900 dark:text-white">Send Price Quote</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Service Details</p>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{inquiry.assigned_service}</p>
                            <p className="text-xs text-slate-500 mt-1">For: {inquiry.event_name}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quote Amount (TZS)</label>
                        <input 
                            type="number" 
                            required
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Enter your price..."
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Additional Notes</label>
                        <textarea 
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            rows="3"
                            placeholder="Explain what's included in this price..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Quote'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const VendorDashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [toast, setToast] = useState(null);
    const [selectedInquiry, setSelectedInquiry] = useState(null);

    // --- LEDGER & DOCUMENT STATES ---
    const [ledger, setLedger] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const ProfessionalDocumentModal = ({ doc, onClose }) => {
        if (!doc) return null;
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md" onClick={onClose}>
                <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center text-white"><Shield size={20} /></div>
                                <span className="font-black text-xl text-slate-900 tracking-tighter">HarusiYangu</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Verified Vendor Document</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{doc.type}</h2>
                            <p className="text-slate-500 font-bold text-sm">Ref: {doc.ref_number}</p>
                        </div>
                    </div>
                    <div className="p-12 space-y-12">
                        <div className="flex justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Provider</p>
                                <p className="font-black text-slate-900 text-lg">{dashboardData?.profile?.business_name}</p>
                                <p className="text-sm text-slate-500">{dashboardData?.profile?.phone}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed To (Host)</p>
                                <p className="font-black text-slate-900">{doc.recipient_name}</p>
                                <p className="text-sm text-slate-500">Event Transaction</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-8 space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-4">Payment Breakdown</h4>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-900 text-xl">{doc.service_name}</p>
                                    <p className="text-sm text-slate-500">{doc.description}</p>
                                </div>
                                <p className="font-black text-2xl text-slate-900">{new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(doc.amount)}</p>
                            </div>
                        </div>
                        <div className="border-2 border-emerald-500 rounded-2xl p-6 flex items-center justify-center gap-4 bg-emerald-50/30">
                            <div className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center text-white"><CheckCircle size={28} /></div>
                            <div>
                                <p className="text-2xl font-black text-emerald-600 uppercase tracking-tighter">Payment Confirmed</p>
                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Released to Vendor Account</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center gap-4">
                        <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all"><Download size={16} /> Save Copy</button>
                        <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    const openInvoice = (payment) => {
        setSelectedDoc({
            type: 'Payment Receipt',
            ref_number: `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
            recipient_name: 'Event Host', // Could be more specific if event object was more detailed here
            service_name: `Milestone Payment: ${payment.milestone}`,
            description: `Payment for event services recorded on ${new Date(payment.payment_date).toLocaleDateString()}`,
            amount: payment.amount,
            is_paid: true,
            notes: `Reference: ${payment.transaction_reference || 'N/A'}. This is a verified transaction.`
        });
    };

    // Pagination states
    const [inquiryPage, setInquiryPage] = useState(1);
    const [bookingPage, setBookingPage] = useState(1);
    const itemsPerPage = 5;

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
        const { profile, services, documents, events, inquiries, wallet } = dashboardData;
        const approvedDocs = documents?.filter(d => d.verification_status === 'APPROVED').length || 0;
        const pendingDocs = documents?.filter(d => d.verification_status === 'PENDING').length || 0;
        const rejectedDocs = documents?.filter(d => d.verification_status === 'REJECTED').length || 0;

        return {
            profileStatus: profile?.status || 'PENDING_APPROVAL',
            totalServices: services?.length || 0,
            documentSummary: { approved: approvedDocs, pending: pendingDocs, rejected: rejectedDocs },
            assignedEvents: events?.length || 0,
            pendingInquiries: inquiries?.filter(i => i.status === 'INQUIRY').length || 0,
            totalEarnings: wallet?.total_earnings || 0,
            pendingBalance: wallet?.pending_balance || 0,
            availableBalance: wallet?.available_balance || 0
        };
    }, [dashboardData]);

    const paginatedInquiries = useMemo(() => {
        if (!dashboardData?.inquiries) return [];
        const start = (inquiryPage - 1) * itemsPerPage;
        return dashboardData.inquiries.slice(start, start + itemsPerPage);
    }, [dashboardData, inquiryPage]);

    const paginatedBookings = useMemo(() => {
        if (!dashboardData?.events) return [];
        const start = (bookingPage - 1) * itemsPerPage;
        return dashboardData.events.slice(start, start + itemsPerPage);
    }, [dashboardData, bookingPage]);

    const paginatedPayments = useMemo(() => {
        if (!dashboardData?.payments) return [];
        // No separate pagination state for payments yet, using itemsPerPage
        return dashboardData.payments.slice(0, itemsPerPage);
    }, [dashboardData]);

    const rejectionItems = useMemo(() => {
        if (!dashboardData) return [];
        const { profile, services, documents } = dashboardData;
        const items = [];
        
        // 1. Account Rejection
        if (profile?.status === 'INACTIVE' && profile?.notes) {
            const lines = profile.notes.split('\n');
            const reasonLine = lines.find(line => line.includes('Rejection Reason:'));
            if (reasonLine) {
                const reason = reasonLine.split('Rejection Reason:').pop().trim();
                items.push({ type: 'Account', name: profile.business_name || 'Your Profile', reason });
            }
        }

        // 2. Document Rejections
        documents?.filter(d => d.verification_status === 'REJECTED').forEach(d => {
            items.push({ type: 'Document', name: d.document_name, reason: d.rejection_reason || 'No specific reason provided' });
        });

        // 3. Service Rejections
        services?.filter(s => s.rejection_reason).forEach(s => {
            items.push({ type: 'Service', name: s.service_name, reason: s.rejection_reason });
        });

        return items;
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-52 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SkeletonCard count={4} />
                </div>
            </div>
        );
    }

    if (stats && stats.profileStatus === 'PENDING_APPROVAL') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-md w-full bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="text-yellow-600 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-800 mb-2">Account Under Review</h2>
                    <p className="text-yellow-700 mb-6 text-sm">
                        Thank you for registering, <strong>{user?.first_name || 'Vendor'}</strong>!
                    </p>
                    <p className="text-yellow-700 mb-6 text-sm leading-relaxed">
                        Your account is currently being reviewed by our admin team. We have received your documents ({stats.documentSummary.pending || 0} files).
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-yellow-200 text-left mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">What happens next?</p>
                        <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                            <li>Admin reviews your Business License & Certificate.</li>
                            <li>You will receive an email/SMS once approved.</li>
                            <li>You can then start managing your services.</li>
                        </ul>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-6 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg transition-colors">Refresh Status</button>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Failed to load dashboard</h3>
                <button onClick={fetchDashboardData} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {selectedInquiry && <QuoteModal inquiry={selectedInquiry} onClose={() => setSelectedInquiry(null)} onSuccess={() => { showToast('Quote sent successfully!'); fetchDashboardData(); }} />}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.first_name || 'Vendor'}. Manage your business and track inquiries.</p>
                </div>
                {stats.pendingInquiries > 0 && (
                    <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 px-4 py-2 rounded-xl flex items-center gap-3 animate-bounce">
                        <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">{stats.pendingInquiries}</div>
                        <p className="text-sm font-bold text-brand-700 dark:text-brand-300">New Inquiries Pending!</p>
                    </div>
                )}
            </div>

            {/* Verification Alert Section */}
            {rejectionItems.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 rounded-lg">
                            <AlertCircle size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-900 dark:text-red-100">Verification Issues Found</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-4">Some of your items were rejected by the admin. Please fix them to get your account fully verified.</p>
                            
                            <div className="space-y-3">
                                {rejectionItems.map((item, idx) => (
                                    <div key={idx} className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-red-100 dark:border-red-900/50 flex justify-between items-center gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase text-red-400 tracking-widest">{item.type}</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">Reason: {item.reason}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const tab = item.type === 'Document' ? 'documents' : item.type === 'Service' ? 'services' : 'profile';
                                                navigate(`/vendor/profile?tab=${tab}`);
                                            }}
                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                                        >
                                            Fix Issue
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                    <p className="text-xs text-slate-400 mt-2">{stats.profileStatus === 'ACTIVE' ? 'Your profile is verified and active' : 'Complete your profile to get verified'}</p>
                </div>

                <StatCard label="Earnings" value={formatCurrency(stats.totalEarnings)} icon={Wallet} color="emerald" isCurrency subtext="Total lifetime earnings" />
                <StatCard label="Withdrawal Balance" value={formatCurrency(stats.availableBalance)} icon={Shield} color="brand" isCurrency subtext="Money ready for withdrawal" />
            </div>

            {/* Earnings History Table - Professional Statement */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-emerald-500" size={20} /> My Earnings Statement
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Track your payments and milestones from all events</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Verified History</span>
                </div>
                <div className="overflow-x-auto">
                    {dashboardData?.payments?.length === 0 ? (
                        <div className="p-16 text-center">
                            <DollarSign className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No payments received yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Event Details</th>
                                    <th className="px-6 py-4">Milestone Phase</th>
                                    <th className="px-6 py-4 text-right">Amount Received</th>
                                    <th className="px-6 py-4 text-center">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(payment.payment_date).toLocaleDateString()}
                                            <div className="text-[10px] opacity-60 uppercase">{new Date(payment.payment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{payment.event?.event_name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-medium tracking-tight">Payment via {payment.payment_method}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${payment.is_released ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                {payment.milestone} {payment.is_released ? '' : '(ESCROW)'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                            + {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => openInvoice(payment)}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                                                title="View Official Receipt"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Inquiries Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Incoming Inquiries</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Respond to hosts interested in your services</p>
                    </div>
                    <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-full text-xs font-bold">
                        {dashboardData?.inquiries?.length || 0} Total
                    </span>
                </div>
                <div className="overflow-x-auto">
                    {dashboardData?.inquiries?.length === 0 ? (
                        <div className="p-16 text-center">
                            <MessageSquare className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No inquiries received yet.</p>
                            <p className="text-xs text-slate-400 mt-1">They will appear here when hosts contact you.</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">#</th>
                                        <th className="px-6 py-4">Event & Host</th>
                                        <th className="px-6 py-4">Requested Service</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Current Quote</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedInquiries.map((inquiry, idx) => (
                                        <tr key={inquiry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                                {(inquiryPage - 1) * itemsPerPage + idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-slate-900 dark:text-white">{inquiry.event_name}</div>
                                                    {inquiry.has_conflict && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm" title="You already have a confirmed booking for this date">
                                                            <AlertCircle size={10} /> Conflict
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                                                    <User size={10} /> {inquiry.host_name}
                                                    <span className="text-slate-300 mx-1">•</span>
                                                    <Calendar size={10} /> {new Date(inquiry.event_date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                                                    <Package size={14} /> {inquiry.assigned_service}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                                    inquiry.status === 'INQUIRY' 
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                }`}>
                                                    {inquiry.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                {inquiry.last_quote_amount ? formatCurrency(inquiry.last_quote_amount) : 'Not quoted'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedInquiry(inquiry)}
                                                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto"
                                                >
                                                    {inquiry.status === 'QUOTED' ? 'Update Quote' : 'Send Quote'}
                                                    <ArrowRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {dashboardData?.inquiries?.length > itemsPerPage && (
                                <PaginationFooter total={dashboardData.inquiries.length} currentPage={inquiryPage} onPageChange={setInquiryPage} itemsPerPage={itemsPerPage} />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Confirmed Events Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Bookings</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Events where your quote was accepted</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {dashboardData?.events?.length === 0 ? (
                        <div className="p-16 text-center">
                            <Calendar className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No confirmed events yet.</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">#</th>
                                        <th className="px-6 py-4">Event</th>
                                        <th className="px-6 py-4">Service</th>
                                        <th className="px-6 py-4 text-right">Agreed Amount</th>
                                        <th className="px-6 py-4 text-right">Paid</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedBookings.map((event, idx) => (
                                        <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                                {(bookingPage - 1) * itemsPerPage + idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{event.event_name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                                                    <Calendar size={10} /> {new Date(event.event_date).toLocaleDateString()}
                                                    <span className="text-slate-300 mx-1">•</span>
                                                    <User size={10} /> {event.host_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 truncate max-w-[200px]">
                                                    <Building2 size={10} /> {event.venue_name || 'Venue TBD'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{event.assigned_service}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(event.agreed_amount)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">{formatCurrency(event.amount_paid)}</td>
                                            <td className="px-6 py-4 text-right text-orange-600 font-bold">{formatCurrency(event.balance_due)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {dashboardData?.events?.length > itemsPerPage && (
                                <PaginationFooter total={dashboardData.events.length} currentPage={bookingPage} onPageChange={setBookingPage} itemsPerPage={itemsPerPage} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const PaginationFooter = ({ total, currentPage, onPageChange, itemsPerPage }) => {
    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, total)}</span> of <span className="font-bold">{total}</span> records</p>
            <div className="flex gap-2">
                <button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 transition-all"><ChevronLeft size={16} /></button>
                <button onClick={() => onPageChange(p => p + 1)} disabled={currentPage * itemsPerPage >= total} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 transition-all"><ChevronRight size={16} /></button>
            </div>
        </div>
    );
};

export default VendorDashboardPage;
