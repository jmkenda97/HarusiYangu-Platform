import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { 
    Store, Star, MapPin, DollarSign, Search, X, Loader2, 
    Briefcase, Phone, Mail, Calendar, CheckCircle, Clock,
    Plus, ChevronLeft, ChevronRight
} from 'lucide-react';

// --- UTILITY FUNCTIONS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);
};

const formatServiceType = (type) => {
    const labels = {
        CATERING: 'Catering',
        DECORATION: 'Decoration',
        MC: 'MC / Host',
        PHOTOGRAPHY: 'Photography',
        VIDEOGRAPHY: 'Videography',
        SOUND: 'Sound & Audio',
        TRANSPORT: 'Transport',
        TENT_CHAIRS: 'Tent & Chairs',
        CAKE: 'Cake',
        MAKEUP: 'Makeup & Beauty',
        SECURITY: 'Security',
        VENUE: 'Venue',
        PRINTING: 'Printing',
        OTHER: 'Other'
    };
    return labels[type] || type;
};

const getServiceTypeColor = (type) => {
    const colors = {
        CATERING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        DECORATION: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        MC: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        PHOTOGRAPHY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        VIDEOGRAPHY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        SOUND: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
        TRANSPORT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        TENT_CHAIRS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        CAKE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
        MAKEUP: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
        SECURITY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        VENUE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        PRINTING: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
        OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    };
    return colors[type] || colors.OTHER;
};

const paginate = (array, page, perPage) => array.slice((page - 1) * perPage, page * perPage);

// --- MEMOIZED COMPONENTS ---
const VendorCard = ({ vendor, onViewProfile }) => {
    const priceRange = useMemo(() => {
        if (!vendor.services || vendor.services.length === 0) return null;
        const minPrices = vendor.services.map(s => parseFloat(s.min_price) || 0);
        const maxPrices = vendor.services.map(s => parseFloat(s.max_price) || 0);
        const min = Math.min(...minPrices);
        const max = Math.max(...maxPrices);
        if (min === 0 && max === 0) return 'Contact for pricing';
        if (min === max) return formatCurrency(min);
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    }, [vendor.services]);

    const uniqueServiceTypes = useMemo(() => {
        if (!vendor.services) return [];
        const types = [...new Set(vendor.services.map(s => s.service_type))];
        return types.slice(0, 3); // Show max 3 badges
    }, [vendor.services]);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-500 transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{vendor.business_name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{vendor.full_name}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{vendor.rating || '0.0'}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {uniqueServiceTypes.map(type => (
                    <span key={type} className={`px-2 py-1 rounded-md text-xs font-medium ${getServiceTypeColor(type)}`}>
                        {formatServiceType(type)}
                    </span>
                ))}
                {vendor.services?.length > 3 && (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        +{vendor.services.length - 3} more
                    </span>
                )}
            </div>

            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate">{vendor.address || 'Location not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400" />
                    <span>{vendor.services?.length || 0} services offered</span>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Price Range</span>
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                            {priceRange || 'Contact for pricing'}
                        </span>
                    </div>
                    <button 
                        onClick={() => onViewProfile(vendor)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        View Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

const VendorProfileModal = ({ vendor, onClose, userEvents, onAssignToEvent }) => {
    const [selectedEvent, setSelectedEvent] = useState('');
    const [assignForm, setAssignForm] = useState({
        assigned_service: '',
        agreed_amount: '',
        contract_notes: '',
        start_date: '',
        end_date: ''
    });
    const [isAssigning, setIsAssigning] = useState(false);
    const [showAssignForm, setShowAssignForm] = useState(false);

    if (!vendor) return null;

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        
        setIsAssigning(true);
        try {
            await api.post(`/events/${selectedEvent}/vendors`, {
                vendor_id: vendor.id,
                ...assignForm
            });
            onAssignToEvent?.();
            setShowAssignForm(false);
            setAssignForm({ assigned_service: '', agreed_amount: '', contract_notes: '', start_date: '', end_date: '' });
            setSelectedEvent('');
            alert('Vendor assigned successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign vendor');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{vendor.business_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Vendor Profile</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {/* Vendor Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-lg">
                                    {vendor.business_name?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{vendor.full_name}</p>
                                    <div className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                                        <Star size={14} className="fill-yellow-500" />
                                        <span className="font-bold">{vendor.rating || '0.0'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Phone size={14} className="text-slate-400" />
                                    {vendor.phone || 'N/A'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Mail size={14} className="text-slate-400" />
                                    {vendor.email || 'N/A'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <MapPin size={14} className="text-slate-400" />
                                    {vendor.address || 'Address not specified'}
                                </div>
                            </div>
                        </div>

                        {/* Assign to Event Section */}
                        {userEvents?.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                {!showAssignForm ? (
                                    <button 
                                        onClick={() => setShowAssignForm(true)}
                                        className="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Plus size={16} /> Assign to Event
                                    </button>
                                ) : (
                                    <form onSubmit={handleAssign} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Event</label>
                                            <select 
                                                required
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                value={selectedEvent}
                                                onChange={e => setSelectedEvent(e.target.value)}
                                            >
                                                <option value="">Choose an event...</option>
                                                {userEvents.map(evt => (
                                                    <option key={evt.id} value={evt.id}>{evt.event_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Service Required</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="e.g. Photography, Catering"
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                value={assignForm.assigned_service}
                                                onChange={e => setAssignForm({...assignForm, assigned_service: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Agreed Amount (TZS)</label>
                                            <input 
                                                type="number" 
                                                required
                                                placeholder="0.00"
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                value={assignForm.agreed_amount}
                                                onChange={e => setAssignForm({...assignForm, agreed_amount: e.target.value})}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                    value={assignForm.start_date}
                                                    onChange={e => setAssignForm({...assignForm, start_date: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                    value={assignForm.end_date}
                                                    onChange={e => setAssignForm({...assignForm, end_date: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                                            <textarea 
                                                rows="2"
                                                placeholder="Contract details, special requirements..."
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                                value={assignForm.contract_notes}
                                                onChange={e => setAssignForm({...assignForm, contract_notes: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setShowAssignForm(false)}
                                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={isAssigning || !selectedEvent}
                                                className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isAssigning ? <><Loader2 size={14} className="animate-spin" /> Assigning...</> : 'Assign'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Services List */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4">Services Offered</h4>
                        {vendor.services?.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No services listed</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {vendor.services.map(service => (
                                    <div key={service.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-medium text-slate-900 dark:text-white">{service.service_name}</h5>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getServiceTypeColor(service.service_type)}`}>
                                                {formatServiceType(service.service_type)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                                            {service.description || 'No description available'}
                                        </p>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-brand-600 dark:text-brand-400">
                                                {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500">per {service.price_unit || 'service'}</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-xs">
                                            {service.is_available ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircle size={12} /> Available
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                                    <Clock size={12} /> Unavailable
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VendorCatalogPage = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('');
    const [selectedVendor, setSelectedVendor] = useState(null);
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
            const res = await api.get('/vendor-catalog');
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="text-brand-600" size={28} />
                        Vendor Catalog
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Browse and discover approved vendors for your events
                    </p>
                </div>
            </div>

            {/* Filter/Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search by vendor name..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                    <div className="md:w-64">
                        <select 
                            value={serviceTypeFilter}
                            onChange={(e) => { setServiceTypeFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                        >
                            {serviceTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Vendor Grid */}
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
                            <VendorCard 
                                key={vendor.id} 
                                vendor={vendor} 
                                onViewProfile={setSelectedVendor}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {filteredVendors.length > itemsPerPage && (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVendors.length)} of {filteredVendors.length}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <ChevronLeft size={12} /> Prev
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => p + 1)} 
                                    disabled={currentPage * itemsPerPage >= filteredVendors.length}
                                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    Next <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Vendor Profile Modal */}
            {selectedVendor && (
                <VendorProfileModal 
                    vendor={selectedVendor}
                    onClose={() => setSelectedVendor(null)}
                    userEvents={userEvents}
                    onAssignToEvent={fetchUserEvents}
                />
            )}
        </div>
    );
};

export default VendorCatalogPage;
