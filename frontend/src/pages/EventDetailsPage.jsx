import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    ArrowLeft, Users, Wallet, CreditCard, Plus, ChevronLeft, ChevronRight, CheckCircle, Clock,
    AlertCircle, UserPlus, Trash2, Edit, Crown, Mail, Phone, DollarSign, Calculator, AlertTriangle,
    Upload, Download, FileSpreadsheet, XCircle, Calendar, Search, Shield, Award, Briefcase, Store, FileText, Loader2, X, TrendingUp, MapPin
} from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
};

const EventDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
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
        notes: ''
    });

    // --- COMMITTEE STATES ---
    const [committee, setCommittee] = useState([]);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [committeeForm, setCommitteeForm] = useState({
        first_name: '', last_name: '', phone: '', committee_role: 'MEMBER'
    });
    const [editingCommitteeMember, setEditingCommitteeMember] = useState(null);

    // --- BULK IMPORT STATES ---
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const canAccess = (permissionName) => {
        if (user?.role === 'SUPER_ADMIN') return true;
        if (user?.id === event?.owner_user_id) return true;
        return user?.permissions?.includes(permissionName);
    };

    useEffect(() => {
        const loadData = async () => {
            if (!event) {
                await fetchEventDetails();
            }

            setIsTabLoading(true);
            try {
                if (activeTab === 'overview') {
                    if (guests.length === 0 && canAccess('view-event-guests')) await fetchGuests();
                    if (budgetItems.length === 0 && canAccess('view-event-budget')) await fetchBudget();
                    await fetchVendors(); // Needed for overview stats
                } else if (activeTab === 'guests') {
                    if (canAccess('view-event-guests')) await fetchGuests();
                } else if (activeTab === 'budget') {
                    if (canAccess('view-event-budget')) await fetchBudget();
                } else if (activeTab === 'committee') {
                    if (user?.id === event?.owner_user_id || canAccess('manage-event-committee')) await fetchCommittee();
                } else if (activeTab === 'vendors') {
                    await fetchVendors();
                }
            } finally {
                setIsTabLoading(false);
            }
        };

        loadData();
    }, [id, activeTab, user, event]);

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

    const fetchBudget = async () => {
        try {
            const res = await api.get(`/events/${id}/budget`);
            setBudgetItems(res.data.data.items);
            setCategories(res.data.data.categories);
            setBudgetPage(1);
        } catch (err) { console.error(err); }
    };

    const handleStatusChange = async (itemId, newStatus) => {
        try {
            await api.put(`/events/${id}/budget/${itemId}`, { budget_item_status: newStatus });
            setBudgetItems(prev => prev.map(item => item.id === itemId ? { ...item, budget_item_status: newStatus } : item));
        } catch (err) { alert("Failed to update status"); }
    };

    const handleSaveBudget = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editingBudgetItem) {
                await api.put(`/events/${id}/budget/${editingBudgetItem.id}`, budgetForm);
            } else {
                await api.post(`/events/${id}/budget`, budgetForm);
            }
            setShowBudgetModal(false);
            setBudgetForm({ category_id: '', item_name: '', estimated_cost: '', description: '' });
            setEditingBudgetItem(null);
            fetchBudget();
        } catch (err) { alert(err.response?.data?.message || "Failed to save budget item"); }
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
        if (!confirm("Delete this budget item?")) return;
        try { await api.delete(`/events/${id}/budget/${itemId}`); fetchBudget(); }
        catch (err) { alert("Failed to delete item"); }
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
            } else {
                await api.post(`/events/${id}/contacts`, guestForm);
            }
            setShowGuestModal(false);
            setGuestForm({ full_name: '', phone: '', email: '', relationship_label: '', is_vip: false });
            setEditingGuest(null);
            fetchGuests();
        } catch (err) { alert(err.response?.data?.message || "Failed to save guest"); }
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
        if (!confirm("Are you sure?")) return;
        try { await api.delete(`/events/${id}/contacts/${guestId}`); fetchGuests(); }
        catch (err) { alert(err.response?.data?.message || "Failed to delete guest"); }
    };

    const fetchCommittee = async () => {
        try {
            const res = await api.get(`/events/${id}/committee`);
            setCommittee(res.data.data);
            setCommitteePage(1);
        } catch (err) {
            console.error("Committee fetch error", err);
            setCommittee([]);
        }
    };

    const handleSaveCommittee = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editingCommitteeMember) {
                await api.put(`/events/${id}/committee/${editingCommitteeMember.id}`, committeeForm);
            } else {
                await api.post(`/events/${id}/committee`, committeeForm);
            }
            setShowCommitteeModal(false);
            setCommitteeForm({ first_name: '', last_name: '', phone: '', committee_role: 'MEMBER' });
            setEditingCommitteeMember(null);
            fetchCommittee();
        } catch (err) { alert(err.response?.data?.message || "Failed to save committee member"); }
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
        try {
            await api.delete(`/events/${id}/committee/${memberId}`);
            fetchCommittee();
        }
        catch (err) { alert(err.response?.data?.message || "Failed to remove member"); }
    };

    const handleDownloadTemplate = () => {
        handleAuthenticatedDownload(`/events/${id}/contacts/template`, 'guests_template.xlsx');
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) { alert("Please select a file first."); return; }
        if (importing) return;
        setImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const res = await api.post(`/events/${id}/contacts/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const data = res.data.data;
            setImportResult({ message: `Success: ${data.imported} guests added. Skipped: ${data.skipped}.`, errors: data.errors || [] });
            if (data.imported > 0) { fetchGuests(); setImportFile(null); }
        } catch (err) { alert("Import failed: " + (err.response?.data?.message || err.message)); }
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
            if (activeTab === 'guests') fetchGuests();
        } catch (err) { alert(err.response?.data?.message || "Failed to add contributor"); }
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
        } catch (err) { alert("Payment Failed: " + (err.response?.data?.message || err.message)); }
        finally { setIsSubmitting(false); }
    };

    // --- VENDOR FUNCTIONS ---
    const fetchVendors = async () => {
        try {
            const res = await api.get(`/events/${id}/vendors`);
            setVendors(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const handleAcceptQuote = async (bookingId) => {
        if (!confirm("Are you sure you want to accept this quote? This will finalize the price and link it to your budget.")) return;
        setIsSubmitting(true);
        try {
            await api.put(`/bookings/${bookingId}/accept`);
            fetchVendors();
            fetchBudget();
            alert("Quote accepted successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to accept quote");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmService = async (bookingId) => {
        if (!confirm("Confirming service will release all held funds to the vendor and mark this booking as COMPLETED. Proceed?")) return;
        setIsSubmitting(true);
        try {
            await api.put(`/bookings/${bookingId}/confirm-service`);
            fetchVendors();
            fetchEventDetails();
            alert("Service confirmed! Funds have been released to the vendor wallet.");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to confirm service");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openVendorPaymentModal = async (booking) => {
        setSelectedVendorBooking(booking);
        setIsVendorPaymentModalOpen(true);
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
        }
    };

    const handleRecordVendorPayment = async (e) => {
        e.preventDefault();
        if (!vendorPaymentData.amount || parseFloat(vendorPaymentData.amount) <= 0) return alert("Please enter a valid amount");
        
        setIsSubmitting(true);
        try {
            await api.post(`/bookings/${selectedVendorBooking.id}/payments`, vendorPaymentData);
            setIsVendorPaymentModalOpen(false);
            fetchVendors();
            fetchEventDetails();
            alert("Vendor payment recorded successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Payment recording failed");
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

    if (loading) return <div className="text-center p-10">Loading Event Details...</div>;

    const availableTabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'guests', label: 'Guests', icon: Users },
        { id: 'contributors', label: 'Finance', icon: Wallet },
        { id: 'budget', label: 'Budget', icon: DollarSign },
        { id: 'vendors', label: 'Vendors', icon: Store },
        { id: 'committee', label: 'Committee', icon: Shield }
    ].filter(tab => {
        if (tab.id === 'guests') return canAccess('view-event-guests');
        if (tab.id === 'contributors') return canAccess('view-event-contributions');
        if (tab.id === 'budget') return canAccess('view-event-budget');
        if (tab.id === 'committee') return user?.id === event?.owner_user_id || canAccess('manage-event-committee');
        return true;
    });

    if (!availableTabs.find(t => t.id === activeTab)) setActiveTab(availableTabs[0].id);

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
                
                {/* 1. OVERVIEW (StatCards from 260aee1 + Progress Bars from OLD) */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Total Budget" value={formatCurrency(event.target_budget)} icon={Wallet} color="blue" />
                            <StatCard title="Total Pledged" value={formatCurrency(totalPledged)} icon={TrendingUp} color="emerald" />
                            <StatCard title="Collected" value={formatCurrency(totalPaid)} icon={CheckCircle} color="emerald" />
                            <StatCard title="Total Guests" value={totalGuestsCount} icon={Users} color="purple" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contributors</p><p className="text-3xl font-bold text-brand-600 mt-1">{totalContributorsCount}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> {paidContributorsCount} Paid</span><span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={10} /> {unpaidContributorsCount} Pending</span></div></div>
                                <div className="p-4 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-full"><CreditCard size={28} /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Outstanding</p><p className="text-3xl font-bold text-orange-600 mt-1">{formatCurrency(totalPledged - totalPaid)}</p><p className="text-xs text-slate-400 mt-1">To be collected</p></div>
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-full"><AlertCircle size={28} /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Days Remaining</p><p className={`text-3xl font-bold mt-1 ${daysRemaining < 30 ? 'text-red-600' : 'text-blue-600'}`}>{daysRemaining}</p><p className="text-xs text-slate-400 mt-1">Until Event Date</p></div>
                                <div className={`p-4 rounded-full ${daysRemaining < 30 ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}><Calendar size={28} /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Collection Rate</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{totalPledged > 0 ? ((totalPaid / totalPledged) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                    <div className="bg-brand-600 h-3 rounded-full transition-all duration-500" style={{ width: `${totalPledged > 0 ? (totalPaid / totalPledged) * 100 : 0}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">
                                    <span>Collected: {formatCurrency(totalPaid)}</span>
                                    <span>Target: {formatCurrency(totalPledged)}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px] block mb-3">Payment Distribution</span>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-slate-400">Paid Contributors</span><span className="text-green-600">{paidContributorsCount}</span></div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalContributorsCount > 0 ? (paidContributorsCount / totalContributorsCount) * 100 : 0}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-slate-400">Unpaid/Pending</span><span className="text-orange-600">{unpaidContributorsCount}</span></div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${totalContributorsCount > 0 ? (unpaidContributorsCount / totalContributorsCount) * 100 : 0}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. GUEST LIST */}
                {activeTab === 'guests' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search guests by name or phone..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={guestSearch} onChange={e => {setGuestSearch(e.target.value); setGuestPage(1);}} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><Download size={14} /> Sample</button>
                                <button onClick={() => handleAuthenticatedDownload(`/events/${id}/contacts/export`, `guests_${event.event_name}.xlsx`)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><FileSpreadsheet size={14} /> Export</button>
                                <label className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-bold hover:bg-brand-100 transition-colors cursor-pointer"><Upload size={14} /> Import <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => {setImportFile(e.target.files[0]); setImportResult(null);}} /></label>
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
                                        {isTabLoading ? <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Loading data...</td></tr> : displayedGuests.length === 0 ? <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No guests found.</td></tr> : displayedGuests.map((guest, index) => (
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredGuests.length} currentPage={guestPage} onPageChange={setGuestPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* 3. CONTRIBUTORS */}
                {activeTab === 'contributors' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search contributors..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={contributorSearch} onChange={e => {setContributorSearch(e.target.value); setContributorPage(1);}} />
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
                                        {isTabLoading ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">Loading ledger...</td></tr> : displayedContributors.length === 0 ? <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">No contributions recorded.</td></tr> : displayedContributors.map((contact, index) => {
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

                {/* 4. BUDGET */}
                {activeTab === 'budget' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search items or categories..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={budgetSearch} onChange={e => {setBudgetSearch(e.target.value); setBudgetPage(1);}} />
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
                                                    <select value={item.budget_item_status} onChange={(e) => handleStatusChange(item.id, e.target.value)} className={`text-[10px] font-black px-2 py-1 rounded border-0 cursor-pointer focus:ring-2 focus:ring-brand-500 uppercase tracking-tighter ${item.budget_item_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : item.budget_item_status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        <option value="PLANNED">PLANNED</option><option value="APPROVED">APPROVED</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="PAID">PAID</option><option value="CANCELLED">CANCELLED</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditBudget(item)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={16} /></button><button onClick={() => handleDeleteBudget(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationFooter total={filteredBudget.length} currentPage={budgetPage} onPageChange={setBudgetPage} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
                )}

                {/* 5. VENDORS TAB (Preserved logic) */}
                {activeTab === 'vendors' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative">
                            <div className="relative z-10 text-center md:text-left">
                                <h3 className="text-2xl font-black tracking-tight">Hire Professional Vendors</h3>
                                <p className="text-brand-100 text-sm mt-1 max-w-md">Browse our verified catalog of photographers, decorators, caterers and more.</p>
                                <button onClick={() => navigate('/vendor-catalog')} className="mt-6 bg-white text-brand-700 px-8 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-3 shadow-lg shadow-black/20 text-sm uppercase tracking-widest"><Search size={18} /> Visit Catalog</button>
                            </div>
                            <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none transform rotate-12"><Briefcase size={200} /></div>
                        </div>

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
                                        {vendors.filter(v => v.status === 'ACCEPTED').length === 0 ? <tr><td colSpan="7" className="px-6 py-16 text-center text-slate-400 italic">No confirmed hires yet. Find vendors in the catalog.</td></tr> : vendors.filter(v => v.status === 'ACCEPTED').map((v, idx) => (
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
                                        {vendors.filter(v => ['INQUIRY', 'QUOTED'].includes(v.status)).length === 0 ? <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">No active inquiries at the moment.</td></tr> : vendors.filter(v => ['INQUIRY', 'QUOTED'].includes(v.status)).map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-300">{idx + 1}</td>
                                                <td className="px-6 py-4"><div className="font-bold text-slate-900 dark:text-white">{v.vendor?.business_name}</div><div className="text-[10px] font-medium text-slate-400 uppercase">{v.assigned_service}</div></td>
                                                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${v.status === 'QUOTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{v.status}</span></td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{v.last_quote_amount ? formatCurrency(v.last_quote_amount) : '---'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
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
                    </div>
                )}

                {/* 6. COMMITTEE */}
                {activeTab === 'committee' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input type="text" placeholder="Search members..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-brand-500 bg-transparent dark:text-white" value={committeeSearch} onChange={e => {setCommitteeSearch(e.target.value); setCommitteePage(1);}} />
                            </div>
                            <button onClick={() => { setEditingCommitteeMember(null); setCommitteeForm({ first_name: '', last_name: '', phone: '', committee_role: 'MEMBER' }); setShowCommitteeModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-brand-700 transition-all"><Plus size={16} /> Add Member</button>
                        </div>
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
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vendor Milestone</h3><button onClick={() => setIsVendorPaymentModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleRecordVendorPayment} className="p-10 space-y-6">
                            {vendorPaymentInfo && (
                                <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-[24px] border border-brand-100 dark:border-brand-800 shadow-inner flex justify-between items-center text-center">
                                    <div className="flex-1"><p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-1">Event Wallet</p><p className="text-xl font-black text-slate-950 dark:text-brand-50">{formatCurrency(vendorPaymentInfo.event_wallet_balance)}</p></div>
                                    <div className="w-px h-10 bg-brand-200 dark:bg-brand-800 mx-4"></div>
                                    <div className="flex-1"><p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Contract Balance</p><p className="text-sm font-black text-slate-950 dark:text-brand-50">{formatCurrency(selectedVendorBooking?.balance_due)}</p></div>
                                </div>
                            )}
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Milestone Phase</label><div className="grid grid-cols-2 gap-2">{['DEPOSIT', 'INTERIM', 'FINAL', 'CUSTOM'].map(m => <button key={m} type="button" onClick={() => setVendorPaymentData({ ...vendorPaymentData, milestone: m })} className={`py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${vendorPaymentData.milestone === m ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-300'}`}>{m}</button>)}</div></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Disbursement Amount (TZS)</label><input required type="number" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 rounded-2xl px-6 py-4 font-black text-slate-900 dark:text-white text-2xl outline-none focus:ring-4 focus:ring-brand-500/10 shadow-inner" value={vendorPaymentData.amount} onChange={e => setVendorPaymentData({ ...vendorPaymentData, amount: e.target.value })} /></div>
                            <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3">{isSubmitting ? 'Processing Disbursement...' : <><DollarSign size={20} /> Authorize Payment</>}</button></div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* COMMITTEE MODAL */}
            {showCommitteeModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingCommitteeMember ? 'Edit Role' : 'New Member'}</h3><button onClick={() => setShowCommitteeModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={24} /></button></div>
                        <form onSubmit={handleSaveCommittee} className="p-10 space-y-5">
                            {!editingCommitteeMember && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">First Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-black" value={committeeForm.first_name} onChange={e => setCommitteeForm({ ...committeeForm, first_name: e.target.value })} /></div>
                                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Last Name</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-black" value={committeeForm.last_name} onChange={e => setCommitteeForm({ ...committeeForm, last_name: e.target.value })} /></div>
                                </div>
                            )}
                            {!editingCommitteeMember && (
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Phone</label><input required type="text" className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 outline-none font-bold" value={committeeForm.phone} onChange={e => setCommitteeForm({ ...committeeForm, phone: e.target.value })} /></div>
                            )}
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Assigned Role</label><select required className="w-full border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white rounded-2xl px-6 py-4 font-bold outline-none" value={committeeForm.committee_role} onChange={e => setCommitteeForm({ ...committeeForm, committee_role: e.target.value })}><option value="MEMBER">Committee Member</option><option value="CHAIRPERSON">Chairperson</option><option value="SECRETARY">Secretary</option><option value="TREASURER">Treasurer</option><option value="COORDINATOR">Coordinator</option></select></div>
                            <div className="pt-6"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3"><Shield size={20} /> Save Assignment</button></div>
                        </form>
                    </div>
                </div>
            )}
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
