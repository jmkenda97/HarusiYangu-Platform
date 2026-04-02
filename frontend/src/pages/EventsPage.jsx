import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, MapPin, MoreHorizontal } from 'lucide-react';

const EventsPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        event_name: '',
        event_type: 'WEDDING',
        event_date: '',
        target_budget: '',
        venue_name: ''
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events');
            setEvents(res.data.data);
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    };




        const handleCreateEvent = async (e) => {
        e.preventDefault();
        
        // FIX: Ensure date is YYYY-MM-DD
        let formattedDate = formData.event_date;
        // Simple check: if it contains slashes, assume DD/MM/YYYY or MM/DD/YYYY and convert
        // This is a safe fallback.
        if (formattedDate && formattedDate.includes('/')) {
            const parts = formattedDate.split('/');
            // Assuming DD/MM/YYYY for Tanzania context
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        }

        const payload = { ...formData, event_date: formattedDate };

        try {
            await api.post('/events', payload);
            setIsModalOpen(false);
            setFormData({ event_name: '', event_type: 'WEDDING', event_date: '', target_budget: '', venue_name: '' });
            fetchEvents(); // Refresh list
        } catch (err) {
            // 1. Log the full error to your Browser Console (Press F12 -> Console)
            console.error("Full Error:", err);
            console.error("Response Data:", err.response?.data);

            // 2. Show the specific server message in the alert
            const errorMessage = err.response?.data?.message || err.message || "Unknown error";
            alert("Error: " + errorMessage);
        }
       };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
    };

    if (loading) return <div className="text-center p-10 text-slate-500">Loading Events...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Events</h2>
                    <p className="text-slate-500">Manage your upcoming occasions and contributions.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {/* Events Grid */}
            {events.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                    <p className="text-slate-500 mb-4">No events found. Start by creating one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <Link key={event.id} to={`/events/${event.id}`} className="group">
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">
                                        {event.event_type.replace('_', ' ')}
                                    </span>
                                    <MoreHorizontal className="text-slate-400" size={18} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors">
                                    {event.event_name}
                                </h3>
                                <div className="space-y-2 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={16} /> {new Date(event.event_date).toLocaleDateString()}
                                    </div>
                                    {event.venue_name && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} /> {event.venue_name}
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-slate-100 mt-2 font-medium text-slate-900">
                                        Budget: {formatCurrency(event.target_budget)}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Create New Event</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    placeholder="e.g. Sarah & John Wedding"
                                    value={formData.event_name}
                                    onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.event_type}
                                    onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                                >
                                    <option value="WEDDING">Wedding</option>
                                    <option value="KITCHEN_PARTY">Kitchen Party</option>
                                    <option value="SENDOFF">Sendoff</option>
                                    <option value="ENGAGEMENT">Engagement</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input 
                                    required
                                    type="date" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.event_date}
                                    onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Target Budget (TZS)</label>
                                <input 
                                    required
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0.00"
                                    value={formData.target_budget}
                                    onChange={(e) => setFormData({...formData, target_budget: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Venue (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Venue Name"
                                    value={formData.venue_name}
                                    onChange={(e) => setFormData({...formData, venue_name: e.target.value})}
                                />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors">
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventsPage;