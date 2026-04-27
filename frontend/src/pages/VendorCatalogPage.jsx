import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { 
    Store, Star, MapPin, DollarSign, Search, X, Loader2, 
    Briefcase, Phone, Mail, Calendar, CheckCircle, Clock,
    Plus, ChevronLeft, ChevronRight, MessageSquare, AlertCircle, FileText, ExternalLink, ArrowRight, Tag
} from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { 
        style: 'currency', 
        currency: 'TZS',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const formatServiceType = (type) => {
    return type?.replace(/_/g, ' ') || 'N/A';
};

const getServiceTypeColor = (type) => {
    const colors = {
        CATERING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        DECORATION: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
        MC: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        PHOTOGRAPHY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        VIDEOGRAPHY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        SOUND: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        VENUE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        DEFAULT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    };
    return colors[type] || colors.DEFAULT;
};

const paginate = (array, page_number, page_size) => {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
};

const getDocumentViewUrl = (documentId) => `${api.defaults.baseURL}/vendors/documents/${documentId}/view`;

const VendorCard = ({ vendor, onViewProfile }) => {
    // Only show verified services in the catalog card
    const activeServices = useMemo(() => {
        return vendor.services?.filter(s => s.is_verified) || [];
    }, [vendor.services]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all duration-300 overflow-hidden group flex flex-col h-full">
            {/* Header / Business Info */}
            <div className="p-6 pb-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                        <Store size={24} />
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800/50">
                        <Star size={14} className="fill-yellow-500" />
                        <span className="text-xs font-bold">{vendor.rating || '0.0'}</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors truncate">{vendor.business_name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-4">
                    <MapPin size={14} className="text-brand-500" />
                    <span className="text-xs font-medium capitalize truncate">{vendor.address || 'Location not specified'}</span>
                </div>
            </div>

            {/* Services List Detail */}
            <div className="px-6 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Tag size={10} /> Services & Pricing
                </p>
                <div className="space-y-3">
                    {activeServices.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No active services listed</p>
                    ) : (
                        activeServices.slice(0, 3).map(service => (
                            <div key={service.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 group/item hover:border-brand-200 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{service.service_name}</h4>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${getServiceTypeColor(service.service_type)}`}>
                                        {service.service_type.slice(0, 3)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                                        {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 italic">per {service.price_unit?.replace('per_', '') || 'event'}</span>
                                </div>
                            </div>
                        ))
                    )}
                    {activeServices.length > 3 && (
                        <p className="text-center text-[10px] font-bold text-slate-400 mt-2 hover:text-brand-600 cursor-pointer transition-colors" onClick={() => onViewProfile(vendor)}>
                            + {activeServices.length - 3} more services available
                        </p>
                    )}
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                    onClick={() => onViewProfile(vendor)}
                    className="w-full bg-slate-900 dark:bg-brand-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-600 dark:hover:bg-brand-700 transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                    View Details & Inquiry <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

const VendorProfileModal = ({ vendor, onClose, userEvents }) => {
    const [selectedEvent, setSelectedEvent] = useState('');
    const [budgetItemsList, setBudgetItemsList] = useState([]);
    const [loadingBudget, setLoadingBudget] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({
        budget_item_id: '',
        assigned_service: '',
        contract_notes: '',
        target_amount: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (selectedEvent) {
            fetchBudgetItems(selectedEvent);
        } else {
            setBudgetItemsList([]);
        }
    }, [selectedEvent]);

    const fetchBudgetItems = async (eventId) => {
        setLoadingBudget(true);
        try {
            const res = await api.get(`/events/${eventId}/budget-items`);
            // Filter to only show "Open" budget items:
            // 1. Not PAID or CANCELLED
            // 2. No vendorAssignment OR vendorAssignment status is REJECTED or CANCELLED
            const allItems = res.data.data || [];
            const openItems = allItems.filter(item => {
                const isStatusOpen = !['PAID', 'CANCELLED'].includes(item.budget_item_status);
                const hasNoActiveVendor = !item.vendorAssignment || ['REJECTED', 'CANCELLED'].includes(item.vendorAssignment.status);
                return isStatusOpen && hasNoActiveVendor;
            });
            setBudgetItemsList(openItems);
        } catch (err) {
            console.error('Failed to fetch budget items', err);
            setBudgetItemsList([]);
        } finally {
            setLoadingBudget(false);
        }
    };

    const [previewDoc, setPreviewDoc] = useState(null);

    const PreviewModal = ({ doc, onClose }) => {
        if (!doc) return null;
        
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
                <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{doc.document_name}</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{doc.document_type.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
                        {doc.mime_type?.includes('pdf') ? (
                            <iframe src={doc.file_url_full} title={doc.document_name} className="h-full w-full rounded-lg bg-white shadow-sm border-0" />
                        ) : (
                            <img src={doc.file_url_full} alt={doc.document_name} className="max-h-full max-w-full rounded-lg shadow-lg object-contain" />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleSendInquiry = async (e) => {
        e.preventDefault();
        if (!selectedEvent || !inquiryForm.budget_item_id) return;
        
        setIsSubmitting(true);
        try {
            const res = await api.post(`/events/${selectedEvent}/inquiry`, {
                vendor_id: vendor.id,
                ...inquiryForm
            });
            setSuccessMessage('Inquiry sent successfully! The vendor has been notified.');
            setTimeout(() => {
                setShowInquiryForm(false);
                setSuccessMessage('');
                onClose();
                // Redirection to the event's vendor tab
                navigate(`/events/${selectedEvent}?tab=vendors`);
            }, 2000);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send inquiry');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!vendor) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                            <Store size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{vendor.business_name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Professional Vendor Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 animate-in slide-in-from-top-2">
                            <CheckCircle size={20} />
                            <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Sidebar Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-brand-500"><Phone size={14} /></div>
                                        {vendor.phone || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-brand-500"><Mail size={14} /></div>
                                        {vendor.email || 'N/A'}
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-brand-500 flex-shrink-0"><MapPin size={14} /></div>
                                        <span className="capitalize">{vendor.address || 'Location not specified'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-brand-50/50 dark:bg-brand-900/10 p-5 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                                <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-4">Vendor Rating</h4>
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{vendor.rating || '0.0'}</div>
                                            <div className="flex text-yellow-400 mt-1 justify-center"><Star size={10} className="fill-yellow-400" /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified performance across {vendor.services?.length || 0} services.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inquiry Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <MessageSquare size={120} />
                                </div>
                                
                                {!showInquiryForm ? (
                                    <div className="text-center py-8 relative z-10">
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3">Ready to Hire?</h4>
                                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">Submit an inquiry to receive a customized price quote directly from the vendor for your event date.</p>
                                        <button 
                                            onClick={() => setShowInquiryForm(true)}
                                            className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-2xl font-black text-base shadow-xl shadow-brand-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 mx-auto"
                                        >
                                            <MessageSquare size={20} /> Get a Quote Now
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendInquiry} className="space-y-5 relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white">New Booking Inquiry</h4>
                                            <button type="button" onClick={() => setShowInquiryForm(false)} className="text-xs font-bold text-brand-600 hover:underline">Back to Profile</button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Your Event</label>
                                                <select 
                                                    required
                                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all"
                                                    value={selectedEvent}
                                                    onChange={e => setSelectedEvent(e.target.value)}
                                                >
                                                    <option value="">-- Select Event --</option>
                                                    {userEvents.map(evt => (
                                                        <option key={evt.id} value={evt.id}>{evt.event_name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Allocation</label>
                                                <select 
                                                    required
                                                    disabled={!selectedEvent || loadingBudget}
                                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all disabled:opacity-50"
                                                    value={inquiryForm.budget_item_id}
                                                    onChange={e => {
                                                        const item = budgetItemsList.find(i => i.id === e.target.value);
                                                        setInquiryForm({
                                                            ...inquiryForm, 
                                                            budget_item_id: e.target.value,
                                                            assigned_service: item ? item.item_name : ''
                                                        });
                                                    }}
                                                >
                                                    <option value="">{loadingBudget ? 'Loading...' : '-- Select Budget Item --'}</option>
                                                    {budgetItemsList.map(item => (
                                                        <option key={item.id} value={item.id}>{item.item_name} (Est: {formatCurrency(item.estimated_cost)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Requirements</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    placeholder="e.g. Wedding Photography"
                                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 outline-none bg-white dark:bg-slate-900 dark:text-white shadow-sm"
                                                    value={inquiryForm.assigned_service}
                                                    onChange={e => setInquiryForm({...inquiryForm, assigned_service: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-brand-600 uppercase tracking-widest">Target Price (Optional Bargain)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="e.g. 350000"
                                                    className="w-full border border-brand-200 dark:border-brand-900/30 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 outline-none bg-brand-50/10 dark:bg-brand-900/10 dark:text-white shadow-inner font-bold"
                                                    value={inquiryForm.target_amount}
                                                    onChange={e => setInquiryForm({...inquiryForm, target_amount: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Notes & Requests</label>
                                            <textarea 
                                                rows="3"
                                                placeholder="Tell the vendor about specific themes, guest counts, or time preferences..."
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 outline-none bg-white dark:bg-slate-900 dark:text-white shadow-sm resize-none"
                                                value={inquiryForm.contract_notes}
                                                onChange={e => setInquiryForm({...inquiryForm, contract_notes: e.target.value})}
                                            />
                                        </div>

                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || !selectedEvent || !inquiryForm.budget_item_id}
                                            className="w-full bg-brand-600 text-white px-4 py-4 rounded-xl font-black text-base hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 active:scale-95 mt-2"
                                        >
                                            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : 'Send Inquiry To Vendor'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Services Full List */}
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">Service Packages</h4>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">{vendor.services?.length || 0} Listed</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {vendor.services?.map(service => (
                                <div key={service.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 transition-all group/card">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h5 className="font-bold text-slate-900 dark:text-white group-hover/card:text-brand-600 transition-colors text-lg">{service.service_name}</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${getServiceTypeColor(service.service_type)}`}>
                                                    {formatServiceType(service.service_type)}
                                                </span>
                                                {!service.is_verified && (
                                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pending Approval</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-brand-600 dark:text-brand-400 font-black text-lg">{formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Price Range</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                        {service.description || 'Professional service package tailored to meet your event requirements with high quality standards.'}
                                    </p>
                                    <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Clock size={14} className="text-brand-500" />
                                            <span>Price Unit: <strong>{service.price_unit?.replace(/_/g, ' ')}</strong></span>
                                        </div>
                                        <span className={`flex items-center gap-1.5 font-bold ${service.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <CheckCircle size={14} /> {service.is_available ? 'Ready to Book' : 'Currently Unavailable'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {(vendor.documents?.length > 0 || vendor.services?.some(service => (service.documents?.length || 0) > 0)) && (
                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white">Approved Documents</h4>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">Compliance Ready</span>
                            </div>

                            {vendor.documents?.filter(d => d.verification_status === 'APPROVED').length > 0 && (
                                <div className="mb-6">
                                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">General Vendor Documents</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {vendor.documents.filter(d => d.verification_status === 'APPROVED').map(doc => (
                                            <div key={doc.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{doc.document_name}</p>
                                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{formatServiceType(doc.document_type)}</p>
                                                    </div>
                                                </div>
                                                {['TIN_CERTIFICATE', 'BRELA_CERTIFICATE', 'BUSINESS_LICENSE', 'INSURANCE'].includes(doc.document_type) ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                                        <CheckCircle size={14} className="fill-emerald-500/20" />
                                                        <span className="text-[10px] font-black uppercase tracking-tight">Verified</span>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setPreviewDoc(doc)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {vendor.services?.filter(service => service.documents?.some(d => d.verification_status === 'APPROVED')).map(service => (
                                    <div key={service.id}>
                                        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{service.service_name}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {service.documents.filter(d => d.verification_status === 'APPROVED').map(doc => (
                                                <div key={doc.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{doc.document_name}</p>
                                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{formatServiceType(doc.document_type)}</p>
                                                        </div>
                                                    </div>
                                                    {['TIN_CERTIFICATE', 'BRELA_CERTIFICATE', 'BUSINESS_LICENSE', 'INSURANCE'].includes(doc.document_type) ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                                            <CheckCircle size={14} className="fill-emerald-500/20" />
                                                            <span className="text-[10px] font-black uppercase tracking-tight">Verified</span>
                                                        </div>
                                                    ) : (
                                                        <button type="button" onClick={() => setPreviewDoc(doc)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </div>
    );
};

const VendorCatalogPage = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('');
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [loadingVendorProfile, setLoadingVendorProfile] = useState(false);
    const [userEvents, setUserEvents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const serviceTypes = [
        { value: '', label: 'All Services' },
        { value: 'CATERING', label: 'Catering' },
        { value: 'DECORATION', label: 'Decoration' },
        { value: 'MC', label: 'MC / Host' },
        { value: 'PHOTOGRAPHY', label: 'Photography' },
        { value: 'VIDEOGRAPHY', label: 'Videography' },
        { value: 'SOUND', label: 'Sound & Audio' },
        { value: 'TRANSPORT', label: 'Transport' },
        { value: 'TENT_CHAIRS', label: 'Tent & Chairs' },
        { value: 'CAKE', label: 'Cake' },
        { value: 'MAKEUP', label: 'Makeup & Beauty' },
        { value: 'SECURITY', label: 'Security' },
        { value: 'VENUE', label: 'Venue' },
        { value: 'PRINTING', label: 'Printing' },
        { value: 'OTHER', label: 'Other' }
    ];

    useEffect(() => {
        fetchVendors();
        fetchUserEvents();
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendors');
            setVendors(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserEvents = async () => {
        try {
            const res = await api.get('/events');
            setUserEvents(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    };

    const openVendorProfile = async (vendor) => {
        setLoadingVendorProfile(true);
        try {
            const res = await api.get(`/vendors/${vendor.id}`);
            setSelectedVendor(res.data.data);
        } catch (err) {
            console.error('Failed to fetch vendor profile:', err);
            setSelectedVendor(vendor);
        } finally {
            setLoadingVendorProfile(false);
        }
    };

    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            const matchesSearch = !searchQuery || 
                vendor.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                vendor.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesType = !serviceTypeFilter || 
                vendor.services?.some(s => s.service_type === serviceTypeFilter);
            
            return matchesSearch && matchesType;
        });
    }, [vendors, searchQuery, serviceTypeFilter]);

    const displayedVendors = paginate(filteredVendors, currentPage, itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Vendor Catalog...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="text-brand-600" size={28} />
                        Professional Vendor Catalog
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Find and hire verified professionals for your special event.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search by vendor business name..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                    <div className="md:w-64">
                        <select 
                            value={serviceTypeFilter}
                            onChange={(e) => { setServiceTypeFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white font-medium"
                        >
                            {serviceTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {filteredVendors.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <Store size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-2">No vendors found</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        {searchQuery || serviceTypeFilter 
                            ? 'Try adjusting your search or filter criteria' 
                            : 'No approved vendors available at the moment'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedVendors.map(vendor => (
                            <VendorCard key={vendor.id} vendor={vendor} onViewProfile={openVendorProfile} />
                        ))}
                    </div>

                    {filteredVendors.length > itemsPerPage && (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <span className="font-bold text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredVendors.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredVendors.length}</span> vendors
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                    className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => p + 1)} 
                                    disabled={currentPage * itemsPerPage >= filteredVendors.length}
                                    className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {loadingVendorProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="rounded-2xl bg-white dark:bg-slate-900 px-6 py-4 shadow-xl flex items-center gap-3">
                        <Loader2 size={20} className="animate-spin text-brand-600" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">Loading vendor profile...</span>
                    </div>
                </div>
            )}

            {selectedVendor && (
                <VendorProfileModal 
                    vendor={selectedVendor}
                    onClose={() => setSelectedVendor(null)}
                    userEvents={userEvents}
                />
            )}
        </div>
    );
};

export default VendorCatalogPage;
