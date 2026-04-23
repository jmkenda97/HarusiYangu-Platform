import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { AlertCircle, CheckCircle, Clock, Edit, FileText, Loader2, Package, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { PageLoader, SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import VendorPayoutAccounts from '../components/VendorPayoutAccounts';

const SERVICE_TYPES = ['CATERING', 'DECORATION', 'MC', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'SOUND', 'TRANSPORT', 'TENT_CHAIRS', 'CAKE', 'MAKEUP', 'SECURITY', 'VENUE', 'PRINTING', 'OTHER'];
const DOCUMENT_TYPES = ['BUSINESS_LICENSE', 'BRELA_CERTIFICATE', 'TIN_CERTIFICATE', 'PORTFOLIO', 'INSURANCE', 'OTHER'];
const PRICE_UNITS = ['per_event', 'per_hour', 'per_day', 'per_person', 'flat_rate'];

const formatLabel = (value) => value?.replace(/_/g, ' ') || 'General';
const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount || 0);
const getErrorMessage = (error, fallback) => Object.values(error.response?.data?.errors || {}).flat()[0] || error.response?.data?.message || fallback;

const Toast = ({ toast, onClose }) => (
    <div className={`fixed bottom-4 right-4 z-[9999] flex min-w-[320px] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'}`}>
        {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button type="button" onClick={onClose} className="hover:opacity-70"><X size={16} /></button>
    </div>
);

const Modal = ({ title, subtitle, onClose, children }) => (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6 bg-white dark:bg-slate-900">{children}</div>
        </div>
    </div>
);

const VendorProfilePage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [profileExists, setProfileExists] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({ business_name: '', full_name: '', phone: '', email: '', address: '', service_type: 'OTHER' });
    const [services, setServices] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingService, setSavingService] = useState(false);
    const [savingDocument, setSavingDocument] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [editingDocument, setEditingDocument] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceForm, setServiceForm] = useState({ service_name: '', service_type: 'OTHER', description: '', min_price: '', max_price: '', price_unit: 'per_event' });
    const [serviceFiles, setServiceFiles] = useState({ business_license: null, brela_certificate: null, tin_certificate: null });
    const [documentForm, setDocumentForm] = useState({ document_name: '', document_type: 'BUSINESS_LICENSE', service_id: '' });
    const [documentFile, setDocumentFile] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vendors/profile');
            setProfile(res.data.data);
            setProfileExists(true);
            setProfileForm({
                business_name: res.data.data.business_name || '',
                full_name: res.data.data.full_name || '',
                phone: res.data.data.phone || '',
                email: res.data.data.email || '',
                address: res.data.data.address || '',
                service_type: res.data.data.service_type || 'OTHER',
            });
        } catch {
            setProfileExists(false);
            setProfileForm({ 
                business_name: '', 
                full_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(), 
                phone: user?.phone || '', 
                email: user?.email || '', 
                address: '', 
                service_type: 'OTHER' 
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        setServicesLoading(true);
        try {
            const res = await api.get('/vendors/services');
            setServices(res.data.data || []);
        } finally {
            setServicesLoading(false);
        }
    };

    const fetchDocuments = async () => {
        setDocumentsLoading(true);
        try {
            const res = await api.get('/vendors/documents');
            setDocuments(res.data.data || []);
        } finally {
            setDocumentsLoading(false);
        }
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tab = queryParams.get('tab');
        if (tab && ['profile', 'services', 'documents', 'payouts'].includes(tab)) {
            setActiveTab(tab);
        }
    }, []);

    useEffect(() => { fetchProfile(); }, []);
    useEffect(() => {
        if (activeTab === 'services') fetchServices();
        if (activeTab === 'documents') { fetchServices(); fetchDocuments(); }
    }, [activeTab]);

    const filteredServices = useMemo(() => services.filter((service) => {
        const q = searchQuery.trim().toLowerCase();
        return !q || service.service_name?.toLowerCase().includes(q) || service.service_type?.toLowerCase().includes(q);
    }), [services, searchQuery]);

    const documentGroups = useMemo(() => {
        const lookup = new Map(services.map((service) => [service.id, service]));
        const grouped = {};
        documents.forEach((document) => {
            const key = document.service_id || 'general';
            if (!grouped[key]) grouped[key] = { key, title: key === 'general' ? 'General Documents' : (lookup.get(key)?.service_name || 'Unknown Service'), documents: [] };
            grouped[key].documents.push(document);
        });
        return Object.values(grouped);
    }, [documents, services]);

    const resetServiceModal = () => {
        setEditingService(null);
        setServiceForm({ service_name: '', service_type: 'OTHER', description: '', min_price: '', max_price: '', price_unit: 'per_event' });
        setServiceFiles({ business_license: null, brela_certificate: null, tin_certificate: null });
        setShowServiceModal(false);
    };

    const resetDocumentModal = () => {
        setEditingDocument(null);
        setDocumentForm({ document_name: '', document_type: 'BUSINESS_LICENSE', service_id: '' });
        setDocumentFile(null);
        setShowDocumentModal(false);
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setSavingProfile(true);
        try {
            if (profileExists) await api.put('/vendors/profile', profileForm);
            else await api.post('/vendors/profile', profileForm);
            showToast('Vendor profile saved successfully.');
            await fetchProfile();
        } catch (error) {
            showToast(getErrorMessage(error, 'Failed to save profile.'), 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const openCreateService = () => {
        resetServiceModal();
        setShowServiceModal(true);
    };

    const openEditService = (service) => {
        setEditingService(service);
        setServiceForm({
            service_name: service.service_name || '',
            service_type: service.service_type || 'OTHER',
            description: service.description || '',
            min_price: service.min_price || '',
            max_price: service.max_price || '',
            price_unit: service.price_unit || 'per_event',
        });
        setShowServiceModal(true);
    };

    const handleServiceSubmit = async (event) => {
        event.preventDefault();
        setSavingService(true);
        try {
            const payload = new FormData();
            payload.append('service_name', serviceForm.service_name);
            payload.append('service_type', serviceForm.service_type);
            payload.append('description', serviceForm.description);
            payload.append('min_price', serviceForm.min_price || 0);
            if (serviceForm.max_price !== '') payload.append('max_price', serviceForm.max_price);
            payload.append('price_unit', serviceForm.price_unit);

            if (!editingService) {
                if (!serviceFiles.business_license || !serviceFiles.brela_certificate || !serviceFiles.tin_certificate) {
                    throw new Error('Business License, BRELA Certificate, and TIN Certificate are required.');
                }
                payload.append('business_license', serviceFiles.business_license);
                payload.append('brela_certificate', serviceFiles.brela_certificate);
                payload.append('tin_certificate', serviceFiles.tin_certificate);
                await api.post('/vendors/services', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                payload.append('_method', 'PUT');
                await api.post(`/vendors/services/${editingService.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            await fetchServices();
            await fetchDocuments();
            showToast(editingService ? 'Service updated and sent back for review.' : 'Service created successfully.');
            resetServiceModal();
        } catch (error) {
            showToast(error.message || getErrorMessage(error, 'Failed to save service.'), 'error');
        } finally {
            setSavingService(false);
        }
    };

    const handleDeleteService = async (service) => {
        if (!window.confirm(`Delete service "${service.service_name}"?`)) return;
        try {
            await api.delete(`/vendors/services/${service.id}`);
            await fetchServices();
            await fetchDocuments();
            showToast('Service deleted successfully.');
        } catch (error) {
            showToast(getErrorMessage(error, 'Failed to delete service.'), 'error');
        }
    };

    const openCreateDocument = (serviceId = '') => {
        resetDocumentModal();
        setDocumentForm({ document_name: '', document_type: 'BUSINESS_LICENSE', service_id: serviceId });
        setShowDocumentModal(true);
    };

    const openEditDocument = (document) => {
        setEditingDocument(document);
        setDocumentForm({
            document_name: document.document_name || '',
            document_type: document.document_type || 'BUSINESS_LICENSE',
            service_id: document.service_id || '',
        });
        setShowDocumentModal(true);
    };

    const handleDocumentSubmit = async (event) => {
        event.preventDefault();
        setSavingDocument(true);
        try {
            const payload = new FormData();
            payload.append('document_name', documentForm.document_name);
            payload.append('document_type', documentForm.document_type);
            if (documentForm.service_id) payload.append('service_id', documentForm.service_id);
            if (documentFile) payload.append('file', documentFile);
            if (!editingDocument && !documentFile) throw new Error('Please choose a file to upload.');

            if (editingDocument) {
                payload.append('_method', 'PUT');
                await api.post(`/vendors/documents/${editingDocument.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/vendors/documents', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            await fetchDocuments();
            await fetchServices();
            showToast(editingDocument ? 'Document updated and sent back for review.' : 'Document uploaded successfully.');
            resetDocumentModal();
        } catch (error) {
            showToast(error.message || getErrorMessage(error, 'Failed to save document.'), 'error');
        } finally {
            setSavingDocument(false);
        }
    };

    const [previewDoc, setPreviewDoc] = useState(null);

    const PreviewModal = ({ doc, onClose }) => {
        if (!doc) return null;
        
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
                <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{doc.document_name}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">{doc.document_type.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center">
                        {doc.mime_type?.includes('pdf') ? (
                            <iframe src={doc.file_url_full} title={doc.document_name} className="h-full w-full rounded-lg bg-white dark:bg-slate-900 shadow-sm border-0" />
                        ) : (
                            <img src={doc.file_url_full} alt={doc.document_name} className="max-h-full max-w-full rounded-lg shadow-lg object-contain" />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleDeleteDocument = async (document) => {
        if (!window.confirm(`Delete document "${document.document_name}"?`)) return;
        try {
            await api.delete(`/vendors/documents/${document.id}`);
            await fetchDocuments();
            await fetchServices();
            showToast('Document deleted successfully.');
        } catch (error) {
            showToast(getErrorMessage(error, 'Failed to delete document.'), 'error');
        }
    };

    const previewDocument = (document) => {
        if (document.file_url_full) {
            setPreviewDoc(document);
        } else {
            showToast('Preview is not available for this document.', 'error');
        }
    };

    const serviceBadge = (service) => {
        if (service.is_verified) return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400';
        if (service.rejection_reason) return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400';
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400';
    };

    if (loading) return <PageLoader message="Loading vendor workspace..." />;

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-20 p-4 md:p-0">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
            
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Account</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your vendor profile, services, and service documents with clear review status.</p>
                {profile?.status && (
                    <div className="mt-4 inline-flex rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatLabel(profile.status)}
                    </div>
                )}
            </div>

            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {['profile', 'services', 'documents', 'payouts'].map((tab) => (
                    <button 
                        key={tab} 
                        type="button" 
                        onClick={() => setActiveTab(tab)} 
                        className={`border-b-2 pb-3 text-sm font-bold capitalize transition-colors flex-shrink-0 px-2 ${
                            activeTab === tab 
                                ? 'border-brand-600 text-brand-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab === 'payouts' ? 'Payout Details' : tab}
                    </button>
                ))}
            </div>

            {activeTab === 'profile' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
                    <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {[
                            ['business_name', 'Business Name'],
                            ['full_name', 'Full Name'],
                            ['phone', 'Phone'],
                            ['email', 'Email'],
                            ['address', 'Address'],
                        ].map(([key, label]) => (
                            <div key={key} className={key === 'address' ? 'md:col-span-2' : ''}>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">{label}</label>
                                <input 
                                    value={profileForm[key]} 
                                    type={key === 'email' ? 'email' : 'text'} 
                                    onChange={(event) => setProfileForm({ ...profileForm, [key]: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors" 
                                />
                            </div>
                        ))}
                        <div className="md:col-span-2 pt-2">
                            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all">
                                {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Profile
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'services' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full max-w-md">
                            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search services..." className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors" />
                        </div>
                        <button type="button" onClick={openCreateService} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all">
                            <Plus size={18} /> Add Service
                        </button>
                    </div>

                    {servicesLoading ? (
                        <div className="py-20 text-center"><Loader2 size={36} className="mx-auto animate-spin text-brand-600" /></div>
                    ) : filteredServices.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
                            <Package size={42} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No services yet</h4>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a service and upload the required documents for review.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {filteredServices.map((service) => {
                                const linkedDocs = documents.filter((document) => document.service_id === service.id);
                                return (
                                    <div key={service.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${serviceBadge(service)}`}>
                                                    {service.is_verified ? 'Approved' : service.rejection_reason ? 'Rejected' : 'Pending Review'}
                                                </div>
                                                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{service.service_name}</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{formatLabel(service.service_type)} • {formatCurrency(service.min_price)}{service.max_price ? ` - ${formatCurrency(service.max_price)}` : ''}</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => openEditService(service)} 
                                                className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                title={service.is_verified ? 'View Service' : 'Edit Service'}
                                            >
                                                {service.is_verified ? <Search size={16} /> : <Edit size={16} />}
                                            </button>
                                        </div>
                                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{service.description || 'No description provided.'}</p>
                                        {service.rejection_reason && (
                                            <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 italic">
                                                Reason: {service.rejection_reason}
                                            </div>
                                        )}
                                        <div className="mt-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                            Linked documents: <span className="font-bold text-slate-900 dark:text-white">{linkedDocs.length}</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {!service.is_verified && (
                                                <button type="button" onClick={() => openCreateDocument(service.id)} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-800 px-3 py-2 text-sm font-bold text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                                                    <Upload size={15} /> Add Document
                                                </button>
                                            )}
                                            <button type="button" onClick={() => handleDeleteService(service)} disabled={service.is_verified} className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 px-3 py-2 text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                                                <Trash2 size={15} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Documents By Service</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Attach each document to the right service so service review stays clear.</p>
                        </div>
                        <button type="button" onClick={() => openCreateDocument()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all">
                            <Plus size={18} /> Add Document
                        </button>
                    </div>

                    {documentsLoading ? (
                        <div className="py-20 text-center"><Loader2 size={36} className="mx-auto animate-spin text-brand-600" /></div>
                    ) : documentGroups.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
                            <FileText size={42} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No documents uploaded</h4>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload documents and attach them to services from this module.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {documentGroups.map((group) => (
                                <div key={group.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Package size={18} className="text-brand-600" /> {group.title}
                                    </h4>
                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {group.documents.map((document) => (
                                            <div key={document.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 hover:border-brand-200 dark:hover:border-brand-900/50 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="overflow-hidden">
                                                        <h5 className="font-bold text-slate-900 dark:text-white truncate">{document.document_name}</h5>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{formatLabel(document.document_type)}</p>
                                                    </div>
                                                    <button type="button" onClick={() => previewDocument(document)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0">
                                                        <FileText size={18} />
                                                    </button>
                                                </div>
                                                <div className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                                    document.verification_status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900' :
                                                    document.verification_status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900' :
                                                    'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900'
                                                }`}>{document.verification_status}</div>
                                                {document.rejection_reason && (
                                                    <div className="mt-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 italic">
                                                        Reason: {document.rejection_reason}
                                                    </div>
                                                )}
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {document.verification_status !== 'APPROVED' && (
                                                        <button type="button" onClick={() => openEditDocument(document)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                            <Edit size={14} /> Update
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => handleDeleteDocument(document)} disabled={document.verification_status === 'APPROVED'} className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors">
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'payouts' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
                    <VendorPayoutAccounts showToast={showToast} />
                </div>
            )}

            {showServiceModal && (
                <Modal 
                    title={editingService ? (editingService.is_verified ? 'Service Details' : 'Edit Service') : 'Add Service'} 
                    subtitle={editingService ? (editingService.is_verified ? 'This service is verified and locked.' : 'Editing sends the service back to admin review.') : 'New services must include Business License, BRELA, and TIN documents.'} 
                    onClose={resetServiceModal}
                >
                    <form onSubmit={handleServiceSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Service Name</label>
                                <input 
                                    placeholder="e.g. Premium Photography" 
                                    value={serviceForm.service_name} 
                                    disabled={editingService?.is_verified}
                                    onChange={(event) => setServiceForm({ ...serviceForm, service_name: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-70 transition-colors" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Service Category</label>
                                <select 
                                    value={serviceForm.service_type} 
                                    onChange={(event) => setServiceForm({ ...serviceForm, service_type: event.target.value })} 
                                    disabled={Boolean(editingService)} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:bg-slate-100 dark:disabled:bg-slate-950 transition-colors"
                                >
                                    {SERVICE_TYPES.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Min Price (TZS)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    placeholder="0" 
                                    value={serviceForm.min_price} 
                                    disabled={editingService?.is_verified}
                                    onChange={(event) => setServiceForm({ ...serviceForm, min_price: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-70 transition-colors" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Max Price (TZS)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    placeholder="Optional" 
                                    value={serviceForm.max_price} 
                                    disabled={editingService?.is_verified}
                                    onChange={(event) => setServiceForm({ ...serviceForm, max_price: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-70 transition-colors" 
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Pricing Unit</label>
                                <select 
                                    value={serviceForm.price_unit} 
                                    disabled={editingService?.is_verified}
                                    onChange={(event) => setServiceForm({ ...serviceForm, price_unit: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-70 transition-colors"
                                >
                                    {PRICE_UNITS.map((unit) => <option key={unit} value={unit}>{formatLabel(unit)}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Description</label>
                                <textarea 
                                    rows="4" 
                                    placeholder="Describe your service..." 
                                    value={serviceForm.description} 
                                    disabled={editingService?.is_verified}
                                    onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} 
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-70 transition-colors" 
                                />
                            </div>
                        </div>
                        {!editingService && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {[
                                    ['business_license', 'Business License'],
                                    ['brela_certificate', 'BRELA Certificate'],
                                    ['tin_certificate', 'TIN Certificate'],
                                ].map(([key, label]) => (
                                    <label key={key} className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                        <Upload size={20} className="mx-auto text-slate-400 group-hover:text-brand-600 mb-2" />
                                        <div className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300">{label}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-full">{serviceFiles[key] ? serviceFiles[key].name : 'Click to upload'}</div>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setServiceFiles({ ...serviceFiles, [key]: event.target.files?.[0] || null })} className="hidden" />
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={resetServiceModal} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {editingService?.is_verified ? 'Close' : 'Cancel'}
                            </button>
                            {!editingService?.is_verified && (
                                <button type="submit" disabled={savingService} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all">
                                    {savingService ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{editingService ? 'Save Changes' : 'Create Service'}
                                </button>
                            )}
                        </div>
                    </form>
                </Modal>
            )}

            {showDocumentModal && (
                <Modal 
                    title={editingDocument ? 'Update Document' : 'Add Document'} 
                    subtitle={editingDocument ? 'Updating a document sends it back for admin review.' : 'Attach the document to the correct service.'} 
                    onClose={resetDocumentModal}
                >
                    <form onSubmit={handleDocumentSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Document Name</label>
                                <input placeholder="Document Name" value={documentForm.document_name} onChange={(event) => setDocumentForm({ ...documentForm, document_name: event.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Type</label>
                                <select value={documentForm.document_type} onChange={(event) => setDocumentForm({ ...documentForm, document_type: event.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors">{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Service Association</label>
                                <select value={documentForm.service_id} onChange={(event) => setDocumentForm({ ...documentForm, service_id: event.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors"><option value="">General Vendor Document</option>{services.map((service) => <option key={service.id} value={service.id}>{service.service_name}</option>)}</select>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">File Selection</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-colors" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={resetDocumentModal} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="submit" disabled={savingDocument} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all">
                                {savingDocument ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}{editingDocument ? 'Update Document' : 'Upload Document'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </div>
    );
};

export default VendorProfilePage;
