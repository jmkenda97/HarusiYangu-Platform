import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Building2, User, Phone, Mail, MapPin, Briefcase, Save, Upload, X, AlertCircle,
    CheckCircle, Clock, FileText, Trash2, Edit, Plus, DollarSign, Package,
    FileCheck, FileX, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount || 0);

const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`} style={{zIndex: 9999}}>
            {type === 'success' ? <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center"><span className="text-green-600 dark:text-green-200 text-xs">✓</span></div> : <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center"><span className="text-red-600 dark:text-red-200 text-xs">!</span></div>}
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16} /></button>
        </div>
    );
};

const SERVICE_TYPES = [
    'CATERING', 'DECORATION', 'MC', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'SOUND',
    'TRANSPORT', 'TENT_CHAIRS', 'CAKE', 'MAKEUP', 'SECURITY', 'VENUE', 'PRINTING', 'OTHER'
];

const PRICE_UNITS = [
    { value: 'per_event', label: 'Per Event' },
    { value: 'per_hour', label: 'Per Hour' },
    { value: 'per_day', label: 'Per Day' },
    { value: 'per_person', label: 'Per Person' },
    { value: 'flat_rate', label: 'Flat Rate' }
];

const DOCUMENT_TYPES = [
    { value: 'BUSINESS_LICENSE', label: 'Business License' },
    { value: 'TIN_CERTIFICATE', label: 'TIN Certificate' },
    { value: 'PORTFOLIO', label: 'Portfolio' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'OTHER', label: 'Other' }
];

const VendorProfilePage = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // Profile State
    const [profile, setProfile] = useState(null);
    const [profileExists, setProfileExists] = useState(false);
    const [profileForm, setProfileForm] = useState({
        business_name: '',
        full_name: '',
        phone: '',
        email: '',
        address: '',
        service_type: 'OTHER'
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Services State
    const [services, setServices] = useState([]);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceForm, setServiceForm] = useState({
        service_name: '',
        service_type: 'OTHER',
        description: '',
        min_price: '',
        max_price: '',
        price_unit: 'per_event',
        is_available: true
    });
    const [editingService, setEditingService] = useState(null);
    const [isSavingService, setIsSavingService] = useState(false);

    // Documents State
    const [documents, setDocuments] = useState([]);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentForm, setDocumentForm] = useState({
        document_name: '',
        document_type: 'OTHER'
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (activeTab === 'services') fetchServices();
        if (activeTab === 'documents') fetchDocuments();
    }, [activeTab]);

    // --- API CALLS ---
    const fetchProfile = async () => {
        try {
            const res = await api.get('/vendors/profile');
            const data = res.data.data;
            setProfile(data);
            setProfileExists(true);
            setProfileForm({
                business_name: data.business_name || '',
                full_name: data.full_name || '',
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                service_type: data.service_type || 'OTHER'
            });
        } catch (err) {
            if (err.response?.status === 404) {
                setProfileExists(false);
                setProfileForm({
                    business_name: '',
                    full_name: user?.full_name || '',
                    phone: user?.phone || '',
                    email: user?.email || '',
                    address: '',
                    service_type: 'OTHER'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await api.get('/vendors/services');
            setServices(res.data.data || []);
        } catch (err) {
            showToast('Failed to fetch services', 'error');
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/vendors/documents');
            setDocuments(res.data.data || []);
        } catch (err) {
            showToast('Failed to fetch documents', 'error');
        }
    };

    // --- HANDLERS ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            if (profileExists) {
                await api.put('/vendors/profile', profileForm);
                showToast('Profile updated successfully');
            } else {
                await api.post('/vendors/profile', profileForm);
                showToast('Profile created successfully');
                setProfileExists(true);
            }
            fetchProfile();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save profile', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        setIsSavingService(true);
        try {
            const payload = {
                ...serviceForm,
                min_price: parseFloat(serviceForm.min_price) || 0,
                max_price: parseFloat(serviceForm.max_price) || 0
            };
            if (editingService) {
                await api.put(`/vendors/services/${editingService.id}`, payload);
                showToast('Service updated successfully');
            } else {
                await api.post('/vendors/services', payload);
                showToast('Service added successfully');
            }
            setShowServiceModal(false);
            setEditingService(null);
            setServiceForm({
                service_name: '',
                service_type: 'OTHER',
                description: '',
                min_price: '',
                max_price: '',
                price_unit: 'per_event',
                is_available: true
            });
            fetchServices();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save service', 'error');
        } finally {
            setIsSavingService(false);
        }
    };

    const handleEditService = (service) => {
        setEditingService(service);
        setServiceForm({
            service_name: service.service_name,
            service_type: service.service_type,
            description: service.description || '',
            min_price: service.min_price || '',
            max_price: service.max_price || '',
            price_unit: service.price_unit || 'per_event',
            is_available: service.is_available
        });
        setShowServiceModal(true);
    };

    const handleDeleteService = async (serviceId) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            await api.delete(`/vendors/services/${serviceId}`);
            showToast('Service deleted successfully');
            fetchServices();
        } catch (err) {
            showToast('Failed to delete service', 'error');
        }
    };

    const handleToggleServiceAvailability = async (service) => {
        try {
            await api.put(`/vendors/services/${service.id}`, {
                ...service,
                is_available: !service.is_available
            });
            fetchServices();
            showToast(`Service ${service.is_available ? 'disabled' : 'enabled'}`);
        } catch (err) {
            showToast('Failed to update service', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'error');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDocumentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast('Please select a file', 'error');
            return;
        }
        setIsUploadingDocument(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('document_name', documentForm.document_name);
            formData.append('document_type', documentForm.document_type);

            await api.post('/vendors/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Document uploaded successfully');
            setShowDocumentModal(false);
            setSelectedFile(null);
            setDocumentForm({ document_name: '', document_type: 'OTHER' });
            fetchDocuments();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload document', 'error');
        } finally {
            setIsUploadingDocument(false);
        }
    };

    const handleDeleteDocument = async (documentId) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.delete(`/vendors/documents/${documentId}`);
            showToast('Document deleted successfully');
            fetchDocuments();
        } catch (err) {
            showToast('Failed to delete document', 'error');
        }
    };

    // --- HELPERS ---
    const getStatusBadge = (status) => {
        const styles = {
            PENDING_APPROVAL: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            ACTIVE: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
            INACTIVE: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            BLACKLISTED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.INACTIVE}`}>
                {status === 'ACTIVE' && <CheckCircle size={12} />}
                {status === 'PENDING_APPROVAL' && <Clock size={12} />}
                {(status === 'INACTIVE' || status === 'BLACKLISTED') && <AlertCircle size={12} />}
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getVerificationBadge = (status) => {
        const styles = {
            PENDING: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            APPROVED: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
            REJECTED: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.PENDING}`}>
                {status === 'APPROVED' && <FileCheck size={12} />}
                {status === 'REJECTED' && <FileX size={12} />}
                {status === 'PENDING' && <Clock size={12} />}
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {profileExists ? 'Vendor Profile' : 'Complete Your Vendor Profile'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {profileExists ? 'Manage your business profile, services, and documents.' : 'Set up your vendor profile to start offering services.'}
                    </p>
                </div>
                {profile && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
                        {getStatusBadge(profile.verification_status)}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 md:gap-8 overflow-x-auto">
                {['profile', 'services', 'documents'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab
                                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab === 'profile' && <span className="flex items-center gap-1"><Building2 size={14} /> Profile</span>}
                        {tab === 'services' && <span className="flex items-center gap-1"><Package size={14} /> Services</span>}
                        {tab === 'documents' && <span className="flex items-center gap-1"><FileText size={14} /> Documents</span>}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {profileExists ? 'Edit Profile' : 'Create Profile'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {profileExists ? 'Update your business information.' : 'Fill in your business details to get started.'}
                        </p>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Business Name *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={profileForm.business_name}
                                            onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            placeholder="Your business name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={profileForm.full_name}
                                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            placeholder="+255..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="email"
                                            required
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            value={profileForm.address}
                                            onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            placeholder="Business address"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Primary Service Type</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <select
                                            value={profileForm.service_type}
                                            onChange={(e) => setProfileForm({ ...profileForm, service_type: e.target.value })}
                                            className="w-full pl-10 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        >
                                            {SERVICE_TYPES.map(type => (
                                                <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => fetchProfile()}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSavingProfile ? (
                                        <><Loader2 className="animate-spin mr-2" size={16} /> Saving...</>
                                    ) : (
                                        <><Save size={16} className="mr-2" /> {profileExists ? 'Save Changes' : 'Create Profile'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Services</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Manage the services you offer to events.</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingService(null);
                                setServiceForm({
                                    service_name: '',
                                    service_type: 'OTHER',
                                    description: '',
                                    min_price: '',
                                    max_price: '',
                                    price_unit: 'per_event',
                                    is_available: true
                                });
                                setShowServiceModal(true);
                            }}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus size={20} /> Add Service
                        </button>
                    </div>

                    {services.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">No services added yet. Start by adding your first service!</p>
                            <button
                                onClick={() => setShowServiceModal(true)}
                                className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                            >
                                Add your first service
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map((service) => (
                                <div key={service.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold px-2 py-1 rounded uppercase">
                                            {service.service_type.replace('_', ' ')}
                                        </span>
                                        <button
                                            onClick={() => handleToggleServiceAvailability(service)}
                                            className={`p-1 rounded transition-colors ${service.is_available ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            title={service.is_available ? 'Available' : 'Not Available'}
                                        >
                                            {service.is_available ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    </div>

                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{service.service_name}</h4>
                                    {service.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{service.description}</p>
                                    )}

                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign size={16} className="text-slate-400 dark:text-slate-500" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                            {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">({service.price_unit?.replace('_', ' ')})</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <span className={`text-xs font-medium ${service.is_available ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {service.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditService(service)}
                                                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteService(service.id)}
                                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Documents</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Upload business documents for verification.</p>
                        </div>
                        <button
                            onClick={() => setShowDocumentModal(true)}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Upload size={20} /> Upload Document
                        </button>
                    </div>

                    {documents.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">No documents uploaded yet. Upload documents to verify your business.</p>
                            <button
                                onClick={() => setShowDocumentModal(true)}
                                className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                            >
                                Upload your first document
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {documents.map((doc) => (
                                <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <FileText size={24} className="text-slate-500 dark:text-slate-400" />
                                        </div>
                                        {getVerificationBadge(doc.verification_status)}
                                    </div>

                                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">{doc.document_name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{doc.document_type.replace('_', ' ')}</p>

                                    {doc.rejection_reason && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-red-700 dark:text-red-300">
                                                <span className="font-semibold">Reason:</span> {doc.rejection_reason}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </span>
                                        {(doc.verification_status === 'PENDING' || doc.verification_status === 'REJECTED') && (
                                            <button
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Service Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </h3>
                            <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleServiceSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Service Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                    placeholder="e.g. Premium Wedding Photography"
                                    value={serviceForm.service_name}
                                    onChange={e => setServiceForm({ ...serviceForm, service_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Service Type *</label>
                                <select
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                    value={serviceForm.service_type}
                                    onChange={e => setServiceForm({ ...serviceForm, service_type: e.target.value })}
                                >
                                    {SERVICE_TYPES.map(type => (
                                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                    rows="3"
                                    placeholder="Describe your service..."
                                    value={serviceForm.description}
                                    onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Price (TZS)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                        placeholder="0"
                                        value={serviceForm.min_price}
                                        onChange={e => setServiceForm({ ...serviceForm, min_price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Price (TZS)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                        placeholder="0"
                                        value={serviceForm.max_price}
                                        onChange={e => setServiceForm({ ...serviceForm, max_price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price Unit</label>
                                <select
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                    value={serviceForm.price_unit}
                                    onChange={e => setServiceForm({ ...serviceForm, price_unit: e.target.value })}
                                >
                                    {PRICE_UNITS.map(unit => (
                                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_available"
                                    className="rounded text-brand-600 focus:ring-brand-500"
                                    checked={serviceForm.is_available}
                                    onChange={e => setServiceForm({ ...serviceForm, is_available: e.target.checked })}
                                />
                                <label htmlFor="is_available" className="text-sm text-slate-700 dark:text-slate-300">Available for booking</label>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSavingService}
                                    className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
                                >
                                    {isSavingService ? (
                                        <><Loader2 className="animate-spin inline mr-2" size={16} /> Saving...</>
                                    ) : (
                                        editingService ? 'Update Service' : 'Add Service'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Upload Modal */}
            {showDocumentModal && (
                <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">Upload Document</h3>
                            <button onClick={() => setShowDocumentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleDocumentSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                    placeholder="e.g. Business Registration Certificate"
                                    value={documentForm.document_name}
                                    onChange={e => setDocumentForm({ ...documentForm, document_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Type *</label>
                                <select
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-900 dark:text-white"
                                    value={documentForm.document_type}
                                    onChange={e => setDocumentForm({ ...documentForm, document_type: e.target.value })}
                                >
                                    {DOCUMENT_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File *</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className="space-y-1 text-center">
                                        {selectedFile ? (
                                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                                <p className="font-medium">{selectedFile.name}</p>
                                                <p className="text-slate-400 dark:text-slate-500">({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFile(null)}
                                                    className="text-red-600 dark:text-red-400 text-xs hover:underline mt-2"
                                                >
                                                    Remove file
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                                                <div className="flex text-sm text-slate-600 dark:text-slate-300 mt-2">
                                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-900 rounded-md font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 focus-within:outline-none">
                                                        <span>Upload a file</span>
                                                        <input
                                                            id="file-upload"
                                                            name="file-upload"
                                                            type="file"
                                                            className="sr-only"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG up to 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isUploadingDocument || !selectedFile}
                                    className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
                                >
                                    {isUploadingDocument ? (
                                        <><Loader2 className="animate-spin inline mr-2" size={16} /> Uploading...</>
                                    ) : (
                                        'Upload Document'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorProfilePage;
