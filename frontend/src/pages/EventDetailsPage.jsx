import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <--- ADDED THIS
import api from '../api/axios';
import {
    ArrowLeft, Users, Wallet, CreditCard, Plus, ChevronLeft, ChevronRight, CheckCircle, Clock,
    AlertCircle, UserPlus, Trash2, Edit, Crown, Mail, Phone, DollarSign, Calculator, AlertTriangle,
    Upload, Download, FileSpreadsheet, XCircle, Calendar, Search
} from 'lucide-react';

const EventDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // <--- ADDED THIS
    const [activeTab, setActiveTab] = useState('overview');
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- PAGINATION STATES ---
    const [guestPage, setGuestPage] = useState(1);
    const [contributorPage, setContributorPage] = useState(1);
    const [budgetPage, setBudgetPage] = useState(1);
    const [committeePage, setCommitteePage] = useState(1);
    const itemsPerPage = 5;

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

    // --- COMMITTEE STATES ---
    const [committee, setCommittee] = useState([]);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    // SIMPLIFIED FORM: Removed manual permission checkboxes
    const [committeeForm, setCommitteeForm] = useState({
        first_name: '', last_name: '', phone: '', committee_role: 'MEMBER'
    });
    const [editingCommitteeMember, setEditingCommitteeMember] = useState(null);

    // --- BULK IMPORT STATES ---
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // --- PERMISSION HELPER ---
    // This checks if the user can see a specific section based on Role or Ownership
    const canAccess = (permissionName) => {
        // 1. Super Admin sees everything
        if (user?.role === 'SUPER_ADMIN') return true;
        
        // 2. Event Owner (HOST) sees everything (THIS FIXES YOUR ISSUE)
        if (user?.id === event?.owner_user_id) return true;
        
        // 3. Committee Members check specific permission strings
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
                } else if (activeTab === 'guests') {
                    if (canAccess('view-event-guests')) await fetchGuests();
                } else if (activeTab === 'budget') {
                    if (canAccess('view-event-budget')) await fetchBudget();
                } else if (activeTab === 'committee') {
                    // Committee tab: Owner OR specific permission
                    if (user?.id === event?.owner_user_id || canAccess('manage-event-committee')) {
                        await fetchCommittee();
                    }
                }
            } finally {
                setIsTabLoading(false);
            }
        };

        loadData();
    }, [id, activeTab, user, event]); // Added user and event dependencies

    useEffect(() => {
        if (event) {
            document.title = event.event_name;
            return () => { document.title = 'HarusiYangu'; };
        }
    }, [event]);

    // --- DOWNLOAD HELPER ---
    const handleAuthenticatedDownload = async (url, filename) => {
        try {
            const response = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'text/csv' });
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
            alert("Failed to download file. Please ensure you are logged in and the backend route exists.");
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

    // --- BUDGET FUNCTIONS ---
    const fetchBudget = async () => {
        try {
            const res = await api.get(`/events/${id}/budget`);
            setBudgetItems(res.data.data.items);
            setCategories(res.data.data.categories);
            setBudgetPage(1);
        } catch (err) {
            console.error(err);
        }
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

    // --- GUEST LIST FUNCTIONS ---
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

    // --- COMMITTEE FUNCTIONS ---
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

    // --- BULK IMPORT FUNCTIONS ---
    const handleFileChange = (e) => {
        if (e.target.files) {
            setImportFile(e.target.files[0]);
            setImportResult(null);
        }
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

    // --- CONTRIBUTOR FUNCTIONS ---
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
        setPaymentForm({ ...paymentForm, pledge_id: pledge.id, amount: pledge.outstanding_amount });
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
        } catch (err) { const msg = err.response?.data?.message || err.message || "Unknown error"; alert("Payment Failed: " + msg); }
        finally { setIsSubmitting(false); }
    };

    // --- HELPERS & FILTERS ---
    const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
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

    // --- CALCULATIONS ---
    const totalPledged = event?.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.pledge_amount) || 0), 0) || 0;
    const totalPaid = event?.contacts?.reduce((sum, c) => sum + (parseFloat(c.pledge?.amount_paid) || 0), 0) || 0;
    const totalBudgetPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.estimated_cost), 0);
    const totalGuests = guests.length;
    const totalContributors = contributorsList.length;
    const paidContributors = contributorsList.filter(c => c.pledge.contribution_status === 'PAID').length;
    const unpaidContributors = totalContributors - paidContributors;

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

    // --- DYNAMIC TAB LOGIC ---
    // 1. Always start with overview
    const availableTabs = ['overview'];
    
    // 2. Add tabs based on ownership or specific permissions
    if (canAccess('view-event-guests')) availableTabs.push('guests');
    if (canAccess('view-event-contributions')) availableTabs.push('contributors');
    if (canAccess('view-event-budget')) availableTabs.push('budget');
    
    // 3. Committee tab: Owner or specific permission
    if (user?.id === event?.owner_user_id || canAccess('manage-event-committee')) {
        availableTabs.push('committee');
    }

    // 4. Safety: If current tab is not allowed (e.g. permission changed), switch to overview
    if (!availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0]);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/events')} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{event.event_name}</h2>
                        <p className="text-slate-500 text-sm">{new Date(event.event_date).toDateString()} • {event.venue_name || 'No Venue Set'}</p>
                    </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase border border-blue-200">{event.event_status}</span>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 flex gap-6 md:gap-8 overflow-x-auto">
                {availableTabs.map((tab) => (
                    <button key={tab} onClick={() => { setActiveTab(tab); }} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {tab === 'budget' ? <span className="flex items-center gap-1"><Calculator size={14} /> {tab.charAt(0).toUpperCase() + tab.slice(1)}</span> : tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* --- TAB CONTENTS --- */}

            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Guests</p><p className="text-3xl font-bold text-slate-900 mt-1">{totalGuests}</p><p className="text-xs text-slate-400 mt-1">Invited & Registered</p></div>
                            <div className="p-4 bg-purple-50 text-purple-600 rounded-full"><Users size={28} /></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contributors</p><p className="text-3xl font-bold text-brand-600 mt-1">{totalContributors}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> {paidContributors} Paid</span><span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock size={10} /> {unpaidContributors} Pending</span></div></div>
                            <div className="p-4 bg-brand-50 text-brand-600 rounded-full"><CreditCard size={28} /></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div><p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Days Remaining</p><p className={`text-3xl font-bold mt-1 ${daysRemaining < 30 ? 'text-red-600' : 'text-blue-600'}`}>{daysRemaining}</p><p className="text-xs text-slate-400 mt-1">Until Event Date</p></div>
                            <div className={`p-4 rounded-full ${daysRemaining < 30 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Calendar size={28} /></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={20} /></div><span className="text-sm font-semibold text-slate-500">Total Pledged</span></div><p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPledged)}</p></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div><span className="text-sm font-semibold text-slate-500">Collected</span></div><p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><AlertCircle size={20} /></div><span className="text-sm font-semibold text-slate-500">Outstanding</span></div><p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPledged - totalPaid)}</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-slate-700">Contribution Collection Rate</span><span className="text-sm font-bold text-slate-900">{totalPledged > 0 ? ((totalPaid / totalPledged) * 100).toFixed(1) : 0}%</span></div><div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden"><div className="bg-brand-600 h-3 rounded-full transition-all duration-500" style={{ width: `${totalPledged > 0 ? (totalPaid / totalPledged) * 100 : 0}%` }}></div></div><div className="flex justify-between text-xs text-slate-500 mt-2"><span>Collected: {formatCurrency(totalPaid)}</span><span>Target: {formatCurrency(totalPledged)}</span></div></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><span className="text-sm font-semibold text-slate-700 block mb-3">Payment Status</span><div className="space-y-3"><div><div className="flex justify-between text-xs mb-1"><span className="text-slate-600">Paid Contributors</span><span className="font-bold text-green-600">{paidContributors}</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalContributors > 0 ? (paidContributors / totalContributors) * 100 : 0}%` }}></div></div></div><div><div className="flex justify-between text-xs mb-1"><span className="text-slate-600">Unpaid/Pending</span><span className="font-bold text-orange-600">{unpaidContributors}</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${totalContributors > 0 ? (unpaidContributors / totalContributors) * 100 : 0}%` }}></div></div></div></div></div>
                    </div>
                </div>
            )}

            {/* 2. GUEST LIST */}
            {activeTab === 'guests' && (
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div><h3 className="text-lg font-bold text-slate-900">Guest List</h3><p className="text-sm text-slate-500">Manage attendees and add pledges.</p></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Search guests..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <button onClick={handleDownloadTemplate} className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 underline decoration-dotted whitespace-nowrap"><Download size={14} /> Download Sample</button>
                            <button onClick={() => handleAuthenticatedDownload(`/events/${id}/contacts/export`, `guest_list_${event?.event_name?.replace(/\s+/g, '_')}.xlsx`)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"><FileSpreadsheet size={16} /> Export List</button>
                            <button onClick={() => document.getElementById('file-upload-input').click()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"><Upload size={16} /> Import</button>
                            <input type="file" id="file-upload-input" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                            <button onClick={() => { setEditingGuest(null); setGuestForm({ full_name: '', phone: '', email: '', relationship_label: '', is_vip: false }); setShowGuestModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap"><UserPlus size={16} /> Add Guest</button>
                        </div>
                    </div>
                    {importFile && (<div className="bg-slate-100 border border-slate-200 p-3 rounded-lg flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-slate-700"><FileSpreadsheet size={16} className="text-slate-500" /><span className="font-medium">{importFile.name}</span><span className="text-slate-400">({(importFile.size / 1024).toFixed(1)} KB)</span></div><div className="flex items-center gap-2"><button onClick={handleImport} disabled={importing} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded hover:bg-brand-700 disabled:opacity-50">{importing ? 'Processing...' : 'Upload'}</button><button onClick={() => setImportFile(null)} className="text-slate-400 hover:text-red-600"><XCircle size={16} /></button></div></div>)}
                    {importResult && (<div className={`p-4 rounded-lg border ${importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}><p className={`text-sm font-bold mb-2 ${importResult.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>{importResult.message}</p>{importResult.errors.length > 0 && (<div className="mt-2"><p className="text-xs font-semibold text-yellow-900 mb-1">Skipped Rows Details:</p><ul className="list-disc list-inside text-xs text-yellow-800 space-y-1 max-h-24 overflow-y-auto">{importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}</ul></div>)}</div>)}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200"><tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Guest Info</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isTabLoading ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>) : displayedGuests.length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">{guestSearch ? 'No guests found matching your search.' : 'No guests found.'}</td></tr>) : displayedGuests.map((guest, index) => (
                                        <tr key={guest.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{(guestPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4"><div className="font-medium text-slate-900 flex items-center gap-2">{guest.full_name}{guest.is_vip && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}</div>{guest.relationship_label && <div className="text-xs text-slate-400 mt-0.5">{guest.relationship_label}</div>}</td>
                                            <td className="px-6 py-4"><div className="flex flex-col gap-1">{guest.phone && <span className="flex items-center gap-1 text-xs"><Phone size={12} />{guest.phone}</span>}{guest.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={12} />{guest.email}</span>}</div></td>
                                            <td className="px-6 py-4">{guest.pledge ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CreditCard size={10} /> Contributor</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Guest</span>}</td>
                                            <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">{!guest.pledge && <button onClick={() => openPledgeFromGuest(guest)} className="text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1" title="Add Pledge"><DollarSign size={12} /> Pledge</button>}<button onClick={() => handleEditGuest(guest)} className="text-slate-400 hover:text-brand-600 p-1"><Edit size={16} /></button><button onClick={() => handleDeleteGuest(guest.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredGuests.length > itemsPerPage && (<div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {((guestPage - 1) * itemsPerPage) + 1} to {Math.min(guestPage * itemsPerPage, filteredGuests.length)} of {filteredGuests.length}</span><div className="flex gap-2"><button onClick={() => setGuestPage(p => Math.max(1, p - 1))} disabled={guestPage === 1} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><ChevronLeft size={12} /> Prev</button><button onClick={() => setGuestPage(p => p + 1)} disabled={guestPage * itemsPerPage >= filteredGuests.length} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">Next <ChevronRight size={12} /></button></div></div>)}
                    </div>
                </div>
            )}

            {/* 3. CONTRIBUTORS */}
            {activeTab === 'contributors' && (
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div><h3 className="text-lg font-bold text-slate-900">Contributors</h3><p className="text-sm text-slate-500">Manage pledges and payments.</p></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Search contributors..." value={contributorSearch} onChange={(e) => setContributorSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <button onClick={() => handleAuthenticatedDownload(`/events/${id}/contributors/export`, `contributors_list_${event?.event_name?.replace(/\s+/g, '_')}.xlsx`)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"><FileSpreadsheet size={16} /> Export List</button>
                            <button onClick={() => { setContributorForm({ contact_id: null, full_name: '', phone: '', email: '', pledge_amount: '', is_vip: false, isConversion: false }); setShowContributorModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap"><Plus size={16} /> Add Contributor</button>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200"><tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Pledged</th><th className="px-6 py-4">Paid</th><th className="px-6 py-4">Outstanding</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isTabLoading ? (<tr><td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>) : displayedContributors.length === 0 ? (<tr><td colSpan="8" className="px-6 py-8 text-center text-slate-400">{contributorSearch ? 'No contributors found matching your search.' : 'No contributors added yet.'}</td></tr>) : displayedContributors.map((contact, index) => {
                                        const pledge = contact.pledge;
                                        let statusBadge = <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><Clock size={12} /> Pledged</span>;
                                        if (pledge.contribution_status === 'PARTIALLY_PAID') statusBadge = <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock size={12} /> Partial</span>;
                                        if (pledge.contribution_status === 'PAID') statusBadge = <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={12} /> Paid</span>;
                                        return (
                                            <tr key={contact.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{(contributorPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{contact.full_name}</td>
                                                <td className="px-6 py-4">{contact.phone}</td>
                                                <td className="px-6 py-4">{formatCurrency(pledge.pledge_amount)}</td>
                                                <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(pledge.amount_paid)}</td>
                                                <td className="px-6 py-4 font-medium text-orange-600">{formatCurrency(pledge.outstanding_amount)}</td>
                                                <td className="px-6 py-4">{statusBadge}</td>
                                                <td className="px-6 py-4 text-right">{pledge.contribution_status !== 'PAID' && <button onClick={() => openPaymentModal(pledge)} className="text-brand-600 hover:text-brand-800 font-medium text-xs bg-brand-50 px-3 py-1.5 rounded-md transition-colors">Record Payment</button>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredContributors.length > itemsPerPage && (<div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {((contributorPage - 1) * itemsPerPage) + 1} to {Math.min(contributorPage * itemsPerPage, filteredContributors.length)} of {filteredContributors.length}</span><div className="flex gap-2"><button onClick={() => setContributorPage(p => Math.max(1, p - 1))} disabled={contributorPage === 1} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><ChevronLeft size={12} /> Prev</button><button onClick={() => setContributorPage(p => p + 1)} disabled={contributorPage * itemsPerPage >= filteredContributors.length} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">Next <ChevronRight size={12} /></button></div></div>)}
                    </div>
                </div>
            )}

            {/* 4. BUDGET */}
            {activeTab === 'budget' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div><h3 className="text-lg font-bold text-slate-900">Budget Plan</h3><p className="text-sm text-slate-500">Breakdown of estimated costs vs target.</p></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Search budget items..." value={budgetSearch} onChange={(e) => setBudgetSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <button onClick={() => handleAuthenticatedDownload(`/events/${id}/budget/export`, `budget_plan_${event?.event_name?.replace(/\s+/g, '_')}.xlsx`)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"><FileSpreadsheet size={16} /> Export Budget</button>
                            <button onClick={() => { setEditingBudgetItem(null); setBudgetForm({ category_id: '', item_name: '', estimated_cost: '', description: '' }); setShowBudgetModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap"><Plus size={16} /> Add Budget Item</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">Target Budget</p><p className="text-2xl font-bold text-slate-900">{formatCurrency(event.target_budget)}</p></div><div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Wallet size={24} /></div></div>
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">Total Planned</p><p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-brand-600'}`}>{formatCurrency(totalBudgetPlanned)}</p></div><div className={`p-3 rounded-full ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}><Calculator size={24} /></div></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between text-xs font-semibold text-slate-500 mb-2"><span>Budget Utilization</span><span>{isOverBudget ? 'Over Budget' : 'On Track'}</span></div><div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(budgetProgressPercent, 100)}%` }}></div></div>{isOverBudget && (<div className="mt-2 flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 p-2 rounded"><AlertTriangle size={14} /><span>Warning: You have planned {formatCurrency(totalBudgetPlanned)} but your target is {formatCurrency(event.target_budget)}.</span></div>)}</div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200"><tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Item Name</th><th className="px-6 py-4">Category</th><th className="px-6 py-4 text-right">Estimated Cost</th><th className="px-6 py-4 text-right">Actual Cost</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isTabLoading ? (<tr><td colSpan="7" className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>) : displayedBudget.length === 0 ? (<tr><td colSpan="7" className="px-6 py-8 text-center text-slate-400">{budgetSearch ? 'No budget items found matching your search.' : 'No budget items planned yet.'}</td></tr>) : displayedBudget.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{(budgetPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4"><div className="font-medium text-slate-900">{item.item_name}</div>{item.description && <div className="text-xs text-slate-400">{item.description}</div>}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">{item.category?.category_name || 'Uncategorized'}</span></td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.estimated_cost)}</td>
                                            <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(item.actual_cost)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <select value={item.budget_item_status} onChange={(e) => handleStatusChange(item.id, e.target.value)} className={`text-xs font-bold px-2 py-1 rounded border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 ${item.budget_item_status === 'PLANNED' ? 'bg-blue-50 text-blue-700' : item.budget_item_status === 'APPROVED' ? 'bg-indigo-50 text-indigo-700' : item.budget_item_status === 'IN_PROGRESS' ? 'bg-yellow-50 text-yellow-700' : item.budget_item_status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                                                    <option value="PLANNED">PLANNED</option><option value="APPROVED">APPROVED</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="PAID">PAID</option><option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => handleEditBudget(item)} className="text-slate-400 hover:text-brand-600 p-1"><Edit size={16} /></button><button onClick={() => handleDeleteBudget(item.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredBudget.length > itemsPerPage && (<div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {((budgetPage - 1) * itemsPerPage) + 1} to {Math.min(budgetPage * itemsPerPage, filteredBudget.length)} of {filteredBudget.length}</span><div className="flex gap-2"><button onClick={() => setBudgetPage(p => Math.max(1, p - 1))} disabled={budgetPage === 1} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><ChevronLeft size={12} /> Prev</button><button onClick={() => setBudgetPage(p => p + 1)} disabled={budgetPage * itemsPerPage >= filteredBudget.length} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">Next <ChevronRight size={12} /></button></div></div>)}
                    </div>
                </div>
            )}

            {/* 5. COMMITTEE (SIMPLIFIED MODAL) */}
            {activeTab === 'committee' && (
                <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div><h3 className="text-lg font-bold text-slate-900">Committee Members</h3><p className="text-sm text-slate-500">Manage roles and permissions.</p></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Search committee..." value={committeeSearch} onChange={(e) => setCommitteeSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                            </div>
                            <button onClick={() => handleAuthenticatedDownload(`/events/${id}/committee/export`, `committee_list_${event?.event_name?.replace(/\s+/g, '_')}.csv`)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"><FileSpreadsheet size={16} /> Export List</button>
                            <button onClick={() => { setEditingCommitteeMember(null); setCommitteeForm({ first_name: '', last_name: '', phone: '', committee_role: 'MEMBER' }); setShowCommitteeModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap"><UserPlus size={16} /> Add Member</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">#</th>
                                        <th className="px-6 py-4">Member Info</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Permissions (Auto)</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isTabLoading ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>) : displayedCommittee.length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">{committeeSearch ? 'No committee members found.' : 'No committee members added yet.'}</td></tr>) : displayedCommittee.map((member, index) => (
                                        <tr key={member.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{(committeePage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    {member.user?.first_name || 'Unknown'} {member.user?.last_name || ''}
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Phone size={10} /> {member.user?.phone || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${member.committee_role === 'CHAIRPERSON' ? 'bg-purple-50 text-purple-700 border-purple-100' : member.committee_role === 'SECRETARY' ? 'bg-blue-50 text-blue-700 border-blue-100' : member.committee_role === 'TREASURER' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                    {member.committee_role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {member.can_manage_budget && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] border border-orange-100 font-medium">Budget</span>}
                                                    {member.can_scan_cards && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] border border-indigo-100 font-medium">Scanner</span>}
                                                    {member.can_send_messages && <span className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded text-[10px] border border-pink-100 font-medium">SMS</span>}
                                                    {member.can_manage_vendors && <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] border border-teal-100 font-medium">Vendors</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleEditCommittee(member)} className="text-slate-400 hover:text-brand-600 p-1"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteCommittee(member.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredCommittee.length > itemsPerPage && (<div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {((committeePage - 1) * itemsPerPage) + 1} to {Math.min(committeePage * itemsPerPage, filteredCommittee.length)} of {filteredCommittee.length}</span><div className="flex gap-2"><button onClick={() => setCommitteePage(p => Math.max(1, p - 1))} disabled={committeePage === 1} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><ChevronLeft size={12} /> Prev</button><button onClick={() => setCommitteePage(p => p + 1)} disabled={committeePage * itemsPerPage >= filteredCommittee.length} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">Next <ChevronRight size={12} /></button></div></div>)}
                    </div>
                </div>
            )}

            {/* ================= MODALS ================= */}

            {/* BUDGET MODAL */}
            {showBudgetModal && (<div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-900">{editingBudgetItem ? 'Edit Budget Item' : 'Add Budget Item'}</h3><button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600">✕</button></div><form onSubmit={handleSaveBudget} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><select required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={budgetForm.category_id} onChange={e => setBudgetForm({ ...budgetForm, category_id: e.target.value })}><option value="">Select Category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}</select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Mlimani City Hall" value={budgetForm.item_name} onChange={e => setBudgetForm({ ...budgetForm, item_name: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost (TZS)</label><input required type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="0.00" value={budgetForm.estimated_cost} onChange={e => setBudgetForm({ ...budgetForm, estimated_cost: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label><textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" rows="2" value={budgetForm.description} onChange={e => setBudgetForm({ ...budgetForm, description: e.target.value })}></textarea></div><div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">{editingBudgetItem ? 'Update Item' : 'Add Item'}</button></div></form></div></div>)}

            {/* GUEST MODAL */}
            {showGuestModal && (<div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-900">{editingGuest ? 'Edit Guest' : 'Add New Guest'}</h3><button onClick={() => setShowGuestModal(false)} className="text-slate-400 hover:text-slate-600">✕</button></div><form onSubmit={handleSaveGuest} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={guestForm.full_name} onChange={e => setGuestForm({ ...guestForm, full_name: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label><input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Relationship (e.g. Aunt, Friend)</label><input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={guestForm.relationship_label} onChange={e => setGuestForm({ ...guestForm, relationship_label: e.target.value })} /></div><div className="flex items-center gap-2"><input type="checkbox" id="is_vip" className="rounded text-brand-600 focus:ring-brand-500" checked={guestForm.is_vip} onChange={e => setGuestForm({ ...guestForm, is_vip: e.target.checked })} /><label htmlFor="is_vip" className="text-sm text-slate-700">Mark as VIP</label></div><div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">{editingGuest ? 'Update Guest' : 'Add Guest'}</button></div></form></div></div>)}

            {/* COMMITTEE MODAL (SIMPLIFIED - NO CHECKBOXES) */}
            {showCommitteeModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">{editingCommitteeMember ? 'Edit Committee Member' : 'Add Committee Member'}</h3>
                            <button onClick={() => setShowCommitteeModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSaveCommittee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

                            {/* Name Inputs (Required for auto-creation) */}
                            {!editingCommitteeMember && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                        <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. John" value={committeeForm.first_name} onChange={e => setCommitteeForm({ ...committeeForm, first_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                        <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Doe" value={committeeForm.last_name} onChange={e => setCommitteeForm({ ...committeeForm, last_name: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {!editingCommitteeMember && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input required type="text" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. 255..." value={committeeForm.phone} onChange={e => setCommitteeForm({ ...committeeForm, phone: e.target.value })} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">If this user doesn't exist, we will create an account for them automatically.</p>
                                </div>
                            )}

                            {editingCommitteeMember && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Editing Member</p>
                                    <p className="font-medium text-slate-900">{committeeForm.first_name} {committeeForm.last_name} ({committeeForm.phone})</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Committee Role</label>
                                <select required className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={committeeForm.committee_role} onChange={e => setCommitteeForm({ ...committeeForm, committee_role: e.target.value })}>
                                    <option value="MEMBER">Member</option>
                                    <option value="COORDINATOR">Coordinator</option>
                                    <option value="TREASURER">Treasurer</option>
                                    <option value="SECRETARY">Secretary</option>
                                    <option value="CHAIRPERSON">Chairperson</option>
                                    <option value="GATE_OFFICER">Gate Officer (Scanner)</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-1">Permissions are automatically assigned based on the selected role.</p>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">{editingCommitteeMember ? 'Update Member' : 'Add Member'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONTRIBUTOR MODAL */}
            {showContributorModal && (<div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-900">{contributorForm.isConversion ? 'Add Pledge' : 'Add New Contributor'}</h3><button onClick={() => setShowContributorModal(false)} className="text-slate-400 hover:text-slate-600">✕</button></div><form onSubmit={handleAddContributor} className="p-6 space-y-4">{contributorForm.isConversion && (<div className="bg-brand-50 p-3 rounded-lg border border-brand-100 mb-2"><p className="text-xs font-semibold text-brand-700 uppercase">Guest Selected</p><p className="font-bold text-brand-900">{contributorForm.full_name}</p></div>)}{!contributorForm.isConversion && (<><div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={contributorForm.full_name} onChange={e => setContributorForm({ ...contributorForm, full_name: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={contributorForm.phone} onChange={e => setContributorForm({ ...contributorForm, phone: e.target.value })} /></div></>)}<div><label className="block text-sm font-medium text-slate-700 mb-1">Pledge Amount (TZS)</label><input required type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-brand-600 focus:ring-2 focus:ring-brand-500 outline-none" value={contributorForm.pledge_amount} onChange={e => setContributorForm({ ...contributorForm, pledge_amount: e.target.value })} placeholder="0.00" autoFocus /></div><div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">{contributorForm.isConversion ? 'Confirm Pledge' : 'Add Contributor'}</button></div></form></div></div>)}

            {/* PAYMENT MODAL */}
            {showPaymentModal && (<div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-900">Record Payment</h3><button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">✕</button></div><form onSubmit={handleRecordPayment} className="p-6 space-y-4"><div className="bg-slate-50 p-4 rounded-lg text-sm mb-2 border border-slate-100"><p className="text-slate-500">Contributor</p><p className="font-bold text-slate-900">{selectedPledge?.contact?.full_name}</p><div className="flex justify-between mt-2"><span className="text-slate-500">Outstanding:</span><span className="font-bold text-orange-600">{formatCurrency(selectedPledge?.outstanding_amount)}</span></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Amount Received</label><input required type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Method</label><select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}><option value="MPESA">M-Pesa</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="AIRTEL_MONEY">Airtel Money</option></select></div><button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50">Confirm Payment</button></form></div></div>)}
        </div>
    );
};

export default EventDetailsPage;