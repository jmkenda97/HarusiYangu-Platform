import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
    Calendar, MapPin, Users, Wallet, CheckCircle, Clock, 
    Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight,
    UserPlus, Mail, Phone, Download, Upload, Filter,
    MoreHorizontal, DollarSign, TrendingUp, AlertCircle,
    ArrowRight, MessageSquare, Briefcase, Store, FileText,
    Shield, X, Loader2
} from 'lucide-react';
import { SkeletonCard, PageLoader } from '../components/SkeletonLoader';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
};

const EventDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data States
    const [guests, setGuests] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [budgetItems, setBudgetItems] = useState([]);
    const [committee, setCommittee] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [budgetCategories, setBudgetCategories] = useState([]);

    // Search & Pagination States
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchEventDetails();
    }, [id]);

    useEffect(() => {
        // Reset search and pagination when changing tabs
        setSearchQuery('');
        setCurrentPage(1);
        if (activeTab === 'guests') fetchGuests();
        if (activeTab === 'contributors') fetchContributors();
        if (activeTab === 'budget') fetchBudget();
        if (activeTab === 'committee') fetchCommittee();
        if (activeTab === 'vendors') fetchVendors();
    }, [activeTab]);

    const fetchEventDetails = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGuests = async () => {
        try {
            const res = await api.get(`/events/${id}/guests`);
            setGuests(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchContributors = async () => {
        try {
            const res = await api.get(`/events/${id}/contributors`);
            setContributors(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchBudget = async () => {
        try {
            const res = await api.get(`/events/${id}/budget`);
            setBudgetItems(res.data.data || []);
            const catRes = await api.get('/budget-categories');
            setBudgetCategories(catRes.data.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchCommittee = async () => {
        try {
            const res = await api.get(`/events/${id}/committee`);
            setCommittee(res.data.data || []);
        } catch (err) { console.error(err); }
    };

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

    const handleDeleteVendor = async (bookingId, amountPaid) => {
        if (parseFloat(amountPaid) > 0) {
            alert("Cannot remove a vendor who has already been paid. Please contact support.");
            return;
        }
        if (!confirm("Are you sure you want to cancel this inquiry/booking?")) return;
        try {
            await api.delete(`/events/vendors/${bookingId}`);
            fetchVendors();
        } catch (err) {
            alert("Failed to remove vendor");
        }
    };

    // --- PAYMENT MODAL LOGIC ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        milestone: 'DEPOSIT',
        payment_method: 'CASH',
        transaction_reference: '',
        notes: ''
    });

    const openPaymentModal = async (booking) => {
        setSelectedBookingForPayment(booking);
        setShowPaymentModal(true);
        setLoadingPaymentInfo(true);
        try {
            const res = await api.get(`/bookings/${booking.id}/payments`);
            const data = res.data.data;
            setPaymentInfo(data);
            setPaymentForm({
                amount: data.next_suggested.amount,
                milestone: data.next_suggested.milestone,
                payment_method: 'CASH',
                transaction_reference: '',
                notes: ''
            });
        } catch (err) {
            alert("Failed to load payment info");
        } finally {
            setLoadingPaymentInfo(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!confirm(`Confirm payment of ${formatCurrency(paymentForm.amount)}?`)) return;
        setIsSubmitting(true);
        try {
            await api.post(`/bookings/${selectedBookingForPayment.id}/payments`, paymentForm);
            alert("Payment recorded successfully!");
            setShowPaymentModal(false);
            fetchVendors();
            fetchEventDetails();
        } catch (err) {
            alert(err.response?.data?.message || "Payment failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- REUSABLE PAGINATION & SEARCH LOGIC ---
    const getPaginatedData = (data, searchFields) => {
        const filtered = data.filter(item => 
            searchFields.some(field => {
                const val = field.split('.').reduce((obj, key) => obj?.[key], item);
                return val?.toString().toLowerCase().includes(searchQuery.toLowerCase());
            })
        );
        const start = (currentPage - 1) * itemsPerPage;
        return {
            items: filtered.slice(start, start + itemsPerPage),
            total: filtered.length
        };
    };

    if (loading) return <PageLoader />;
    if (!event) return <div className="text-center py-12">Event not found.</div>;

    return (
        <div className="space-y-6">
            {/* Header Card */}
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{event.event_name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5"><Calendar size={16} className="text-brand-500" /> {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div className="flex items-center gap-1.5"><MapPin size={16} className="text-brand-500" /> {event.venue_name || 'Venue not set'}, {event.region}</div>
                            <div className="flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400"><Store size={16} /> {event.event_type}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-sm">
                {[
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'guests', label: 'Guests', icon: Users },
                    { id: 'contributors', label: 'Finance', icon: Wallet },
                    { id: 'budget', label: 'Budget', icon: DollarSign },
                    { id: 'vendors', label: 'Vendors', icon: Store },
                    { id: 'committee', label: 'Committee', icon: Shield }
                ].map(tab => (
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
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Budget" value={formatCurrency(event.target_budget)} icon={Wallet} color="blue" />
                        <StatCard title="Pledged" value={formatCurrency(event.total_pledged)} icon={TrendingUp} color="emerald" />
                        <StatCard title="Collected" value={formatCurrency(event.total_collected)} icon={CheckCircle} color="emerald" />
                        <StatCard title="Guests" value={event.expected_guests} icon={Users} color="purple" />
                    </div>
                )}

                {/* --- UNIVERSAL SEARCH BAR FOR LISTS --- */}
                {activeTab !== 'overview' && (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder={`Search in ${activeTab}...`} 
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-brand-500 bg-white dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        {activeTab === 'guests' && <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add Guest</button>}
                        {activeTab === 'contributors' && <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add Pledge</button>}
                        {activeTab === 'budget' && <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add Item</button>}
                    </div>
                )}

                {/* --- VENDORS TAB --- */}
                {activeTab === 'vendors' && (
                    <div className="space-y-8">
                        {/* Catalog CTA */}
                        <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold">Find Professional Vendors</h3>
                                <p className="text-white/80 text-sm">Browse our verified catalog to hire the best for your event.</p>
                            </div>
                            <button onClick={() => navigate('/vendor-catalog')} className="bg-white text-brand-700 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-lg shadow-black/10">
                                <Search size={18} /> Visit Catalog
                            </button>
                        </div>

                        {/* Confirmed Bookings */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                <h3 className="font-bold text-slate-900 dark:text-white">Confirmed Hires</h3>
                                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Official</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 w-12 text-center">#</th>
                                            <th className="px-6 py-4">Vendor</th>
                                            <th className="px-6 py-4">Service</th>
                                            <th className="px-6 py-4 text-right">Agreed Price</th>
                                            <th className="px-6 py-4 text-right">Paid</th>
                                            <th className="px-6 py-4 text-right">Balance</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {vendors.filter(v => v.status === 'ACCEPTED').length === 0 ? (
                                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">No confirmed hires yet.</td></tr>
                                        ) : vendors.filter(v => v.status === 'ACCEPTED').map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">{v.vendor?.business_name}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{v.vendor?.phone}</div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{v.assigned_service}</td>
                                                <td className="px-6 py-4 text-right font-bold">{formatCurrency(v.agreed_amount)}</td>
                                                <td className="px-6 py-4 text-right text-emerald-600 font-bold">{formatCurrency(v.amount_paid)}</td>
                                                <td className="px-6 py-4 text-right text-orange-600 font-bold">{formatCurrency(v.balance_due)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {parseFloat(v.balance_due) > 0 && (
                                                            <button 
                                                                onClick={() => openPaymentModal(v)}
                                                                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                                                            >
                                                                Pay Milestone
                                                            </button>
                                                        )}
                                                        <button className="p-2 text-slate-400 hover:text-brand-600"><Edit size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ... (inquiries table) ... */}
                    </div>
                )}

                {/* ... (rest of tabs) ... */}
            </div>

            {/* MILESTONE PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Record Vendor Payment</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Milestone Verification</p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        {loadingPaymentInfo ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-brand-600 mb-2" /> <p className="text-sm text-slate-500 font-medium">Fetching ledger info...</p></div>
                        ) : (
                            <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                                {/* Wallet Info */}
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-emerald-600"><Wallet size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase">Available in Wallet</p>
                                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(paymentInfo?.event_wallet_balance)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{paymentInfo?.next_suggested.milestone}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Milestone Stage</label>
                                        <select 
                                            required
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={paymentForm.milestone}
                                            onChange={e => setPaymentForm({...paymentForm, milestone: e.target.value})}
                                        >
                                            <option value="DEPOSIT">Deposit (20%)</option>
                                            <option value="INTERIM">Interim (50%)</option>
                                            <option value="FINAL">Final (30%)</option>
                                            <option value="CUSTOM">Custom Amount</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount (TZS)</label>
                                        <input 
                                            type="number" 
                                            required
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                                            value={paymentForm.amount}
                                            onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['CASH', 'BANK', 'MOBILE_MONEY'].map(m => (
                                            <button 
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentForm({...paymentForm, payment_method: m})}
                                                className={`py-2 rounded-lg text-[10px] font-black border transition-all ${paymentForm.payment_method === m ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {m.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction Reference (Optional)</label>
                                    <input 
                                        type="text"
                                        placeholder="Receipt # or M-Pesa ID"
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                        value={paymentForm.transaction_reference}
                                        onChange={e => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting || paymentForm.amount > (paymentInfo?.event_wallet_balance || 0)}
                                    className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Recording...</> : 'Confirm Payment Release'}
                                </button>
                                
                                {paymentForm.amount > (paymentInfo?.event_wallet_balance || 0) && (
                                    <p className="text-[10px] text-red-600 font-bold text-center animate-pulse">Insufficient funds in Event Wallet!</p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <PaginationFooter data={getPaginatedData(guests, ['full_name', 'phone', 'category'])} currentPage={currentPage} onPageChange={setCurrentPage} />
                    </div>
                )}

                {/* Finance, Budget, etc. Tabs follow same pattern ... */}
            </div>
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${colors[color]}`}><Icon size={24} /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{value}</p>
                </div>
            </div>
        </div>
    );
};

const PaginationFooter = ({ data, currentPage, onPageChange }) => {
    if (data.total <= 10) return null;
    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Showing <span className="font-bold">{(currentPage - 1) * 10 + 1}</span> to <span className="font-bold">{Math.min(currentPage * 10, data.total)}</span> of <span className="font-bold">{data.total}</span> records</p>
            <div className="flex gap-2">
                <button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 transition-all"><ChevronLeft size={16} /></button>
                <button onClick={() => onPageChange(p => p + 1)} disabled={currentPage * 10 >= data.total} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 transition-all"><ChevronRight size={16} /></button>
            </div>
        </div>
    );
};

export default EventDetailsPage;
