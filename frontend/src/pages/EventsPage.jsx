import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../api/axios';
import { Plus, Calendar as CalendarIcon, MapPin, MoreHorizontal, Edit, Trash2, Clock, Wallet, X, ChevronDown, ChevronUp, Users, Loader2, Search, ChevronLeft, ChevronRight, Info, Target, Users2 } from 'lucide-react';
import { SkeletonEventCard } from '../components/SkeletonLoader';

// --- TOAST NOTIFICATION SYSTEM ---
const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`} style={{zIndex: 9999}}>
            {type === 'success' ? <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center"><span className="text-green-600 dark:text-green-200 text-xs">Γ£ô</span></div> : <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center"><span className="text-red-600 dark:text-red-200 text-xs">!</span></div>}
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16} /></button>
        </div>
    );
};

const EventsPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [formData, setFormData] = useState({
        event_name: '', event_type: 'WEDDING', event_date: '', start_time: '', end_time: '',
        groom_name: '', bride_name: '', celebrant_name: '',
        venue_name: '', venue_address: '', region: '', district: '', ward: '',
        google_map_link: '', expected_guests: '',
        target_budget: '', contingency_amount: '', description: ''
    });
    const [isEditing, setIsEditing] = useState(null);
    const [openSection, setOpenSection] = useState('basic');

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events');
            setEvents(res.data.data || []);
        } catch (err) {
            console.error("Full Error:", err);
            showToast("Failed to fetch events", "error");
        } finally {
            setLoading(false);
        }
    };

    // Filtered events
    const filteredEvents = useMemo(() => {
        return events.filter(ev => 
            ev.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.groom_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.bride_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [events, searchQuery]);

    // Paginated events
    const paginatedEvents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEvents.slice(start, start + itemsPerPage);
    }, [filteredEvents, currentPage]);

    const handleDeleteClick = async (e, eventId) => {
        e.stopPropagation();
        e.preventDefault();
        if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;

        try {
            await api.delete(`/events/${eventId}`);
            showToast("Event deleted permanently", "success");
            fetchEvents();
            setActiveMenuId(null);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to delete event", "error");
        }
    };

    const handleEditClick = async (e, event) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            const res = await api.get(`/events/${event.id}`);
            const data = res.data.data;
            
            setIsEditing(data.id);
            setFormData({
                event_name: data.event_name || '',
                event_type: data.event_type,
                event_date: data.event_date || '',
                start_time: data.start_time || '',
                end_time: data.end_time || '',
                groom_name: data.groom_name || '',
                bride_name: data.bride_name || '',
                celebrant_name: data.celebrant_name || '',
                venue_name: data.venue_name || '',
                venue_address: data.venue_address || '',
                region: data.region || '',
                district: data.district || '',
                ward: data.ward || '',
                google_map_link: data.google_map_link || '',
                expected_guests: data.expected_guests || '',
                target_budget: data.target_budget || '',
                contingency_amount: data.contingency_amount || '',
                description: data.description || '',
            });
            setIsModalOpen(true);
            setActiveMenuId(null);
            setOpenSection('basic');
        } catch (err) {
            showToast("Failed to load event details", "error");
        }
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        if (isSubmitting) return; 
        
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/events/${isEditing}`, formData);
                showToast("Event updated successfully", "success");
            } else {
                await api.post('/events', formData);
                showToast("Event created successfully", "success");
            }
            setIsModalOpen(false);
            resetForm();
            fetchEvents();
        } catch (err) {
            showToast(err.response?.data?.message || "Operation failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            event_name: '', event_type: 'WEDDING', event_date: '', start_time: '', end_time: '',
            groom_name: '', bride_name: '', celebrant_name: '',
            venue_name: '', venue_address: '', region: '', district: '', ward: '',
            google_map_link: '', expected_guests: '',
            target_budget: '', contingency_amount: '', description: ''
        });
        setIsEditing(null);
        setOpenSection('basic');
    };

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonEventCard count={6} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Events</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your upcoming occasions and contributions.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search events by name, type, groom, bride or venue..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-brand-500 bg-white dark:bg-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {filteredEvents.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <p className="text-slate-500 dark:text-slate-400">No events found. Start by creating one!</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedEvents.map((event, idx) => (
                            <div key={event.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-300 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 left-0 bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded-br-lg">
                                    #{(currentPage - 1) * itemsPerPage + idx + 1}
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                            {event.event_type.replace('_', ' ')}
                                        </span>
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === event.id ? null : event.id); }}
                                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                            
                                            {activeMenuId === event.id && (
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(e, event); }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                                    >
                                                        <Edit size={14} /> Edit
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeleteClick(e, event.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div onClick={() => navigate(`/events/${event.id}`)} className="cursor-pointer">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors truncate">
                                            {event.event_name}
                                        </h3>
                                        
                                        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                            {event.event_type === 'WEDDING' ? (
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                    <Users size={14} className="text-slate-400" /> 
                                                    <span className="truncate">{event.groom_name || 'Groom'} & {event.bride_name || 'Bride'}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                    <Users size={14} className="text-slate-400" /> 
                                                    <span className="truncate">{event.celebrant_name || 'Celebrant'}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon size={14} className="text-slate-400" /> {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-2 truncate">
                                                <MapPin size={14} className="text-slate-400" /> {event.venue_name || 'Venue not set'}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Target Budget</span>
                                                <span className="text-sm font-bold text-brand-600">{formatCurrency(event.target_budget)}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                                {event.event_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {filteredEvents.length > itemsPerPage && (
                        <div className="mt-8 flex justify-center items-center gap-4">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-full border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors"><ChevronLeft size={20} className="dark:text-white" /></button>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Page {currentPage} of {Math.ceil(filteredEvents.length / itemsPerPage)}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * itemsPerPage >= filteredEvents.length} className="p-2 rounded-full border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors"><ChevronRight size={20} className="dark:text-white" /></button>
                        </div>
                    )}
                </>
            )}

            {/* --- CREATE/EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="text-brand-600" size={20} />
                                <h3 className="font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                            <form id="event-form" onSubmit={handleCreateOrUpdate} className="space-y-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSection('basic')}>
                                        <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600"><Info size={16} /></div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex-1">Basic Information</h4>
                                        {openSection === 'basic' ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                    
                                    {openSection === 'basic' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Event Name *</label>
                                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="e.g. Sarah & John Wedding" value={formData.event_name} onChange={e => setFormData({...formData, event_name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Event Type *</label>
                                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}>
                                                    <option value="WEDDING">Wedding</option>
                                                    <option value="KITCHEN_PARTY">Kitchen Party</option>
                                                    <option value="SENDOFF">Sendoff</option>
                                                    <option value="BAG_PARTY">Bag Party</option>
                                                    <option value="BRIDAL_SHOWER">Bridal Shower</option>
                                                    <option value="ENGAGEMENT">Engagement</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Event Date *</label>
                                                <input required type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" rows="2" placeholder="Tell us about the event..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* The People */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSection('people')}>
                                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600"><Users2 size={16} /></div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex-1">The People</h4>
                                        {openSection === 'people' ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                    
                                    {openSection === 'people' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            {formData.event_type === 'WEDDING' ? (
                                                <>
                                                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Groom's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="Groom" value={formData.groom_name} onChange={e => setFormData({...formData, groom_name: e.target.value})} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Bride's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="Bride" value={formData.bride_name} onChange={e => setFormData({...formData, bride_name: e.target.value})} /></div>
                                                </>
                                            ) : (
                                                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Celebrant's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="The person being celebrated" value={formData.celebrant_name} onChange={e => setFormData({...formData, celebrant_name: e.target.value})} /></div>
                                            )}
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Expected Guests</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="e.g. 200" value={formData.expected_guests} onChange={e => setFormData({...formData, expected_guests: e.target.value})} /></div>
                                        </div>
                                    )}
                                </div>

                                {/* Logistics */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSection('logistics')}>
                                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"><MapPin size={16} /></div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex-1">Logistics & Venue</h4>
                                        {openSection === 'logistics' ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                    
                                    {openSection === 'logistics' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Time</label><input type="time" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Time</label><input type="time" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} /></div>
                                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Venue Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="e.g. Mlimani City" value={formData.venue_name} onChange={e => setFormData({...formData, venue_name: e.target.value})} /></div>
                                            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Venue Address</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="Street, Area" value={formData.venue_address} onChange={e => setFormData({...formData, venue_address: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Region</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">District</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ward</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.ward} onChange={e => setFormData({...formData, ward: e.target.value})} /></div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Google Maps Link</label>
                                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" placeholder="https://goo.gl/maps/..." value={formData.google_map_link} onChange={e => setFormData({...formData, google_map_link: e.target.value})} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Financials */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleSection('finance')}>
                                        <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600"><Target size={16} /></div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex-1">Financials</h4>
                                        {openSection === 'finance' ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                    
                                    {openSection === 'finance' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Budget (TZS) *</label><input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.target_budget} onChange={e => setFormData({...formData, target_budget: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Contingency Amount (TZS)</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.contingency_amount} onChange={e => setFormData({...formData, contingency_amount: e.target.value})} /></div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button 
                                onClick={() => document.getElementById('event-form').requestSubmit()} 
                                disabled={isSubmitting}
                                className="bg-brand-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Processing...
                                    </>
                                ) : (
                                    <>
                                        {isEditing ? 'Update Event' : 'Create Event'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventsPage;
