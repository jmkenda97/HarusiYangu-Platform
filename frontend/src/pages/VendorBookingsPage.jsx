import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
    Package, FileText, Calendar, DollarSign, ArrowRight,
    CheckCircle, Clock, FileCheck, FileX, Loader2, AlertCircle,
    Briefcase, Wallet, TrendingUp, Activity, X, User, Users, Star, MessageSquare,
    ChevronLeft, ChevronRight, Shield, Download, Search, Filter, Printer, Info
} from 'lucide-react';
import { SkeletonTable, PageLoader } from '../components/SkeletonLoader';

const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount || 0);

const StatusBadge = React.memo(({ status }) => {
    const styles = {
        INQUIRY: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        QUOTED: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        ACCEPTED: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        COMPLETED: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        CANCELLED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status] || styles.COMPLETED}`}>
            {status}
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
            alert(err.response?.data?.message || 'Failed to send invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">Send Milestone Invoice</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Professional Service Proposal</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Host Request Summary */}
                    <div className="space-y-3 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                            <Info size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Platform Automated Rules</p>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            Your quote will be automatically split into <span className="font-bold text-brand-600">30/30/40 milestones</span>. 
                            Ensure your Payout Accounts are set up in your profile.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Total Service Amount (TZS)</label>
                            <input 
                                type="number" 
                                required
                                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                placeholder="Total project cost"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Invoice Message / Description</label>
                            <textarea 
                                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                rows="3"
                                placeholder="What is included in this price?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-[2] bg-brand-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Official Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProfessionalDocumentModal = ({ doc, businessName, onClose, onConfirmReceipt }) => {
    if (!doc) return null;
    const isInvoice = doc.type === 'Payment Receipt';
    const isMilestoneInvoice = doc.type === 'Service Invoice';
    
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <style>
                {`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important; 
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
                `}
            </style>
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200 dark:border-slate-800 print-container" onClick={e => e.stopPropagation()}>
                {/* Document Content Area */}
                <div id="document-content" className="p-8 md:p-12 space-y-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8">
                        <div>
                            <h1 className="font-black text-2xl text-brand-600 tracking-tighter uppercase">HarusiYangu</h1>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{isInvoice ? 'Official Payment Receipt' : isMilestoneInvoice ? 'Milestone Service Invoice' : 'Service Inquiry Request'}</p>
                        </div>
                        <div className="text-right">
                            <h2 className={`text-2xl font-black uppercase tracking-tighter ${isInvoice ? 'text-emerald-600' : 'text-brand-600'}`}>{isInvoice ? 'RECEIPT' : isMilestoneInvoice ? 'INVOICE' : 'INQUIRY'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">Ref: {doc.ref_number}</p>
                            <p className="text-slate-400 font-bold text-[9px] uppercase mt-1">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Parties Section */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">From: Service Provider</p>
                            <p className="font-black text-slate-900 dark:text-white text-base">{businessName || 'N/A'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{doc.vendor_phone || 'Verified Marketplace Vendor'}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">To: Event Host</p>
                            <p className="font-black text-slate-900 dark:text-white text-base">{doc.recipient_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customer Engagement</p>
                        </div>
                    </div>

                    {/* Milestones Structure (Special for Service Invoice) */}
                    {isMilestoneInvoice && doc.milestones && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} className="text-brand-600" /> Payment Schedule (30/30/40 Rule)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.entries(doc.milestones).filter(([k]) => k.startsWith('phase')).map(([key, phase]) => (
                                    <div key={key} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{phase.name}</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none mb-2">{formatCurrency(phase.amount)}</p>
                                        <p className="text-[9px] text-slate-500 leading-relaxed font-medium italic">"{phase.description}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payout Instructions (Special for Service Invoice) */}
                    {isMilestoneInvoice && doc.milestones?.payment_instructions && (
                        <div className="p-6 rounded-2xl bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20">
                            <h3 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wallet size={14} /> Official Payout Instructions
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Provider</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{doc.milestones.payment_instructions.provider}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Account Holder</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{doc.milestones.payment_instructions.account_name}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Account Number / Phone</p>
                                    <p className="text-xs font-mono font-black text-brand-600 dark:text-brand-400 select-all">{doc.milestones.payment_instructions.account_number}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description Table-like Section */}
                    {!isMilestoneInvoice && (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 flex justify-between border-b border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Description</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (TZS)</span>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start gap-8">
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 dark:text-white text-lg mb-1">{doc.service_name}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic">"{doc.description || 'Service inquiry details provided via platform.'}"</p>
                                    </div>
                                    <p className="font-black text-xl text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(doc.amount)}</p>
                                </div>

                                {doc.last_quote && (
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Negotiation Quote</p>
                                        <p className="font-black text-base text-brand-600">{formatCurrency(doc.last_quote)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status & Summary Footer */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border-2 ${isInvoice ? 'border-emerald-500/20 bg-emerald-50/5 text-emerald-600' : 'border-brand-500/20 bg-brand-50/5 text-brand-600'}`}>
                            <div className={`h-2 w-2 rounded-full animate-pulse ${isInvoice ? 'bg-emerald-500' : 'bg-brand-500'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{isInvoice ? 'Payment Verified' : isMilestoneInvoice ? 'Invoice Active' : 'Status: Inquiry Pending'}</span>
                        </div>

                        <div className="bg-slate-900 dark:bg-brand-600 text-white rounded-2xl px-8 py-4 text-center min-w-[200px] shadow-lg shadow-brand-500/10">
                            <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">{isMilestoneInvoice ? 'Total Agreed Price' : 'Total Document Value'}</p>
                            <p className="text-2xl font-black">{formatCurrency(doc.amount)}</p>
                        </div>
                    </div>

                    <div className="text-center pt-8">
                        <p className="text-[9px] text-slate-400 font-medium italic">Thank you for choosing HarusiYangu Marketplace. This is a system-generated document for legal and financial reference.</p>
                    </div>
                </div>

                {/* Controls - HIDDEN DURING PRINT */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex flex-col items-center gap-4 no-print">
                    <div className="flex justify-center gap-3 w-full">
                        <button onClick={() => window.print()} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                            <Printer size={14} /> Print / Save as PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg">
                            Close
                        </button>
                    </div>
                    
                    {/* CONFIRM RECEIPT BUTTON (For Vendors viewing a receipt) */}
                    {isInvoice && !doc.is_vendor_confirmed && onConfirmReceipt && (
                        <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col items-center p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-3">Have you seen this money in your phone or bank account?</p>
                                <button 
                                    onClick={onConfirmReceipt}
                                    className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    <CheckCircle size={14} /> I Have Received This Payment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const VendorBookingsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'inquiries';

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // --- TRANSACTION HISTORY BROO ---
    const [transactions, setTransactions] = useState([]);
    const [txPage, setTxPage] = useState(1);
    const [txTotal, setTxTotal] = useState(0);
    const [txSearch, setTxSearch] = useState('');
    const [txMonth, setTxMonth] = useState('');
    const [txStartDate, setTxStartDate] = useState('');
    const [txEndDate, setTxEndDate] = useState('');
    const [txService, setTxService] = useState('');

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/vendor/ledger', {
                params: {
                    page: txPage,
                    search: txSearch,
                    month: txMonth,
                    start_date: txStartDate,
                    end_date: txEndDate,
                    service_type: txService
                }
            });
            setTransactions(res.data.data);
            setTxTotal(res.data.meta.total);
        } catch (err) { console.error("TX fetch error", err); }
    };

    useEffect(() => {
        if (activeTab === 'transactions') {
            fetchTransactions();
        }
    }, [activeTab, txPage, txMonth, txStartDate, txEndDate, txService]);

    // Simple search debounce for Vendor Ledger
    useEffect(() => {
        if (activeTab === 'transactions') {
            const delayDebounceFn = setTimeout(() => {
                fetchTransactions();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [txSearch]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vendors/dashboard');
            setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch vendor data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setSearchParams({ tab });
        setCurrentPage(1);
        setSearchQuery('');
    };

    const openInquiryDoc = (inquiry) => {
        const isInvoice = ['QUOTED', 'ACCEPTED', 'COMPLETED'].includes(inquiry.status);
        
        setSelectedDoc({
            type: isInvoice ? 'Service Invoice' : 'Service Inquiry',
            ref_number: `${isInvoice ? 'INV' : 'INQ'}-${inquiry.id.substring(0, 8).toUpperCase()}`,
            recipient_name: inquiry.host_name,
            service_name: inquiry.assigned_service,
            description: inquiry.contract_notes,
            amount: inquiry.last_quote_amount || inquiry.metadata?.target_amount || 0,
            last_quote: inquiry.last_quote_amount,
            milestones: inquiry.metadata?.milestones || null,
            vendor_phone: data?.profile?.phone,
            is_paid: inquiry.status === 'COMPLETED'
        });
    };

    const openInvoice = (payment) => {
        setSelectedDoc({
            type: 'Payment Receipt',
            ref_number: `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
            recipient_name: 'Event Host',
            service_name: `Milestone Payment: ${payment.milestone}`,
            description: `Payment for event services recorded on ${new Date(payment.payment_date).toLocaleDateString()}`,
            amount: payment.amount,
            is_paid: true,
            is_released: payment.is_released,
            is_vendor_confirmed: payment.is_vendor_confirmed,
            payment_id: payment.id,
            notes: `Reference: ${payment.transaction_reference || 'N/A'}. This is a ${payment.is_released ? 'direct' : 'escrow'} transaction.`
        });
    };

    const handleConfirmReceipt = async (paymentId) => {
        if (!window.confirm('Confirm that you have received this money in your account?')) return;
        try {
            await api.put(`/payments/${paymentId}/confirm`);
            fetchData();
            setSelectedDoc(null);
            alert('Payment receipt confirmed successfully.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to confirm receipt');
        }
    };

    // Filtered Data based on tab
    const filteredInquiries = useMemo(() => {
        if (!data?.inquiries) return [];
        return data.inquiries.filter(i => 
            i.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.host_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.assigned_service.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const filteredBookings = useMemo(() => {
        if (!data?.events) return [];
        return data.events.filter(e => 
            e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.host_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.assigned_service.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const filteredEarnings = useMemo(() => {
        if (!data?.payments) return [];
        return data.payments.filter(p => 
            p.event?.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.milestone.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const currentData = activeTab === 'inquiries' ? filteredInquiries : 
                        activeTab === 'bookings' ? filteredBookings : 
                        filteredEarnings;

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return currentData.slice(start, start + itemsPerPage);
    }, [currentData, currentPage]);

    if (loading) return <PageLoader message="Loading your business records..." />;

    return (
        <div className="space-y-6 pb-20 p-4 md:p-0 max-w-7xl mx-auto">
            {selectedInquiry && (
                <QuoteModal 
                    inquiry={selectedInquiry} 
                    onClose={() => setSelectedInquiry(null)} 
                    onSuccess={() => { fetchData(); }} 
                />
            )}
            
            {selectedDoc && (
                <ProfessionalDocumentModal 
                    doc={selectedDoc} 
                    businessName={data?.profile?.business_name} 
                    onClose={() => setSelectedDoc(null)} 
                    onConfirmReceipt={() => handleConfirmReceipt(selectedDoc.payment_id)}
                />
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Manage My Business</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Track your inquiries, active bookings, and financial statements.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Available</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(data?.wallet?.available_balance)}</p>
                        </div>
                        <div className="bg-brand-50 dark:bg-brand-900/20 px-6 py-3 rounded-2xl border border-brand-100 dark:border-brand-800 text-center">
                            <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">Escrow</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(data?.wallet?.pending_balance)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs & Search BROO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
                        { id: 'bookings', label: 'Active Bookings', icon: Calendar },
                        { id: 'transactions', label: 'Transaction History', icon: TrendingUp }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all flex-shrink-0 ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    {activeTab === 'transactions' ? (
                        <>
                            <div className="relative w-full md:w-48">
                                <input 
                                    type="month" 
                                    value={txMonth}
                                    onChange={e => setTxMonth(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="relative w-full md:w-48">
                                <input 
                                    type="text" 
                                    placeholder="Filter Service..."
                                    value={txService}
                                    onChange={e => setTxService(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Table Module */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {currentData.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-slate-300" size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No results found</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    {activeTab === 'inquiries' && (
                                        <>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Event & Host</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Request</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Your Quote</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                        </>
                                    )}
                                    {activeTab === 'bookings' && (
                                        <>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Event Details</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Service</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Agreed Amount</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Paid</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Balance</th>
                                        </>
                                    )}
                                    {activeTab === 'earnings' && (
                                        <>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Event Details</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Phase</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {activeTab === 'transactions' ? (
                                    transactions.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{new Date(item.entry_date).toLocaleDateString('en-GB')}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(item.entry_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-900 dark:text-white leading-tight">{item.event?.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.description}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.entry_type === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                    {item.entry_type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className={`font-black text-lg ${item.entry_type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {item.entry_type === 'CREDIT' ? '+' : '-'} {formatCurrency(item.amount)}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`inline-flex items-center gap-1 font-black text-[9px] uppercase px-2.5 py-1 rounded-full ${item.payment_status?.is_confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {item.payment_status?.is_confirmed ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                        {item.payment_status?.is_confirmed ? 'Verified' : 'Confirm Rec.'}
                                                    </span>
                                                    {item.payment_status?.confirmed_at && (
                                                        <p className="text-[8px] text-slate-400 mt-1 font-bold">{new Date(item.payment_status.confirmed_at).toLocaleDateString()}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {item.payment_status?.proof_url && (
                                                        <a href={item.payment_status.proof_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all shadow-sm" title="View Proof of Payment">
                                                            <Download size={18} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => openInvoice(item)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand-600 rounded-xl transition-all shadow-sm">
                                                        <FileText size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    paginatedData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        {activeTab === 'inquiries' && (
                                            <>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-xl flex items-center justify-center font-bold">
                                                            {item.event_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white leading-tight">{item.event_name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-slate-500 font-medium">{item.host_name}</span>
                                                                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                                                <span className="text-[10px] text-slate-400 uppercase font-black">{new Date(item.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <button 
                                                        onClick={() => openInquiryDoc(item)}
                                                        className="flex flex-col items-start hover:text-brand-600 transition-colors text-left"
                                                    >
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                            <Package size={14} /> {item.assigned_service}
                                                        </div>
                                                        {item.metadata?.target_amount > 0 && (
                                                            <p className="text-[10px] font-black text-emerald-600 mt-2 uppercase tracking-tight">Host Budget: {formatCurrency(item.metadata.target_amount)}</p>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <StatusBadge status={item.status} />
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-slate-700 dark:text-slate-300">{item.last_quote_amount ? formatCurrency(item.last_quote_amount) : 'Not quoted'}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => openInquiryDoc(item)}
                                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 rounded-xl transition-all"
                                                            title="View Professional Inquiry"
                                                        >
                                                            <FileText size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setSelectedInquiry(item)}
                                                            className="bg-slate-900 dark:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-brand-600 shadow-sm flex items-center gap-2"
                                                        >
                                                            {item.status === 'QUOTED' ? 'Update Quote' : 'Send Quote'}
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'bookings' && (
                                            <>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                                                            <Calendar size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white leading-tight">{item.event_name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-slate-500 font-medium">{item.host_name}</span>
                                                                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-tight truncate max-w-[150px]">{item.venue_name || 'Venue TBD'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{item.assigned_service}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <p className="font-black text-slate-900 dark:text-white">{formatCurrency(item.agreed_amount)}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-emerald-600">
                                                    {formatCurrency(item.amount_paid)}
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-orange-600">
                                                    {formatCurrency(item.balance_due)}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Pagination */}
                {currentData.length > itemsPerPage && (
                    <div className="px-8 py-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, currentData.length)}</span> of {currentData.length} records
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => p + 1)} 
                                disabled={currentPage * itemsPerPage >= currentData.length}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorBookingsPage;
