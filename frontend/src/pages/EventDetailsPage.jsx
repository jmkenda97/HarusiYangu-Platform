import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import {
    ArrowLeft, Users, Wallet, CreditCard, Plus, ChevronLeft, ChevronRight, CheckCircle, Clock,
    AlertCircle, UserPlus, Trash2, Edit, Crown, Mail, Phone, DollarSign, Calculator, AlertTriangle,
    Upload, Download, FileSpreadsheet, XCircle, Calendar, Search, Shield, Award, Briefcase, Store, FileText, Loader2, X, TrendingUp, MapPin, Printer
} from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
};

const EventDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- PAGINATION STATES ---
    const [guestPage, setGuestPage] = useState(1);
    const [contributorPage, setContributorPage] = useState(1);
    const [budgetPage, setBudgetPage] = useState(1);
    const [committeePage, setCommitteePage] = useState(1);
    const itemsPerPage = 8;

    // --- PREVENT DOUBLE SUBMISSION ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- PREVENT FLICKERING EMPTY STATE ---
    const [isTabLoading, setIsTabLoading] = useState(false);

    // --- LEDGER STATE ---
    const [ledger, setLedger] = useState([]);
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerTotal, setLedgerTotal] = useState(0);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [ledgerMonth, setLedgerMonth] = useState('');
    const [ledgerStartDate, setLedgerStartDate] = useState('');
    const [ledgerEndDate, setLedgerEndDate] = useState('');
    const [ledgerType, setLedgerType] = useState('');

    // --- SEARCH STATES ---
    const [guestSearch, setGuestSearch] = useState('');
    const [contributorSearch, setContributorSearch] = useState('');
    const [budgetSearch, setBudgetSearch] = useState('');
    const [committeeSearch, setCommitteeSearch] = useState('');

    // --- BUDGET STATES ---
    const [budgetItems, setBudgetItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ category_id: '', item_name: '', estimated_cost: '', description: '' });
    const [editingBudgetItem, setEditingBudgetItem] = useState(null);

    // --- CONTRIBUTOR STATES ---
    const [showContributorModal, setShowContributorModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [contributorForm, setContributorForm] = useState({
        contact_id: null, full_name: '', phone: '', email: '', pledge_amount: '', is_vip: false, isConversion: false
    });
    const [paymentForm, setPaymentForm] = useState({ pledge_id: '', amount: '', payment_method: 'MPESA' });
    const [selectedPledge, setSelectedPledge] = useState(null);

    // --- GUEST LIST STATES ---
    const [guests, setGuests] = useState([]);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestForm, setGuestForm] = useState({ full_name: '', phone: '', email: '', relationship_label: '', is_vip: false });
    const [editingGuest, setEditingGuest] = useState(null);

    // --- VENDOR STATES ---
    const [vendors, setVendors] = useState([]);
    const [isVendorPaymentModalOpen, setIsVendorPaymentModalOpen] = useState(false);
    const [selectedVendorBooking, setSelectedVendorBooking] = useState(null);
    const [vendorPaymentInfo, setVendorPaymentInfo] = useState(null);
    const [vendorPaymentData, setVendorPaymentData] = useState({
        amount: '',
        milestone: 'DEPOSIT',
        payment_method: 'BANK_TRANSFER',
        transaction_reference: '',
        proof_attachment: null,
        notes: ''
    });

    // --- COMMITTEE STATES ---
    const [committee, setCommittee] = useState([]);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [committeeForm, setCommitteeForm] = useState({
        first_name: '', last_name: '', phone: '', committee_role: 'MEMBER'
    });
    const [editingCommitteeMember, setEditingCommitteeMember] = useState(null);
    const [committeeResult, setCommitteeResult] = useState(null);
    const [vendorResult, setVendorResult] = useState(null);
    const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false);

    // --- COMMITTEE STATES ---
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // --- PROFESSIONAL DOCUMENT MODAL ---
    const [selectedDoc, setSelectedDoc] = useState(null);

    const ProfessionalDocumentModal = ({ doc, event, onClose }) => {
        if (!doc) return null;
        const isInvoice = doc.type === 'Payment Receipt' || doc.type === 'Expense Invoice' || doc.type === 'Service Invoice';
        const isNegotiation = doc.type === 'Service Inquiry' || doc.type === 'Request for Quote';
        
        // Use the labels passed directly from the trigger functions
        const senderLabel = doc.sender_label || (isNegotiation ? 'From: Event Host' : 'From: Service Provider');
        const senderName = doc.sender_name || (isNegotiation ? doc.recipient_name : (doc.business_name || 'Verified Vendor'));
        
        const recipientLabel = doc.recipient_label || (isNegotiation ? 'To: Service Provider' : 'To: Event Host');
        const recipientName = doc.recipient_name || (isNegotiation ? (doc.business_name || 'Verified Vendor') : doc.recipient_name);

        // Determine the "Final" value to show in the big total box
        const documentTotal = doc.last_quote && parseFloat(doc.last_quote) > 0 ? parseFloat(doc.last_quote) : doc.amount;

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
                <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200 dark:border-slate-800 print-container" onClick={e => e.stopPropagation()}>
                    {/* Document Content Area */}
                    <div id="document-content" className="p-8 md:p-12 space-y-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8">
                            <div>
                                <h1 className="font-black text-2xl text-brand-600 tracking-tighter uppercase">HarusiYangu</h1>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{isNegotiation ? 'Official Service Inquiry' : 'Financial Statement / Invoice'}</p>
                            </div>
                            <div className="text-right">
                                <h2 className={`text-2xl font-black uppercase tracking-tighter ${isInvoice ? 'text-emerald-600' : 'text-brand-600'}`}>{isInvoice ? 'INVOICE' : 'INQUIRY'}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">Ref: {doc.ref_number}</p>
                                <p className="text-slate-400 font-bold text-[9px] uppercase mt-1">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>

                        {/* Parties Section */}
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">{senderLabel}</p>
                                <p className="font-black text-slate-900 dark:text-white text-base">{senderName}</p>
                                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold leading-relaxed flex items-center gap-1.5"><Phone size={12} /> {doc.vendor_phone || 'Verified Marketplace Vendor'}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">{recipientLabel}</p>
                                <p className="font-black text-slate-900 dark:text-white text-base">{recipientName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">HarusiYangu User</p>
                            </div>
                        </div>

                        {/* Milestones Schedule (Dates + Amounts) */}
                        {doc.milestones && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-brand-600" /> Milestone Payment Schedule
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {Object.entries(doc.milestones).filter(([k]) => k.startsWith('phase')).map(([key, phase]) => (
                                        <div key={key} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase">{phase.name}</p>
                                                <p className="text-[8px] font-bold text-brand-600 uppercase">{phase.due_date ? `Due: ${new Date(phase.due_date).toLocaleDateString('en-GB')}` : 'Immediate'}</p>
                                            </div>
                                            <p className="text-lg font-black text-slate-900 dark:text-white leading-none mb-2">{formatCurrency(phase.amount)}</p>
                                            <p className="text-[9px] text-slate-500 leading-relaxed font-medium italic">"{phase.description}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Vendor Payout Accounts */}
                        {doc.payout_accounts && doc.payout_accounts.length > 0 && (
                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-inner">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Wallet size={14} className="text-emerald-600" /> Official Payout Options
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {doc.payout_accounts.map((acc, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                            {acc.is_primary && <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase rounded-bl-lg">Primary</div>}
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 font-bold text-[10px] uppercase">{acc.provider?.substring(0, 2)}</div>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{acc.type} - {acc.provider}</p>
                                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{acc.account_name}</p>
                                                <p className="text-xs font-mono font-black text-emerald-600 select-all">{acc.account_number}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Itemized Breakdown Section */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 flex justify-between rounded-t-xl border-x border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description of Service</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (TZS)</span>
                            </div>
                            
                            <div className="border border-slate-200 dark:border-slate-800 rounded-b-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {/* Row 1: Primary Service & Host Bargain */}
                                <div className="p-6 bg-white dark:bg-slate-900">
                                    <div className="flex justify-between items-start gap-8">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest mb-1">{isNegotiation ? 'Service Required' : 'Contracted Service'}</p>
                                            <p className="font-black text-slate-900 dark:text-white text-lg mb-2">{doc.service_name}</p>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{isNegotiation ? 'Host Inquiry Notes' : 'Contract Notes'}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{doc.description || 'Service details provided via platform.'}"</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{isNegotiation ? 'Host Initial Offer' : 'Subtotal'}</p>
                                            <p className="font-black text-xl text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(doc.amount)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Vendor Response (Only in Inquiry/Invoice if quote changed) */}
                                {doc.last_quote && parseFloat(doc.last_quote) > 0 && parseFloat(doc.last_quote) !== parseFloat(doc.amount) && (
                                    <div className="p-6 bg-emerald-50/20 dark:bg-emerald-900/5 border-l-4 border-emerald-500">
                                        <div className="flex justify-between items-start gap-8">
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Vendor Official Quote</p>
                                                <p className="font-black text-slate-900 dark:text-white text-base mb-2">Quote Adjustment</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                                    "{doc.vendor_description || 'The vendor has provided an updated quote for this service.'}"
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Adjusted Total</p>
                                                <p className="font-black text-xl text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(doc.last_quote)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Summary Footer */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border-2 ${doc.is_paid ? 'border-emerald-500/20 bg-emerald-50/5 text-emerald-600' : 'border-brand-500/20 bg-brand-50/5 text-brand-600'}`}>
                                <div className={`h-2 w-2 rounded-full animate-pulse ${doc.is_paid ? 'bg-emerald-500' : 'bg-brand-500'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{doc.is_paid ? 'Transaction Completed' : 'Status: Negotiation Pending'}</span>
                            </div>

                            <div className="bg-slate-900 dark:bg-brand-600 text-white rounded-2xl px-8 py-4 text-center min-w-[240px] shadow-lg shadow-brand-500/10">
                                <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">{isNegotiation ? 'Current Document Value' : 'Total Invoice Amount'}</p>
                                <p className="text-2xl font-black">{formatCurrency(documentTotal)}</p>
                            </div>
                        </div>

                        <div className="text-center pt-8">
                            <p className="text-[9px] text-slate-400 font-medium italic">Thank you for choosing HarusiYangu Marketplace. This is an official system-generated document.</p>
                        </div>
                    </div>

                    {/* Controls - HIDDEN DURING PRINT */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-center gap-3 no-print">
                        <button onClick={() => window.print()} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                            <Printer size={14} /> Print / Save as PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const canAccess = (permissionName) => {
        if (user?.role === 'SUPER_ADMIN') return true;
        if (user?.id === event?.owner_user_id) return true;

        // Find membership for THIS specific event
        const membership = user?.committee_memberships?.find(m => m.event_id === id);
        if (!membership) return false;

        // Map frontend permission strings to the boolean flags in the DB
        const permMap = {
            'view-event-budget': membership.permissions.can_manage_budget,
            'view-event-contributions': membership.permissions.can_manage_contributions,
            'view-event-guests': membership.permissions.can_send_messages, // Guest management
            'manage-event-vendors': membership.permissions.can_manage_vendors,
            'scan-event-qr': membership.permissions.can_scan_cards,
            'manage-event-committee': membership.committee_role === 'CHAIRPERSON'
        };

        return permMap[permissionName] || false;
    };

    const fetchLedger = async () => {
        try {
            const res = await api.get(`/events/${id}/wallet/ledger`, {
                params: {
                    page: ledgerPage,
                    search: ledgerSearch,
                    month: ledgerMonth,
                    type: ledgerType
                }
            });
            // Handle paginated response: data contains the items, meta contains pagination
            setLedger(res.data.data || []);
            setLedgerTotal(res.data.meta?.total || 0);
        } catch (err) { console.error("Ledger fetch error", err); }
    };

    // Re-fetch when filters change
    useEffect(() => {
        if (activeTab === 'finance') {
            fetchLedger();
        }
    }, [ledgerPage, ledgerMonth, ledgerType]);

    // Use a separate effect for search with debounce if needed, but for now simple:
    useEffect(() => {
        if (activeTab === 'finance') {
            const delayDebounceFn = setTimeout(() => {
                fetchLedger();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [ledgerSearch]);

    useEffect(() => {
        const loadData = async () => {
            if (!event) {
                await fetchEventDetails();
            }

            setIsTabLoading(true);
            try {
                if (activeTab === 'overview') {
                    if (canAccess('view-event-guests')) await fetchGuests();
                    if (canAccess('view-event-budget')) {
                        await fetchCategories();
                        await fetchBudget();
                    }
                    if (canAccess('manage-event-vendors')) await fetchVendors();
                } else if (activeTab === 'guests') {
                    if (canAccess('view-event-guests')) await fetchGuests();
                } else if (activeTab === 'budget') {
                    if (canAccess('view-event-budget')) {
                        await fetchCategories();
                        await fetchBudget();
                    }
                } else if (activeTab === 'committee') {
                    if (canAccess('manage-event-committee')) await fetchCommittee();
                } else if (activeTab === 'vendors') {
                    if (canAccess('manage-event-vendors')) await fetchVendors();
                } else if (activeTab === 'contributors') {
                    if (canAccess('view-event-contributions')) {
                        await fetchGuests();
                    }
                } else if (activeTab === 'finance') {
                    if (canAccess('view-event-contributions')) {
                        await fetchLedger();
                    }
                }
            } finally {
                setIsTabLoading(false);
            }
        };

        loadData();
    }, [id, activeTab, user, event, ledgerPage]);

    useEffect(() => {
        if (event) {
            document.title = event.event_name;
            return () => { document.title = 'HarusiYangu'; };
        }
    }, [event]);

    const handleAuthenticatedDownload = async (url, filename) => {
        try {
            const response = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download file.");
        }
    };

    const fetchEventDetails = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data.data);
        } catch (err) {
            if (err.response?.status === 404) navigate('/events');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/budget-categories');
            setCategories(res.data.data || []);
        } catch (err) { console.error("Failed to load categories", err); }
    };

    const fetchBudget = async () => {
        try {
            const res = await api.get(`/events/${id}/budget-items`);
            setBudgetItems(res.data.data || []);
            setBudgetPage(1);
        } catch (err) { console.error(err); }
    };

    const handleStatusChange = async (itemId, newStatus) => {
        try {
            await api.put(`/events/${id}/budget-items/${itemId}`, { budget_item_status: newStatus });
            setBudgetItems(prev => prev.map(item => item.id === itemId ? { ...item, budget_item_status: newStatus } : item));
            showToast('Status updated successfully.', 'success');
        } catch (err) { 
            showToast('Failed to update status.', 'error');
        }
    };

    const handleSaveBudget = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editingBudgetItem) {
                await api.put(`/events/${id}/budget-items/${editingBudgetItem.id}`, budgetForm);
                showToast('Budget item updated successfully!', 'success');
            } else {
                await api.post(`/events/${id}/budget-items`, budgetForm);
                showToast('Budget item added successfully!', 'success');
            }
            setShowBudgetModal(false);
            setBudgetForm({ category_id: '', item_name: '', estimated_cost: '', description: '' });
            setEditingBudgetItem(null);
            fetchBudget();
        } catch (err) { 
            showToast(err.response?.data?.message || "Failed to save budget item", 'error'); 
        }
        finally { setIsSubmitting(false); }
    };

    const handleEditBudget = (item) => {
        setEditingBudgetItem(item);
        setBudgetForm({
            category_id: item.category_id, item_name: item.item_name,
            estimated_cost: item.estimated_cost, description: item.description || ''
        });
        setShowBudgetModal(true);
    };

    const handleDeleteBudget = async (itemId) => {
        if (!confirm("Are you sure you want to delete this budget item?")) return;
        setIsSubmitting(true);
        try { 
            await api.delete(`/events/${id}/budget-items/${itemId}`); 
            fetchBudget(); 
            showToast('Budget item deleted.', 'success');
        } catch (err) { 
            showToast('Failed to delete item.', 'error'); 
        } finally { setIsSubmitting(false); }
    };

    const fetchGuests = async () => {
        try {
            const res = await api.get(`/events/${id}/contacts`);
            setGuests(res.data.data);
            setGuestPage(1);
        } catch (err) { console.error(err); }
    };

    const handleSaveGuest = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editingGuest) {
                await api.put(`/events/${id}/contacts/${editingGuest.id}`, guestForm);
                showToast('Guest profile updated successfully.', 'success');
            } else {
                await api.post(`/events/${id}/contacts`, guestForm);
                showToast('Guest added to the list.', 'success');
            }
            setShowGuestModal(false);
            setGuestForm({ full_name: '', phone: '', email: '', relationship_label: '', is_vip: false });
            setEditingGuest(null);
            fetchGuests();
        } catch (err) { 
            const msg = err.response?.data?.message || "Failed to save guest";
            showToast(msg, 'error'); 
        }
        finally { setIsSubmitting(false); }
    };

    const handleEditGuest = (guest) => {
        setEditingGuest(guest);
        setGuestForm({
            full_name: guest.full_name, phone: guest.phone, email: guest.email || '',
            relationship_label: guest.relationship_label || '', is_vip: guest.is_vip
        });
        setShowGuestModal(true);
    };

    const handleDeleteGuest = async (guestId) => {
        if (!confirm("Are you sure you want to remove this contact?")) return;
        setIsSubmitting(true);
        try { 
            await api.delete(`/events/${id}/contacts/${guestId}`); 
            fetchGuests(); 
            showToast('Contact removed successfully.', 'success');
        } catch (err) { 
            showToast(err.response?.data?.message || "Failed to delete guest", 'error'); 
        } finally { setIsSubmitting(false); }
    };

    const fetchCommittee = async () => {
        try {
            const res = await api.get(`/events/${id}/committee-members`);
            setCommittee(res.data.data || []);
            setCommitteePage(1);
        } catch (err) {
            console.error("Committee fetch error", err);
            setCommittee([]);
        }
    };

    // --- AUTO-CLEAR COMMITTEE MESSAGES ---
    useEffect(() => {
        if (committeeResult) {
            const timer = setTimeout(() => setCommitteeResult(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [committeeResult]);

    const handleSaveCommittee = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editingCommitteeMember) {
                await api.put(`/events/${id}/committee-members/${editingCommitteeMember.id}`, committeeForm);
                showToast('Committee member role updated!', 'success');
            } else {
                await api.post(`/events/${id}/committee-members`, committeeForm);
                showToast('Member added to committee!', 'success');
            }
            setShowCommitteeModal(false);
            setCommitteeForm({ first_name: '', last_name: '', phone: '', committee_role: 'MEMBER' });
            setEditingCommitteeMember(null);
            fetchCommittee();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save committee member", 'error');
        }
        finally { setIsSubmitting(false); }
    };

    const handleEditCommittee = (member) => {
        setEditingCommitteeMember(member);
        setCommitteeForm({
            first_name: member.user?.first_name || '',
            last_name: member.user?.last_name || '',
            phone: member.user?.phone || '',
            committee_role: member.committee_role,
        });
        setShowCommitteeModal(true);
    };

    const handleDeleteCommittee = async (memberId) => {
        if (!confirm("Are you sure you want to remove this member from the committee?")) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/events/${id}/committee-members/${memberId}`);
            fetchCommittee();
            showToast('Member removed from committee.', 'success');
        }
        catch (err) {
            showToast('Failed to remove member.', 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleDownloadTemplate = () => {
        handleAuthenticatedDownload(`/events/${id}/contacts/template`, 'guests_template.xlsx');
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) { showToast("Please select a file first.", "warning"); return; }
        if (importing) return;
        setImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const res = await api.post(`/events/${id}/contacts/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const data = res.data.data;
            setImportResult({ message: `Success: ${data.imported} guests added. Skipped: ${data.skipped}.`, errors: data.errors || [] });
            if (data.imported > 0) { 
                fetchGuests(); 
                setImportFile(null); 
                showToast(`Successfully imported ${data.imported} guests.`, 'success');
            }
        } catch (err) { 
            showToast(err.response?.data?.message || "Import failed", 'error'); 
        }
        finally { setImporting(false); }
    };

    const openPledgeFromGuest = (guest) => {
        setContributorForm({
            contact_id: guest.id, full_name: guest.full_name, phone: guest.phone, email: guest.email || '',
            pledge_amount: '', is_vip: guest.is_vip, isConversion: true
        });
        setShowContributorModal(true);
    };

    const handleAddContributor = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload = contributorForm.isConversion
                ? { contact_id: contributorForm.contact_id, pledge_amount: contributorForm.pledge_amount, is_vip: contributorForm.is_vip }
                : contributorForm;
            await api.post(`/events/${id}/contributors`, payload);
            setShowContributorModal(false);
            setContributorForm({ contact_id: null, full_name: '', phone: '', email: '', pledge_amount: '', is_vip: false, isConversion: false });
            fetchEventDetails();
            showToast('Pledge recorded successfully!', 'success');
            if (activeTab === 'guests') fetchGuests();
        } catch (err) { 
            showToast(err.response?.data?.message || "Failed to add contributor", 'error'); 
        }
        finally { setIsSubmitting(false); }
    };

    const openPaymentModal = (pledge) => {
        setSelectedPledge(pledge);
        setPaymentForm({ pledge_id: pledge.id, amount: pledge.outstanding_amount, payment_method: 'MPESA' });
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.post(`/events/${id}/payments`, paymentForm);
            setShowPaymentModal(false);
            fetchEventDetails();
            showToast('Payment verified and recorded.', 'success');
        } catch (err) { 
            showToast(err.response?.data?.message || "Payment recording failed", 'error'); 
        }
        finally { setIsSubmitting(false); }
    };

    // --- VENDOR FUNCTIONS ---
    const openRFQ = (v) => {
        // Splitting by 'Invoice Note: ' which is used in the backend
        const notesParts = (v.contract_notes || '').split("\n\nInvoice Note: ");
        const hostBargainDesc = notesParts[0];
        const vendorQuoteDesc = notesParts[1] || '';
        const isInvoice = ['QUOTED', 'ACCEPTED', 'COMPLETED'].includes(v.status);
        const hostOffer = v.metadata?.target_amount ? parseFloat(v.metadata.target_amount) : 0;
        const hostFullName = event?.owner?.first_name ? (event.owner.first_name + ' ' + (event.owner.last_name || '')) : 'Verified Host';

        setSelectedDoc({
            type: isInvoice ? 'Service Invoice' : 'Service Inquiry',
            ref_number: `${isInvoice ? 'INV' : 'INQ'}-${v.id.substring(0, 8).toUpperCase()}`,
            sender_label: isInvoice ? 'From: Service Provider' : 'From: Event Host',
            sender_name: isInvoice ? v.vendor?.business_name : hostFullName,
            recipient_label: isInvoice ? 'To: Event Host' : 'To: Service Provider',
            recipient_name: isInvoice ? hostFullName : v.vendor?.business_name,
            service_name: v.assigned_service,
            // Capture all details
            description: hostBargainDesc || 'Host inquiry notes.',
            vendor_description: vendorQuoteDesc,
            amount: hostOffer,
            last_quote: v.last_quote_amount,
            bargain_amount: hostOffer,
            milestones: v.metadata?.milestones || null,
            vendor_phone: v.vendor?.phone,
            is_paid: v.status === 'COMPLETED',
            payout_accounts: v.metadata?.milestones?.payout_accounts || []
        });
    };

    const openInvoice = (entry) => {
        if (!entry) return;
        let recipient = entry.metadata?.contact_name || entry.metadata?.vendor_name;
        if (!recipient && entry.description?.includes('from ')) {
            recipient = entry.description.split('from ')[1].split(' via')[0];
        }
        if (!recipient) {
            recipient = event?.owner?.first_name ? (event.owner.first_name + ' ' + (event.owner.last_name || '')) : 'Verified Member';
        }

        const sourceTypeLabel = (entry.source_type || 'Transaction').replace(/_/g, ' ');
        const isCredit = entry.entry_type === 'CREDIT';
        const hostFullName = event?.owner?.first_name ? (event.owner.first_name + ' ' + (event.owner.last_name || '')) : 'Verified Host';

        setSelectedDoc({
            type: isCredit ? 'Payment Receipt' : 'Expense Invoice',
            ref_number: `REF-${(entry.id || '0000').substring(0, 8).toUpperCase()}`,
            sender_label: isCredit ? 'From: Contributor' : 'From: Event Host',
            sender_name: isCredit ? recipient : hostFullName,
            recipient_label: isCredit ? 'To: Event Host' : 'To: Service Provider',
            recipient_name: isCredit ? hostFullName : (entry.metadata?.vendor_name || 'Service Provider'),
            service_name: entry.description || 'Verified Financial Movement',
            description: `This transaction was successfully processed and verified via ${sourceTypeLabel}.`,
            amount: entry.amount || 0,
            is_paid: true,
            notes: `Internal Trace ID: ${(entry.source_id || 'N/A').substring(0, 12).toUpperCase()}. This document is a computer-generated summary of the verified ledger entry.`
        });
    };

    const fetchVendors = async () => {
        try {
            const res = await api.get(`/events/${id}/vendors`);
            setVendors(res.data.data || []);
        } catch (err) { 
            console.error(err);
            setVendorResult({ type: 'error', message: "Failed to load vendors." });
        }
    };

    const handleAcceptQuote = async (bookingId) => {
        if (!confirm("Are you sure you want to accept this quote? This will finalize the price and link it to your budget.")) return;
        setIsSubmitting(true);
        try {
            await api.put(`/bookings/${bookingId}/accept`);
            await fetchVendors();
            fetchBudget();
            setVendorResult({ type: 'success', message: "Quote accepted successfully! Vendor notified." });
        } catch (err) {
            setVendorResult({ type: 'error', message: err.response?.data?.message || "Failed to accept quote" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmService = async (bookingId) => {
        if (!confirm("Confirming service will release all held funds to the vendor and mark this booking as COMPLETED. Proceed?")) return;
        setIsSubmitting(true);
        try {
            await api.put(`/bookings/${bookingId}/confirm-service`);
            await fetchVendors();
            fetchEventDetails();
            setVendorResult({ type: 'success', message: "Service confirmed! Funds released to vendor wallet." });
        } catch (err) {
            setVendorResult({ type: 'error', message: err.response?.data?.message || "Failed to confirm service" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVendor = async (bookingId) => {
        if (!confirm("Are you sure you want to cancel this inquiry? This will notify the vendor.")) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/bookings/${bookingId}`);
            await fetchVendors();
            setVendorResult({ type: 'success', message: "Inquiry cancelled successfully." });
        } catch (err) {
            setVendorResult({ type: 'error', message: err.response?.data?.message || "Failed to cancel inquiry" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openVendorPaymentModal = async (booking) => {
        setSelectedVendorBooking(booking);
        setIsVendorPaymentModalOpen(true);
        setIsLoadingPaymentInfo(true);
        try {
            const res = await api.get(`/bookings/${booking.id}/payments`);
            const data = res.data.data;
            setVendorPaymentInfo(data);
            setVendorPaymentData(prev => ({
                ...prev,
                amount: data.next_suggested.amount,
                milestone: data.next_suggested.milestone
            }));
        } catch (err) {
            console.error("Failed to load payment info", err);
        } finally {
            setIsLoadingPaymentInfo(false);
        }
    };

    const handleRecordVendorPayment = async (e) => {
        e.preventDefault();
        if (!vendorPaymentData.amount || parseFloat(vendorPaymentData.amount) <= 0) {
            setVendorResult({ type: 'error', message: "Please enter a valid amount" });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', vendorPaymentData.amount);
            formData.append('milestone', vendorPaymentData.milestone);
            formData.append('payment_method', vendorPaymentData.payment_method);
            formData.append('transaction_reference', vendorPaymentData.transaction_reference || '');
            formData.append('notes', vendorPaymentData.notes || '');
            
            if (vendorPaymentData.proof_attachment) {
                formData.append('proof_attachment', vendorPaymentData.proof_attachment);
            }

            await api.post(`/bookings/${selectedVendorBooking.id}/payments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setIsVendorPaymentModalOpen(false);
            await fetchVendors();
            fetchEventDetails();
            setVendorResult({ type: 'success', message: "Vendor payment recorded successfully!" });
        } catch (err) {
            setVendorResult({ type: 'error', message: err.response?.data?.message || "Payment recording failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- HELPERS ---
    const paginate = (array, page, perPage) => array.slice((page - 1) * perPage, page * perPage);

    const filteredGuests = guests.filter(g =>
        g.full_name.toLowerCase().includes(guestSearch.toLowerCase()) ||
        (g.phone && g.phone.includes(guestSearch))
    );
    const contributorsList = event?.contacts?.filter(c => c.pledge) || [];
    const filteredContributors = contributorsList.filter(c =>
        c.full_name.toLowerCase().includes(contributorSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(contributorSearch))
    );
    const filteredBudget = budgetItems.filter(b =>
        b.item_name.toLowerCase().includes(budgetSearch.toLowerCase()) ||
        (b.category && b.category.category_name.toLowerCase().includes(budgetSearch.toLowerCase()))
    );
    const filteredCommittee = committee.filter(c =>
        (c.user?.full_name && c.user.full_name.toLowerCase().includes(committeeSearch.toLowerCase())) ||
        (c.user?.first_name && c.user.first_name.toLowerCase().includes(committeeSearch.toLowerCase())) ||
        (c.user?.last_name && c.user.last_name.toLowerCase().includes(committeeSearch.toLowerCase())) ||
        (c.user?.phone && c.user.phone.includes(committeeSearch))
    );

    const displayedGuests = paginate(filteredGuests, guestPage, itemsPerPage);
    const displayedContributors = paginate(filteredContributors, contributorPage, itemsPerPage);
    const displayedBudget = paginate(filteredBudget, budgetPage, itemsPerPage);
    const displayedCommittee = paginate(filteredCommittee, committeePage, itemsPerPage);

    const totalPledged = event?.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
    const totalPaid = event?.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
    const totalBudgetPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.estimated_cost), 0);
    const totalGuestsCount = guests.length;
    const totalContributorsCount = contributorsList.length;
    const paidContributorsCount = contributorsList.filter(c => c.pledge.contribution_status === 'PAID').length;
    const unpaidContributorsCount = totalContributorsCount - paidContributorsCount;

    const calculateDaysRemaining = (eventDateStr) => {
        if (!eventDateStr) return 0;
        const eventDate = new Date(eventDateStr);
        if (isNaN(eventDate.getTime())) return 0;
        const today = new Date();
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };
    const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;
    const isOverBudget = totalBudgetPlanned > (event?.target_budget || 0);
    const budgetProgressPercent = event?.target_budget > 0 ? (totalBudgetPlanned / event.target_budget) * 100 : 100;

    // --- DYNAMIC TAB FILTERING (ALL TABS BROO) ---
    const availableTabs = useMemo(() => [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'guests', label: 'Guests', icon: Users },
        { id: 'contributors', label: 'Contributors', icon: Users },
        { id: 'finance', label: 'Finance', icon: Wallet },
        { id: 'budget', label: 'Budget', icon: DollarSign },
        { id: 'vendors', label: 'Vendors', icon: Store },
        { id: 'committee', label: 'Committee', icon: Shield }
    ].filter(tab => {
        if (tab.id === 'overview') return true;

        if (tab.id === 'guests') return canAccess('view-event-guests');
        if (tab.id === 'contributors') return canAccess('view-event-contributions');
        if (tab.id === 'finance') return canAccess('view-event-contributions');
        if (tab.id === 'budget') return canAccess('view-event-budget');
        if (tab.id === 'vendors') return canAccess('manage-event-vendors');
        if (tab.id === 'committee') return canAccess('manage-event-committee');
        return false;
    }), [user, event, id]);
    // --- SECURITY REDIRECT: Ensure user doesn't stay on unauthorized tab ---
    useEffect(() => {
        if (!loading && event) {
            const isTabAuthorized = availableTabs.some(t => t.id === activeTab);
            if (!isTabAuthorized) {
                setActiveTab('overview');
            }
        }
    }, [activeTab, availableTabs, loading, event]);

    if (loading) return <div className="text-center p-10">Loading Event Details...</div>;

    return (
        <div className="space-y-6">
            {/* Header Card (Restored from 260aee1) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                    <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-bold px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800 uppercase tracking-widest">
                        {event.event_status}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <Calendar size={40} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/events')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><ArrowLeft size={18} /></button>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{event.event_name}</h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5"><Calendar size={16} className="text-brand-500" /> {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div className="flex items-center gap-1.5"><MapPin size={16} className="text-brand-500" /> {event.venue_name || 'Venue not set'}{event.region ? `, ${event.region}` : ''}</div>
                            <div className="flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400"><Store size={16} /> {event.event_type.replace('_', ' ')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Restored from 260aee1) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-sm">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6 animate-in fade-in duration-300">

                {/* 1. OVERVIEW (CAREFULLY FILTERED STATS) */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* CAREFULLY FILTERED BUDGET STATS */}
                            {canAccess('view-event-budget') && <StatCard title="Total Budget" value={formatCurrency(event.target_budget)} icon={Wallet} color="blue" />}
                            {canAccess('view-event-contributions') && <StatCard title="Current Wallet Balance" value={formatCurrency(event.wallet?.current_balance || 0)} icon={Shield} color="emerald" />}
                            {canAccess('view-event-contributions') && <StatCard title="Collected" value={formatCurrency(totalPaid)} icon={CheckCircle} color="emerald" />}
                            {canAccess('view-event-guests') && <StatCard title="Total Guests" value={totalGuestsCount} icon={Users} color="purple" />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {canAccess('view-event-contributions') && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contributors</p><p className="text-3xl font-bold text-brand-600 mt-1">{totalContributorsCount}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> {paidContributorsCount} Paid</span><span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={10} /> {unpaidContributorsCount} Pending</span></div></div>
                                    <div className="p-4 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-full"><CreditCard size={28} /></div>
                                </div>
                            )}
                            {canAccess('view-event-contributions') && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Outstanding</p><p className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(totalPledged - totalPaid)}</p><p className="text-xs text-slate-400 mt-1">To be collected</p></div>
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-full"><AlertCircle size={28} /></div>
                                </div>
                            )}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Days Remaining</p><p className={`text-3xl font-bold mt-1 ${daysRemaining < 30 ? 'text-red-600' : 'text-blue-600'}`}>{daysRemaining}</p><p className="text-xs text-slate-400 mt-1">Until Event Date</p></div>
                                <div className={`p-4 rounded-full ${daysRemaining < 30 ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}><Calendar size={28} /></div>
                            </div>
                        </div>

                        {/* PROGRESS BARS ISOLATION */}
                        {(canAccess('view-event-contributions') || canAccess('view-event-budget')) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {canAccess('view-event-contributions') && (
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Collection Rate</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{totalPledged > 0 ? ((totalPaid / totalPledged) * 100).toFixed(1) : 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                            <div className="bg-brand-600 h-3 rounded-full transition-all duration-500" style={{ width: `${totalPledged > 0 ? (totalPaid / totalPledged) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                )}
                                {canAccess('view-event-budget') && (
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Budget Utilization</span>
                                            <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>{budgetProgressPercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                            <div className={`h-3 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgressPercent, 100)}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. GUEST LIST */}
                {activeTab === 'guests' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search guests by name or phone..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={guestSearch} onChange={e => { setGuestSearch(e.target.value); setGuestPage(1); }} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><Download size={14} /> Sample</button>
                                <button onClick={() => handleAuthenticatedDownload(`/events/${id}/contacts/export`, `guests_${event.event_name}.xlsx`)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><FileSpreadsheet size={14} /> Export</button>
                                <label className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-bold hover:bg-brand-100 transition-colors cursor-pointer"><Upload size={14} /> Import <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => { setImportFile(e.target.files[0]); setImportResult(null); }} /></label>
                                <button onClick={() => { setEditingGuest(null); setGuestForm({ full_name: '', phone: '', email: '', relationship_label: '', is_vip: false }); setShowGuestModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-brand-700 transition-all"><Plus size={16} /> Add Guest</button>
                            </div>
                        </div>

                        {importFile && (
                            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><FileSpreadsheet size={16} className="text-emerald-500" /></div>
                                    <span className="text-sm font-medium dark:text-white">{importFile.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleImport} disabled={importing} className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">{importing ? 'Processing...' : 'Upload Now'}</button>
                                    <button onClick={() => setImportFile(null)} className="p-1.5 text-slate-400 hover:text-red-500"><XCircle size={18} /></button>
                                </div>
                            </div>
                        )}

                        {importResult && (
                            <div className={`p-4 rounded-xl border animate-in zoom-in duration-300 ${importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                                <p className={`text-sm font-bold mb-2 ${importResult.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>{importResult.message}</p>
                                {importResult.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-[10px] font-black uppercase text-yellow-900 mb-1 tracking-widest">Skipped Rows:</p>
                                        <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1 max-h-24 overflow-y-auto">
                                            {importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Guest Info</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Loading data...</td></tr>
                                        ) : displayedGuests.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No guests found.</td></tr>
                                        ) : (
                                            displayedGuests.map((guest, index) => (
                                                <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4 text-center text-slate-300 font-mono text-xs">{(guestPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            {guest.full_name}
                                                            {guest.is_vip && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
                                                        </div>
                                                        {guest.relationship_label && <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-0.5">{guest.relationship_label}</div>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            {guest.phone && <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Phone size={12} className="text-brand-500" />{guest.phone}</span>}
                                                            {guest.email && <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><Mail size={12} />{guest.email}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {guest.pledge ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 shadow-sm"><CheckCircle size={10} /> Contributor</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Guest</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {!guest.pledge && <button onClick={() => openPledgeFromGuest(guest)} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-brand-700 transition-all shadow-sm flex items-center gap-1"><DollarSign size={12} /> Pledge</button>}
                                                            <button onClick={() => handleEditGuest(guest)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={16} /></button>
                                                            <button onClick={() => handleDeleteGuest(guest.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredGuests.length} currentPage={guestPage} onPageChange={setGuestPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* 3. CONTRIBUTORS TAB (Restored Guests + Pledges) */}
                {activeTab === 'contributors' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* --- CONTRIBUTOR SUMMARY STATS --- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pledged</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPledged)}</p>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Collected</p>
                                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm">
                                <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Outstanding</p>
                                <p className="text-xl font-black text-orange-700 dark:text-orange-300">{formatCurrency(totalPledged - totalPaid)}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search contributors by name..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={contributorSearch} onChange={e => { setContributorSearch(e.target.value); setContributorPage(1); }} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleAuthenticatedDownload(`/events/${id}/contributors/export`, `contributors_${event.event_name}.xlsx`)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><FileSpreadsheet size={14} /> Export</button>
                                <button onClick={() => { setContributorForm({ contact_id: null, full_name: '', phone: '', email: '', pledge_amount: '', is_vip: false, isConversion: false }); setShowContributorModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-brand-700 transition-all"><Plus size={16} /> Add Pledge</button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 w-12 text-center">#</th>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4 text-right">Pledged</th>
                                            <th className="px-6 py-4 text-right">Paid</th>
                                            <th className="px-6 py-4 text-right">Outstanding</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">Loading list...</td></tr> : displayedContributors.length === 0 ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">No contributors found.</td></tr> : displayedContributors.map((contact, index) => {
                                            const pledge = contact.pledge;
                                            let statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">Pledged</span>;
                                            if (pledge.contribution_status === 'PARTIALLY_PAID') statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100">Partial</span>;
                                            if (pledge.contribution_status === 'PAID') statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">Paid</span>;
                                            return (
                                                <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-center text-slate-300 font-mono text-xs">{(contributorPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{contact.full_name}</td>
                                                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(pledge.pledge_amount)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(pledge.amount_paid)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-orange-600">{formatCurrency(pledge.outstanding_amount)}</td>
                                                    <td className="px-6 py-4 text-center">{statusBadge}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {pledge.contribution_status !== 'PAID' && <button onClick={() => openPaymentModal(pledge)} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-brand-700 transition-all shadow-sm">Record Payment</button>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredContributors.length} currentPage={contributorPage} onPageChange={setContributorPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* --- FINANCE TAB (WALLET & LEDGER) --- */}
                {activeTab === 'finance' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Summary Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                                    <FileText className="text-emerald-500" size={16} /> Transaction History
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Digital Mirror of Manual Payments</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Inflow</p>
                                    <p className="text-sm font-black text-emerald-600 tracking-tight">{formatCurrency(event.wallet?.total_inflow || 0)}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Outflow</p>
                                    <p className="text-sm font-black text-red-600 tracking-tight">{formatCurrency(event.wallet?.total_outflow || 0)}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Balance</p>
                                    <p className="text-sm font-black text-brand-600 tracking-tight">{formatCurrency(event.wallet?.current_balance || 0)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Bar BROO */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="md:col-span-1 relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search description..." 
                                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 bg-transparent dark:text-white font-bold"
                                    value={ledgerSearch}
                                    onChange={e => setLedgerSearch(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">From Date</label>
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 bg-transparent dark:text-white font-bold"
                                    value={ledgerStartDate}
                                    onChange={e => setLedgerStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">To Date</label>
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 bg-transparent dark:text-white font-bold"
                                    value={ledgerEndDate}
                                    onChange={e => setLedgerEndDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">By Month</label>
                                <input 
                                    type="month" 
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 bg-transparent dark:text-white font-bold"
                                    value={ledgerMonth}
                                    onChange={e => setLedgerMonth(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">Type</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 bg-transparent dark:text-white font-bold appearance-none"
                                    value={ledgerType}
                                    onChange={e => setLedgerType(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="CREDIT">Inflow (+)</option>
                                    <option value="DEBIT">Outflow (-)</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? (
                                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium italic"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Loading History...</td></tr>
                                        ) : ledger.length === 0 ? (
                                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium italic">No transactions match your search.</td></tr>
                                        ) : (
                                            ledger.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900 dark:text-white">{new Date(entry.entry_date).toLocaleDateString()}</div>
                                                        <div className="text-[10px] opacity-60 uppercase font-black tracking-tighter">{(entry.source_type || 'TX').replace(/_/g, ' ')}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white leading-tight">{entry.description}</div>
                                                        {entry.payment_status?.reference && entry.payment_status.reference !== 'N/A' && (
                                                            <div className="text-[10px] text-brand-600 dark:text-brand-400 font-mono mt-1">Ref: {entry.payment_status.reference}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${entry.entry_type === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                            {entry.entry_type}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-black ${entry.entry_type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {entry.entry_type === 'CREDIT' ? '+' : '-'} {formatCurrency(entry.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {entry.source_type === 'VENDOR_PAYMENT' ? (
                                                            <span className={`inline-flex items-center gap-1 font-black text-[9px] uppercase px-2 py-1 rounded-lg ${entry.payment_status?.is_confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {entry.payment_status?.is_confirmed ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                                {entry.payment_status?.is_confirmed ? 'Verified' : 'Awaiting Conf.'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-[9px] uppercase"><CheckCircle size={10} /> Verified</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openInvoice(entry)} className="p-2 text-slate-400 hover:text-brand-600 transition-all"><FileText size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={ledgerTotal} currentPage={ledgerPage} onPageChange={setLedgerPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* 4. BUDGET */}
                {activeTab === 'budget' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search items or categories..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={budgetSearch} onChange={e => { setBudgetSearch(e.target.value); setBudgetPage(1); }} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleAuthenticatedDownload(`/events/${id}/budget/export`, `budget_${event.event_name}.xlsx`)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><FileSpreadsheet size={14} /> Export</button>
                                <button onClick={() => { setEditingBudgetItem(null); setBudgetForm({ category_id: '', item_name: '', estimated_cost: '', description: '' }); setShowBudgetModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-brand-700 transition-all"><Plus size={16} /> Add Item</button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2"><span>Budget Utilization</span><span>{isOverBudget ? 'Over Target' : 'Within Target'}</span></div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgressPercent, 100)}%` }}></div></div>
                            <div className="flex justify-between mt-2 text-xs">
                                <span className="font-bold text-slate-600 dark:text-slate-400">Total Planned: {formatCurrency(totalBudgetPlanned)}</span>
                                <span className="font-bold text-brand-600">Target: {formatCurrency(event.target_budget)}</span>
                            </div>
                            {isOverBudget && <div className="mt-3 flex items-center gap-2 text-[10px] text-red-600 font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30 uppercase tracking-tighter"><AlertTriangle size={14} /> Warning: Total planned costs exceed the target budget.</div>}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Item Name</th><th className="px-6 py-4">Category</th><th className="px-6 py-4 text-right">Estimate</th><th className="px-6 py-4 text-right">Actual</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">Loading plan...</td></tr> : displayedBudget.length === 0 ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">No budget items added.</td></tr> : displayedBudget.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center text-slate-300 font-mono text-xs">{(budgetPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4"><div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>{item.description && <div className="text-[10px] text-slate-400 mt-0.5 italic">{item.description}</div>}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">{item.category?.category_name || 'Uncategorized'}</span></td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(item.estimated_cost)}</td>
                                                <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(item.actual_cost)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        title="Status managed automatically by system movements"
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm border ${item.budget_item_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : item.budget_item_status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                                                    >
                                                        {item.budget_item_status.replace('_', ' ')}
                                                    </span>
                                                </td>                                                <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditBudget(item)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={16} /></button><button onClick={() => handleDeleteBudget(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredBudget.length} currentPage={budgetPage} onPageChange={setBudgetPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* 5. VENDORS TAB (Reordered: Negotiations first, then Confirmed) */}
                {activeTab === 'vendors' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative">
                            <div className="relative z-10 text-center md:text-left">
                                <h3 className="text-2xl font-black tracking-tight">Hire Professional Vendors</h3>
                                <p className="text-brand-100 text-sm mt-1 max-w-md">Browse our verified catalog of photographers, decorators, caterers and more.</p>
                                <button onClick={() => navigate('/vendors')} className="mt-6 bg-white text-brand-700 px-8 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-3 shadow-lg shadow-black/20 text-sm uppercase tracking-widest"><Search size={18} /> Visit Catalog</button>
                            </div>
                            <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none transform rotate-12"><Briefcase size={200} /></div>
                        </div>

                        {/* VENDOR FEEDBACK BANNER */}
                        {vendorResult && (
                            <div className={`p-4 rounded-xl border animate-in zoom-in duration-300 flex items-center justify-between ${vendorResult.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                <div className="flex items-center gap-3">
                                    {vendorResult.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                                    <p className="text-sm font-bold">{vendorResult.message}</p>
                                </div>
                                <button onClick={() => setVendorResult(null)} className="p-1 hover:bg-black/5 rounded-full"><X size={16} /></button>
                            </div>
                        )}

                        {/* NEGOTIATIONS SECTION - NOW AT THE TOP */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2"><Briefcase className="text-blue-500" size={16} /> Negotiations & Quotes</h3>
                                <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">In Progress</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <tr><th className="px-6 py-4">#</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Current Status</th><th className="px-6 py-4 text-right">Last Quote</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Loading inquiries...</td></tr>
                                        ) : vendors.filter(v => ['INQUIRY', 'QUOTED'].includes(v.status)).length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">No active inquiries at the moment.</td></tr>
                                        ) : vendors.filter(v => ['INQUIRY', 'QUOTED'].includes(v.status)).map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-300">{idx + 1}</td>
                                                <td className="px-6 py-4"><div className="font-bold text-slate-900 dark:text-white">{v.vendor?.business_name}</div><div className="text-[10px] font-medium text-slate-400 uppercase">{v.assigned_service}</div></td>
                                                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${v.status === 'QUOTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{v.status}</span></td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{v.last_quote_amount && parseFloat(v.last_quote_amount) > 0 ? formatCurrency(v.last_quote_amount) : 'Waiting for Quote'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button onClick={() => openRFQ(v)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" title="View Official RFQ"><FileText size={18} /></button>
                                                        {v.status === 'QUOTED' && <button onClick={() => handleAcceptQuote(v.id)} className="bg-brand-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-md">Accept Quote</button>}
                                                        <button onClick={() => handleDeleteVendor(v.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* CONFIRMED HIRES - NOW AT THE BOTTOM */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2"><Award className="text-emerald-500" size={16} /> Confirmed Hires</h3>
                                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full shadow-sm">Verified</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <tr><th className="px-6 py-4">#</th><th className="px-6 py-4">Vendor Details</th><th className="px-6 py-4">Service Type</th><th className="px-6 py-4 text-right">Contracted</th><th className="px-6 py-4 text-right">Payments</th><th className="px-6 py-4 text-right">Balance</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? (
                                            <tr><td colSpan="7" className="px-6 py-16 text-center text-slate-400 italic">Loading confirmed hires...</td></tr>
                                        ) : vendors.filter(v => v.status === 'ACCEPTED').length === 0 ? (
                                            <tr><td colSpan="7" className="px-6 py-16 text-center text-slate-400 italic">No confirmed hires yet. Find vendors in the catalog.</td></tr>
                                        ) : vendors.filter(v => v.status === 'ACCEPTED').map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-300">{idx + 1}</td>
                                                <td className="px-6 py-4"><div className="font-black text-slate-900 dark:text-white text-base">{v.vendor?.business_name}</div><div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 uppercase tracking-tighter"><Phone size={10} /> {v.vendor?.phone}</div></td>
                                                <td className="px-6 py-4"><span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-black uppercase tracking-widest">{v.assigned_service}</span></td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(v.agreed_amount)}</td>
                                                <td className="px-6 py-4 text-right text-emerald-600 font-black">{formatCurrency(v.amount_paid)}</td>
                                                <td className="px-6 py-4 text-right text-orange-600 font-black">{formatCurrency(v.balance_due)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {parseFloat(v.balance_due) > 0 && <button onClick={() => openVendorPaymentModal(v)} className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl hover:bg-emerald-100 transition-all shadow-sm" title="Record Milestone Payment"><DollarSign size={20} /></button>}
                                                        <button onClick={() => handleConfirmService(v.id)} className="bg-brand-50 text-brand-600 p-2.5 rounded-xl hover:bg-brand-100 transition-all shadow-sm" title="Confirm Service Completion"><CheckCircle size={20} /></button>
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

                {/* 6. COMMITTEE */}
                {activeTab === 'committee' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search members..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={committeeSearch} onChange={e => { setCommitteeSearch(e.target.value); setCommitteePage(1); }} />
                            </div>
                            <button onClick={() => { setEditingCommitteeMember(null); setCommitteeForm({ first_name: '', last_name: '', phone: '', committee_role: 'MEMBER' }); setShowCommitteeModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-brand-700 transition-all"><Plus size={16} /> Add Member</button>
                        </div>

                        {/* COMMITTEE FEEDBACK BANNER */}
                        {committeeResult && (
                            <div className={`p-4 rounded-xl border animate-in zoom-in duration-300 flex items-center justify-between ${committeeResult.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                <div className="flex items-center gap-3">
                                    {committeeResult.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                                    <p className="text-sm font-bold">{committeeResult.message}</p>
                                </div>
                                <button onClick={() => setCommitteeResult(null)} className="p-1 hover:bg-black/5 rounded-full"><X size={16} /></button>
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isTabLoading ? <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">Fetching committee...</td></tr> : displayedCommittee.length === 0 ? <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">No committee members assigned.</td></tr> : displayedCommittee.map((member, index) => (
                                            <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center text-slate-300 font-mono text-xs">{(committeePage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{member.user?.full_name || `${member.user?.first_name} ${member.user?.last_name}`}</td>
                                                <td className="px-6 py-4 font-medium">{member.user?.phone}</td>
                                                <td className="px-6 py-4"><span className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800 shadow-sm">{member.committee_role}</span></td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditCommittee(member)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={16} /></button>
                                                        <button onClick={() => handleDeleteCommittee(member.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredCommittee.length} currentPage={committeePage} onPageChange={setCommitteePage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS (Restored visual perfection) */}

            {/* BUDGET MODAL */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingBudgetItem ? 'Edit Item' : 'Add Item'}</h3><button onClick={() => setShowBudgetModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleSaveBudget} className="p-10 space-y-5">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Item Category</label><select required className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all font-bold appearance-none" value={budgetForm.category_id} onChange={e => setBudgetForm({ ...budgetForm, category_id: e.target.value })}><option value="">Select Category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}</select></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Item Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all font-bold" placeholder="e.g. Catering Services" value={budgetForm.item_name} onChange={e => setBudgetForm({ ...budgetForm, item_name: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Estimated Cost (TZS)</label><input required type="number" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-black text-slate-900 dark:text-white text-xl outline-none focus:ring-4 focus:ring-brand-500/10 transition-all" placeholder="0" value={budgetForm.estimated_cost} onChange={e => setBudgetForm({ ...budgetForm, estimated_cost: e.target.value })} /></div>
                            <div className="pt-6"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3">{isSubmitting ? 'Processing...' : <><CheckCircle size={20} /> Save Budget Item</>}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* GUEST MODAL */}
            {showGuestModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingGuest ? 'Edit Profile' : 'New Guest'}</h3><button onClick={() => setShowGuestModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleSaveGuest} className="p-10 space-y-5">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Full Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all font-black" value={guestForm.full_name} onChange={e => setGuestForm({ ...guestForm, full_name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Phone</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Email</label><input type="email" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Relationship</label><input type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" placeholder="e.g. Best Friend, Family" value={guestForm.relationship_label} onChange={e => setGuestForm({ ...guestForm, relationship_label: e.target.value })} /></div>
                            <div className="pt-6"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3">{isSubmitting ? 'Saving...' : <><UserPlus size={20} /> Save Contact</>}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONTRIBUTOR MODAL (Restored Pledge logic) */}
            {showContributorModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{contributorForm.isConversion ? 'Record Pledge' : 'New Contributor'}</h3><button onClick={() => setShowContributorModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleAddContributor} className="p-10 space-y-5">
                            {contributorForm.isConversion && <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-[24px] border border-brand-100 dark:border-brand-800 shadow-inner mb-2 text-center"><p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-1">Active Contact</p><p className="text-2xl font-black text-brand-950 dark:text-brand-100">{contributorForm.full_name}</p></div>}
                            {!contributorForm.isConversion && (
                                <div className="space-y-4">
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Full Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-black" value={contributorForm.full_name} onChange={e => setContributorForm({ ...contributorForm, full_name: e.target.value })} /></div>
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Phone</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" value={contributorForm.phone} onChange={e => setContributorForm({ ...contributorForm, phone: e.target.value })} /></div>
                                </div>
                            )}
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Pledge Amount (TZS)</label><input required type="number" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-black text-brand-600 text-2xl outline-none focus:ring-4 focus:ring-brand-500/10 shadow-inner" value={contributorForm.pledge_amount} onChange={e => setContributorForm({ ...contributorForm, pledge_amount: e.target.value })} placeholder="0" autoFocus /></div>
                            <div className="pt-6"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3"><TrendingUp size={20} /> Confirm Commitment</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONTRIBUTION PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Collect Payment</h3><button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleRecordPayment} className="p-10 space-y-5">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 mb-2 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 text-center">Contributor Profile</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white text-center mb-4">{selectedPledge?.contact?.full_name}</p>
                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"><span className="text-[10px] font-black text-slate-400 uppercase">Balance Due</span><span className="text-lg font-black text-orange-600">{formatCurrency(selectedPledge?.outstanding_amount)}</span></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Amount Received (TZS)</label><input required type="number" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-black text-slate-900 dark:text-white text-2xl outline-none focus:ring-4 focus:ring-brand-500/10 shadow-inner" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Channel</label><select className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-bold outline-none appearance-none shadow-sm" value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}><option value="MPESA">M-Pesa</option><option value="CASH">Cash Payment</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="AIRTEL_MONEY">Airtel Money</option></select></div>
                            <div className="pt-6"><button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3"><CheckCircle size={20} /> Verify Collection</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* VENDOR PAYMENT MODAL (Preserved for logic) */}
            {isVendorPaymentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 relative">
                        {/* LOADING OVERLAY */}
                        {isLoadingPaymentInfo && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Calculating Milestones...</p>
                            </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vendor Milestone</h3>
                            <button onClick={() => setIsVendorPaymentModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleRecordVendorPayment} className="p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {vendorPaymentInfo && (
                                <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-[24px] border border-brand-100 dark:border-brand-800 shadow-inner flex justify-between items-center text-center">
                                    <div className="flex-1"><p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-1">Event Wallet</p><p className="text-xl font-black text-slate-950 dark:text-brand-50">{formatCurrency(vendorPaymentInfo.event_wallet_balance)}</p></div>
                                    <div className="w-px h-10 bg-brand-200 dark:bg-brand-800 mx-4"></div>
                                    <div className="flex-1"><p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Contract Balance</p><p className="text-sm font-black text-slate-950 dark:text-brand-50">{formatCurrency(selectedVendorBooking?.balance_due)}</p></div>
                                </div>
                            )}
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Milestone Phase</label><div className="grid grid-cols-2 gap-2">{['DEPOSIT', 'INTERIM', 'FINAL', 'CUSTOM'].map(m => <button key={m} type="button" onClick={() => setVendorPaymentData({ ...vendorPaymentData, milestone: m })} className={`py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${vendorPaymentData.milestone === m ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-300'}`}>{m}</button>)}</div></div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex justify-between">
                                    Disbursement Amount (TZS)
                                    {vendorPaymentInfo?.next_suggested && (
                                        <span className="text-brand-600 animate-pulse">Suggested: {vendorPaymentInfo.next_suggested.percentage}%</span>
                                    )}
                                </label>
                                <input required type="number" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-2xl px-6 py-4 font-black text-slate-900 dark:text-white text-2xl outline-none focus:ring-4 focus:ring-brand-500/10 shadow-inner" value={vendorPaymentData.amount} onChange={e => setVendorPaymentData({ ...vendorPaymentData, amount: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Payment Method</label>
                                    <select 
                                        className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                                        value={vendorPaymentData.payment_method}
                                        onChange={e => setVendorPaymentData({ ...vendorPaymentData, payment_method: e.target.value })}
                                    >
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="MPESA">M-Pesa</option>
                                        <option value="AIRTEL_MONEY">Airtel Money</option>
                                        <option value="TIGO_PESA">Tigo Pesa</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Transaction Ref #</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. SGF7829JK"
                                        className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-brand-500"
                                        value={vendorPaymentData.transaction_reference}
                                        onChange={e => setVendorPaymentData({ ...vendorPaymentData, transaction_reference: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Proof of Payment (Screenshot)</label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-3 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="font-black">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                            {vendorPaymentData.proof_attachment ? vendorPaymentData.proof_attachment.name : 'JPG, PNG or PDF (MAX. 10MB)'}
                                        </p>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,.pdf"
                                        onChange={e => setVendorPaymentData({ ...vendorPaymentData, proof_attachment: e.target.files[0] })}
                                    />
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsVendorPaymentModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-slate-900 dark:bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3">{isSubmitting ? 'Processing...' : <><DollarSign size={20} /> Authorize</>}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COMMITTEE MODAL */}
            {showCommitteeModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingCommitteeMember ? 'Edit Role' : 'New Member'}</h3>
                            <button onClick={() => setShowCommitteeModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveCommittee} className="p-10 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                            {!editingCommitteeMember && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">First Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-black" value={committeeForm.first_name} onChange={e => setCommitteeForm({ ...committeeForm, first_name: e.target.value })} /></div>
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Last Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-black" value={committeeForm.last_name} onChange={e => setCommitteeForm({ ...committeeForm, last_name: e.target.value })} /></div>
                                </div>
                            )}
                            {!editingCommitteeMember && (
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Phone</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" value={committeeForm.phone} onChange={e => setCommitteeForm({ ...committeeForm, phone: e.target.value })} /></div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Assigned Role</label>
                                <select
                                    required
                                    className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-bold outline-none mb-4"
                                    value={committeeForm.committee_role}
                                    onChange={e => setCommitteeForm({ ...committeeForm, committee_role: e.target.value })}
                                >
                                    <option value="MEMBER">Committee Member</option>
                                    <option value="CHAIRPERSON">Chairperson</option>
                                    <option value="SECRETARY">Secretary</option>
                                    <option value="TREASURER">Treasurer</option>
                                    <option value="COORDINATOR">Coordinator</option>
                                    <option value="GATE_OFFICER">Gate Officer (Scanner)</option>
                                </select>

                                {/* ROLE SUMMARY BOX */}
                                <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800/50 rounded-xl">
                                    <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">Role Summary</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                        {committeeForm.committee_role === 'CHAIRPERSON' && "Full access to all event modules, including budget, guests, and committee management."}
                                        {committeeForm.committee_role === 'TREASURER' && "Can view budget, track contributions, and record guest payments."}
                                        {committeeForm.committee_role === 'SECRETARY' && "Can manage guest lists, view contributions, and handle invitations."}
                                        {committeeForm.committee_role === 'COORDINATOR' && "Can view vendors and guests to coordinate event logistics."}
                                        {committeeForm.committee_role === 'GATE_OFFICER' && "Strictly restricted to scanning guest QR codes at the event entrance."}
                                        {committeeForm.committee_role === 'MEMBER' && "Standard member with view-only access to basic event information."}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowCommitteeModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3">{isSubmitting ? 'Saving...' : <><Shield size={20} /> Save Assignment</>}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {selectedDoc && <ProfessionalDocumentModal doc={selectedDoc} event={event} onClose={() => setSelectedDoc(null)} />}
        </div>
    );
};

// --- REUSABLE COMPONENTS ---

const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
    };
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl border ${colors[color]} group-hover:scale-110 transition-transform duration-300`}><Icon size={24} /></div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    );
};

const PaginationFooter = ({ total, currentPage, onPageChange, itemsPerPage }) => {
    if (total <= itemsPerPage) return null;
    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, total)}</span> of <span className="text-slate-900 dark:text-white">{total}</span></p>
            <div className="flex gap-2">
                <button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={18} className="dark:text-white" /></button>
                <button onClick={() => onPageChange(p => p + 1)} disabled={currentPage * itemsPerPage >= total} className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={18} className="dark:text-white" /></button>
            </div>
        </div>
    );
};

export default EventDetailsPage;
