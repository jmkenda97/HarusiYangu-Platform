import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../api/axios';
import { Plus, Calendar as CalendarIcon, MapPin, MoreHorizontal, Edit, Trash2, Clock, Wallet, X, ChevronDown, ChevronUp, Users, Loader2 } from 'lucide-react';

// --- OPTIMIZATION: MOVED OUTSIDE COMPONENT ---
// This prevents the function from being recreated on every render, improving performance.
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
};

// --- TOAST NOTIFICATION SYSTEM ---
const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';
    const iconColor = type === 'success' ? 'text-green-600' : 'text-red-600';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`} style={{zIndex: 9999}}>
            {type === 'success' ? <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center"><span className="text-green-600 dark:text-green-200 text-xs">✓</span></div> : <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center"><span className="text-red-600 dark:text-red-200 text-xs">!</span></div>}
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

    // --- NEW: SUBMITTING STATE ---
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const [activeMenuId, setActiveMenuId] = useState(null);

    const [formData, setFormData] = useState({
        event_name: '', event_type: 'WEDDING', event_date: '', start_time: '', end_time: '',
        groom_name: '', bride_name: '', celebrant_name: '',
        venue_name: '', venue_address: '', region: '', district: '',
        target_budget: '', contingency_amount: '', description: ''
    });
    const [isEditing, setIsEditing] = useState(null);
    const [openSection, setOpenSection] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events');
            setEvents(res.data.data);
        } catch (err) {
            console.error("Full Error:", err);
            showToast("Failed to fetch events", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleDeleteClick = async (e, eventId) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;

        // Optimistic UI Update
        const originalEvents = [...events];
        setEvents(prev => prev.filter(ev => ev.id !== eventId));

        try {
            await api.delete(`/events/${eventId}`);
            showToast("Event deleted permanently", "success");
            setActiveMenuId(null);
        } catch (err) {
            setEvents(originalEvents);
            const msg = err.response?.data?.message || "Failed to delete event";
            showToast(msg, "error");
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
                target_budget: data.target_budget || '',
                contingency_amount: data.conting_amount || '',
                description: data.description || '',
            });
            setIsModalOpen(true);
            setActiveMenuId(null);
        } catch (err) {
            showToast("Failed to load event details", "error");
        }
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        
        // PREVENT DOUBLE SUBMISSION
        if (isSubmitting) return; 
        
        const payload = { ...formData };
        Object.keys(payload).forEach(key => payload[key] === '' && delete payload[key]);

        // START LOADING
        setIsSubmitting(true);

        try {
            if (isEditing) {
                await api.put(`/events/${isEditing}`, payload);
                showToast("Event updated successfully", "success");
            } else {
                await api.post('/events', payload);
                showToast("Event created successfully", "success");
            }
            setIsModalOpen(false);
            resetForm();
            fetchEvents();
        } catch (err) {
            const msg = err.response?.data?.message || "Operation failed";
            showToast(msg, "error");
        } finally {
            // STOP LOADING
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            event_name: '', event_type: 'WEDDING', event_date: '', start_time: '', end_time: '',
            groom_name: '', bride_name: '', celebrant_name: '',
            venue_name: '', venue_address: '', region: '', district: '',
            target_budget: '', contingency_amount: '', description: ''
        });
        setIsEditing(null);
        setOpenSection(null);
    };

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) return <div className="text-center p-10 text-slate-500 dark:text-slate-400">Loading Events...</div>;

    return (
        <div className="space-y-6 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Events</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your upcoming occasions and contributions.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {events.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-4">No events found. Start by creating one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <div key={event.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-500 transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase">
                                    {event.event_type.replace('_', ' ')}
                                </span>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === event.id ? null : event.id); }}
                                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                    
                                    {activeMenuId === event.id && (
                                        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(e, event); }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                            >
                                                <Edit size={14} /> Edit
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, event.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div onClick={() => navigate(`/events/${event.id}`)} className="cursor-pointer">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                    {event.event_name}
                                </h3>
                                
                                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {event.event_type === 'WEDDING' && event.groom_name && (
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                            <Users size={14} /> <span className="font-medium">{event.groom_name} & {event.bride_name || 'Partner'}</span>
                                        </div>
                                    )}
                                    {(event.event_type === 'KITCHEN_PARTY' || event.event_type === 'SENDOFF') && event.celebrant_name && (
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                            <Users size={14} /> <span className="font-medium">{event.celebrant_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={16} /> {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    {event.venue_name && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} /> {event.venue_name}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 dark:text-slate-500">Target Budget</span>
                                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatCurrency(event.target_budget)}</span>
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                        {event.event_status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- CREATE/EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-6">
                            <form id="event-form" onSubmit={handleCreateOrUpdate} className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Name *</label>
                                            <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500" placeholder="e.g. Sarah & John Wedding" value={formData.event_name} onChange={e => setFormData({...formData, event_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Type *</label>
                                            <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}>
                                                <option value="WEDDING">Wedding</option>
                                                <option value="KITCHEN_PARTY">Kitchen Party</option>
                                                <option value="SENDOFF">Sendoff</option>
                                                <option value="BRIDAL_SHOWER">Bridal Shower</option>
                                                <option value="ENGAGEMENT">Engagement</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Date *</label>
                                            <input required type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                        <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('people')}>
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">The People</h4>
                                        {openSection === 'people' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    
                                    {openSection === 'people' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                            {formData.event_type === 'WEDDING' ? (
                                                <>
                                                    <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Groom's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.groom_name} onChange={e => setFormData({...formData, groom_name: e.target.value})} /></div>
                                                    <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Bride's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.bride_name} onChange={e => setFormData({...formData, bride_name: e.target.value})} /></div>
                                                </>
                                            ) : (
                                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Celebrant's Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.celebrant_name} onChange={e => setFormData({...formData, celebrant_name: e.target.value})} /></div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('logistics')}>
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Logistics & Venue</h4>
                                        {openSection === 'logistics' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    
                                    {openSection === 'logistics' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Start Time</label><input type="time" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} /></div>
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">End Time</label><input type="time" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} /></div>
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Venue Name</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.venue_name} onChange={e => setFormData({...formData, venue_name: e.target.value})} /></div>
                                            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Venue Address</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.venue_address} onChange={e => setFormData({...formData, venue_address: e.target.value})} /></div>
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Region</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} /></div>
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">District</label>
                                            <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('finance')}>
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Financials</h4>
                                        {openSection === 'finance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    
                                    {openSection === 'finance' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Target Budget (TZS) *</label><input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.target_budget} onChange={e => setFormData({...formData, target_budget: e.target.value})} /></div>
                                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Contingency Amount</label>
                                            <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white" value={formData.contingency_amount} onChange={e => setFormData({...formData, contingency_amount: e.target.value})} /></div>
                                        </div>
                                    )}
                                </div>

                            </form>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            
                            {/* BUTTON WITH LOADING STATE */}
                            <button 
                                onClick={() => document.getElementById('event-form').requestSubmit()} 
                                disabled={isSubmitting}
                                className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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