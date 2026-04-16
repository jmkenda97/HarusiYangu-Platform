import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { 
    Store, Search, CheckCircle, XCircle, Ban, Check, 
    FileText, Phone, Mail, MapPin, Star, ChevronDown, ChevronUp,
    ExternalLink, Loader2, AlertCircle, ArrowRight, X, Shield,
    Calendar, DollarSign, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { SkeletonTable, PageLoader } from '../components/SkeletonLoader';

const formatCurrency = (amount) => {
    if (!amount) return 'TZS 0';
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(amount);
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatServiceType = (type) => {
    const labels = {
        CATERING: 'Catering', DECORATION: 'Decoration', MC: 'MC / Host', PHOTOGRAPHY: 'Photography',
        VIDEOGRAPHY: 'Videography', SOUND: 'Sound & Audio', TRANSPORT: 'Transport',
        TENT_CHAIRS: 'Tent & Chairs', CAKE: 'Cake', MAKEUP: 'Makeup & Beauty',
        SECURITY: 'Security', VENUE: 'Venue', PRINTING: 'Printing', OTHER: 'Other'
    };
    return labels[type] || type;
};

const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' ? 'text-emerald-800 dark:text-emerald-100' : 'text-red-800 dark:text-red-100';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`}>
            {type === 'success' ? (
                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center"><Check size={14} className="text-emerald-600 dark:text-emerald-200" /></div>
            ) : (
                <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center"><AlertCircle size={14} className="text-red-600 dark:text-red-200" /></div>
            )}
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={16} /></button>
        </div>
    );
};

const StatusBadge = React.memo(({ status }) => {
    const styles = {
        PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        BLACKLISTED: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    };
    const labels = { PENDING_APPROVAL: 'Pending Approval', ACTIVE: 'Active', INACTIVE: 'Inactive', BLACKLISTED: 'Blacklisted' };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.INACTIVE}`}>
            {labels[status] || status}
        </span>
    );
});

const DocumentStatusBadge = React.memo(({ status }) => {
    const styles = { PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.PENDING}`}>
            {status}
        </span>
    );
});

const DocumentTypeBadge = React.memo(({ type }) => {
    const styles = {
        BUSINESS_LICENSE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        TIN_CERTIFICATE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
        INSURANCE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        PORTFOLIO: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        OTHER: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    };
    const labels = { BUSINESS_LICENSE: 'Business License', TIN_CERTIFICATE: 'TIN Certificate', INSURANCE: 'Insurance', PORTFOLIO: 'Portfolio', OTHER: 'Other' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type] || styles.OTHER}`}>
            {labels[type] || type}
        </span>
    );
});
const VendorDetailRow = React.memo(({ vendor, index, showToast, onPreview }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [vendorDetails, setVendorDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [docReviewLoading, setDocReviewLoading] = useState(null);
    const [serviceReviewLoading, setServiceReviewLoading] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);

    const RejectModal = () => {
        if (!showRejectModal) return null;

        let title = "Reject Request";
        if (rejectTarget?.type === 'vendor') title = "Reject Vendor Registration";
        if (rejectTarget?.type === 'document') title = "Reject Verification Document";
        if (rejectTarget?.type === 'service') title = "Reject Service Verification";

        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <h3 className="font-bold text-slate-900">{title}</h3>
                        <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-600 mb-4 font-medium">Please provide a reason for this rejection. This will be visible to the vendor.</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all"
                            placeholder="Type rejection reason here..."
                            required
                        />
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmReject}
                                disabled={!rejectionReason.trim()}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const fetchVendorDetails = useCallback(async () => {
        if (vendorDetails || loadingDetails) return;
        setLoadingDetails(true);
        try {
            const res = await api.get(`/admin/vendors/${vendor.id}`);
            setVendorDetails(res.data.data);
        } catch (error) {
            console.error('Failed to fetch vendor details', error);
        } finally {
            setLoadingDetails(false);
        }
    }, [vendor.id, vendorDetails, loadingDetails]);

    const handleToggleExpand = () => {
        if (!isExpanded) fetchVendorDetails();
        setIsExpanded(!isExpanded);
    };

    const handleAction = async (action, reason = null) => {
        setActionLoading(action);
        try {
            const payload = reason ? { rejection_reason: reason } : {};
            const res = await api.put(`/admin/vendors/${vendor.id}/${action}`, payload);
            if (action === 'approve') vendor.status = 'ACTIVE';
            if (action === 'reject') vendor.status = 'INACTIVE';
            if (action === 'block') vendor.status = 'BLACKLISTED';
            if (action === 'unblock') vendor.status = 'ACTIVE';
            showToast(res.data?.message || 'Vendor status updated.');
            return true;
        } catch (error) {
            console.error(`Failed to ${action} vendor`, error);
            showToast(error.response?.data?.message || `Failed to ${action} vendor.`, 'error');
            return false;
        } finally {
            setActionLoading(null);
        }
    };

    const handleDocumentReview = async (docId, status, reason = null) => {
        setDocReviewLoading(`${docId}-${status}`);
        try {
            const payload = { status };
            if (reason) payload.rejection_reason = reason;
            const res = await api.put(`/admin/vendors/${vendor.id}/documents/${docId}/review`, payload);
            
            if (vendorDetails) {
                const reviewedDoc = vendorDetails.documents.find(doc => doc.id === docId);
                const updatedDocs = vendorDetails.documents.map(doc => {
                    if (doc.id === docId) {
                        return { ...doc, verification_status: status, rejection_reason: reason };
                    }
                    return doc;
                });
                const updatedServices = reviewedDoc?.service_id ? vendorDetails.services.map(service => {
                    if (service.id === reviewedDoc.service_id) {
                        return { ...service, is_verified: false, is_available: false };
                    }
                    return service;
                }) : vendorDetails.services;
                setVendorDetails({ ...vendorDetails, documents: updatedDocs, services: updatedServices });
            }
            showToast(res.data?.message || 'Document review saved.');
            return true;
        } catch (error) {
            console.error('Failed to review document', error);
            showToast(error.response?.data?.message || 'Failed to review document.', 'error');
            return false;
        } finally {
            setDocReviewLoading(null);
        }
    };

    const handleServiceReview = async (serviceId, status, reason = null) => {
        setServiceReviewLoading(`${serviceId}-${status}`);
        try {
            const isApprove = status === 'approve' || status === 'approved';
            const payload = !isApprove ? { rejection_reason: reason } : {};
            const endpoint = `/admin/vendors/${vendor.id}/services/${serviceId}/${isApprove ? 'approve' : 'reject'}`;
            const res = await api.put(endpoint, payload);
            
            if (vendorDetails) {
                const updatedServices = vendorDetails.services.map(s => {
                    if (s.id === serviceId) {
                        return { 
                            ...s, 
                            is_verified: isApprove, 
                            is_available: isApprove, 
                            rejection_reason: isApprove ? null : reason 
                        };
                    }
                    return s;
                });
                setVendorDetails({ ...vendorDetails, services: updatedServices });
            }
            showToast(res.data?.message || 'Service review saved.');
            return true;
        } catch (error) {
            console.error('Failed to review service', error);
            showToast(error.response?.data?.message || 'Failed to review service.', 'error');
            return false;
        } finally {
            setServiceReviewLoading(null);
        }
    };

    const openRejectModal = (type, id) => {
        setRejectTarget({ type, id });
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectionReason.trim()) return;
        if (rejectTarget.type === 'vendor') await handleAction('reject', rejectionReason);
        else if (rejectTarget.type === 'document') await handleDocumentReview(rejectTarget.id, 'REJECTED', rejectionReason);
        else if (rejectTarget.type === 'service') await handleServiceReview(rejectTarget.id, 'reject', rejectionReason);
        setShowRejectModal(false);
        setRejectTarget(null);
        setRejectionReason('');
    };

    const pendingDocsCount = vendorDetails?.documents?.filter(d => d.verification_status === 'PENDING').length || 0;
    const approvedDocsCount = vendorDetails?.documents?.filter(d => d.verification_status === 'APPROVED').length || 0;
    
    // Service statistics
    const totalServices = vendorDetails?.services?.length || 0;
    const activeServices = vendorDetails?.services?.filter(s => s.is_verified && s.is_available).length || 0;
    const pendingServices = vendorDetails?.services?.filter(s => !s.is_verified).length || 0;

    return (
        <>
            <RejectModal />
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={handleToggleExpand}>
                <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">{index}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400"><Store size={20} /></div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">{vendor.business_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{vendor.full_name}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><Phone size={14} className="text-slate-400" />{vendor.phone}</div>
                </td>
                <td className="px-6 py-4"><StatusBadge status={vendor.status} /></td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{vendor.services_count || 0} services</span>
                        <div className="flex items-center gap-2">
                            {vendor.active_services_count > 0 && <span className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-1 rounded border border-green-100 dark:border-green-800">{vendor.active_services_count} active</span>}
                            {vendor.pending_services_count > 0 && <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-1 rounded border border-amber-100 dark:border-amber-800">{vendor.pending_services_count} pending</span>}
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {vendor.documents_count > 0 ? (
                            <>
                                <FileText size={14} className="text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">{vendor.documents_count} docs</span>
                                {vendor.pending_documents_count > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{vendor.pending_documents_count} pending</span>}
                            </>
                        ) : <span className="text-sm text-slate-400">No documents</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {vendor.status === 'PENDING_APPROVAL' && (
                            <>
                                <button onClick={() => handleAction('approve')} disabled={actionLoading} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors" title="Approve Vendor">{actionLoading === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button>
                                <button onClick={() => openRejectModal('vendor', vendor.id)} disabled={actionLoading} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors" title="Reject Vendor">{actionLoading === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}</button>
                            </>
                        )}
                        {vendor.status === 'ACTIVE' && <button onClick={() => handleAction('block')} disabled={actionLoading} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors" title="Block Vendor">{actionLoading === 'block' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}</button>}
                        {vendor.status === 'BLACKLISTED' && <button onClick={() => handleAction('unblock')} disabled={actionLoading} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors" title="Unblock Vendor">{actionLoading === 'unblock' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}</button>}
                        <button onClick={handleToggleExpand} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                    </div>
                </td>
            </tr>

            {/* Expanded Detail View */}
            {isExpanded && (
                <tr>
                    <td colSpan="7" className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
                        {loadingDetails ? <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-600" /></div> : vendorDetails ? (
                            <div className="space-y-6">
                                {/* Vendor Info Header ... omitted for brevity in response ... */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Contact Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 truncate"><Mail size={14} className="text-slate-400" />{vendorDetails.email || 'N/A'}</div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Phone size={14} className="text-slate-400" />{vendorDetails.phone}</div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><MapPin size={14} className="text-slate-400" />{vendorDetails.address || 'No address'}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Business Details</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 truncate"><Store size={14} className="text-slate-400" />{vendorDetails.service_type}</div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Star size={14} className="text-amber-400" />{vendorDetails.rating ? `${vendorDetails.rating}/5` : 'No rating'}</div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Calendar size={14} className="text-slate-400" />Joined {formatDate(vendorDetails.created_at)}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Services Status</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Total</span><span className="font-medium text-slate-900 dark:text-white">{totalServices}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-emerald-600 dark:text-emerald-400">Active</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{activeServices}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-amber-600 dark:text-amber-400">Pending</span><span className="font-medium text-amber-600 dark:text-amber-400">{pendingServices}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Documents Status</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Total</span><span className="font-medium text-slate-900 dark:text-white">{vendorDetails.documents?.length || 0}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-emerald-600 dark:text-emerald-400">Approved</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{approvedDocsCount}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-amber-600 dark:text-amber-400">Pending</span><span className="font-medium text-amber-600 dark:text-amber-400">{pendingDocsCount}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* General Documents Section */}
                                {vendorDetails.documents?.filter(d => !d.service_id).length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <FileText size={18} className="text-brand-600" />
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">General Business Documents</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {vendorDetails.documents.filter(d => !d.service_id).map(doc => (
                                                <div key={doc.id} className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-brand-200 transition-colors bg-white dark:bg-slate-900 shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded flex-shrink-0"><FileText size={16} className="text-slate-400" /></div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={doc.document_name}>{doc.document_name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <DocumentStatusBadge status={doc.verification_status} />
                                                                    <span className="text-[9px] text-slate-400 uppercase">{doc.document_type.replace('_', ' ')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button onClick={() => onPreview(doc)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="View"><ExternalLink size={14} /></button>
                                                            {doc.verification_status !== 'APPROVED' && <button onClick={() => handleDocumentReview(doc.id, 'APPROVED')} disabled={docReviewLoading === `${doc.id}-APPROVED`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors" title="Approve"><Check size={14} /></button>}
                                                            {doc.verification_status !== 'REJECTED' && <button onClick={() => openRejectModal('document', doc.id)} disabled={docReviewLoading === `${doc.id}-REJECTED`} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Reject"><X size={14} /></button>}
                                                        </div>
                                                    </div>
                                                    {doc.rejection_reason && <div className="px-3 py-1 bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-400 rounded-r-md"><p className="text-[10px] text-red-700 dark:text-red-400 font-medium italic">Reason: {doc.rejection_reason}</p></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Verification Sections ... */}
                                {vendorDetails.services && vendorDetails.services.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2">
                                            <Shield size={18} className="text-brand-600" />
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Service Verification</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-6">
                                            {vendorDetails.services.map(service => {
                                                const serviceDocs = vendorDetails.documents?.filter(d => d.service_id === service.id) || [];
                                                
                                                return (
                                                    <div key={service.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="font-bold text-slate-900 dark:text-white">{service.service_name}</h5>
                                                                    {service.is_verified ? (
                                                                        <span className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 flex items-center gap-1">
                                                                            <CheckCircle size={10} /> VERIFIED
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`${service.rejection_reason ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'} dark:bg-red-900/20 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border dark:border-red-800 flex items-center gap-1`}>
                                                                            {service.rejection_reason ? <XCircle size={10} /> : <Clock size={10} />} 
                                                                            {service.rejection_reason ? 'REJECTED' : 'PENDING REVIEW'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500">{service.service_type.replace('_', ' ')} • {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}</p>
                                                            </div>
                                                            {/* Actions ... */}
                                                            <div className="flex items-center gap-2">
                                                                {!service.is_verified ? (
                                                                    <>
                                                                        <button onClick={() => handleServiceReview(service.id, 'approve')} disabled={serviceReviewLoading === `${service.id}-approve`} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">{serviceReviewLoading === `${service.id}-approve` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Approve Service</button>
                                                                        <button onClick={() => openRejectModal('service', service.id)} disabled={serviceReviewLoading === `${service.id}-reject`} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm">Reject</button>
                                                                    </>
                                                                ) : (
                                                                    <button onClick={() => openRejectModal('service', service.id)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">Revoke / Block</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Service Documents ... */}
                                                        <div className="p-4 bg-white dark:bg-slate-900">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Linked Verification Documents</p>
                                                            {serviceDocs.length > 0 ? (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {serviceDocs.map(doc => (
                                                                        <div key={doc.id} className="flex flex-col gap-1">
                                                                            <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-brand-200 transition-colors bg-slate-50/30">
                                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                                    <div className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm flex-shrink-0"><FileText size={16} className="text-slate-400" /></div>
                                                                                    <div className="overflow-hidden">
                                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={doc.document_name}>{doc.document_name}</p>
                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                            <DocumentStatusBadge status={doc.verification_status} />
                                                                                            <span className="text-[9px] text-slate-400 uppercase">{doc.document_type.replace('_', ' ')}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 ml-2">
                                                                                    <button onClick={() => onPreview(doc)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="View"><ExternalLink size={14} /></button>
                                                                                    {doc.verification_status !== 'APPROVED' && <button onClick={() => handleDocumentReview(doc.id, 'APPROVED')} disabled={docReviewLoading === `${doc.id}-APPROVED`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors" title="Approve"><Check size={14} /></button>}
                                                                                    {doc.verification_status !== 'REJECTED' && <button onClick={() => openRejectModal('document', doc.id)} disabled={docReviewLoading === `${doc.id}-REJECTED`} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Reject"><X size={14} /></button>}
                                                                                </div>
                                                                            </div>
                                                                            {doc.rejection_reason && <div className="px-3 py-1 bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-400 rounded-r-md"><p className="text-[10px] text-red-700 dark:text-red-400 font-medium italic">Reason: {doc.rejection_reason}</p></div>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg"><p className="text-xs text-slate-400 italic">No documents specifically linked to this service.</p></div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : <div className="text-center py-8 text-slate-400 dark:text-slate-500">Failed to load vendor details</div>}
                    </td>
                </tr>
            )}
        </>
    );
});

const AdminVendorsPage = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const serviceTypes = ['CATERING', 'DECORATION', 'MC', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'SOUND', 'TRANSPORT', 'TENT_CHAIRS', 'CAKE', 'MAKEUP', 'SECURITY', 'VENUE', 'PRINTING', 'OTHER'];
    
    useEffect(() => {
        fetchVendors();
        setCurrentPage(1);
    }, [statusFilter, serviceTypeFilter, searchQuery]);

    const [previewDoc, setPreviewDoc] = useState(null);

    const PreviewModal = ({ doc, onClose }) => {
        if (!doc) return null;
        
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
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

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (serviceTypeFilter) params.append('service_type', serviceTypeFilter);
            if (searchQuery) params.append('search', searchQuery);
            const res = await api.get(`/admin/vendors?${params.toString()}`);
            setVendors(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
            showToast('Failed to load vendors', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const stats = useMemo(() => {
        const total = vendors.length;
        const pending = vendors.filter(v => v.status === 'PENDING_APPROVAL').length;
        const active = vendors.filter(v => v.status === 'ACTIVE').length;
        const blacklisted = vendors.filter(v => v.status === 'BLACKLISTED').length;
        return { total, pending, active, blacklisted };
    }, [vendors]);

    const paginatedVendors = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return vendors.slice(start, start + itemsPerPage);
    }, [vendors, currentPage]);

    return (
        <div className="space-y-6 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Management</h2><p className="text-slate-500 dark:text-slate-400">Manage vendor applications, approvals, and compliance.</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: <Store size={20} />, title: "Total Vendors", val: stats.total, color: "blue" },
                    { icon: <Clock size={20} />, title: "Pending Approval", val: stats.pending, color: "amber" },
                    { icon: <CheckCircle size={20} />, title: "Active Vendors", val: stats.active, color: "emerald" },
                    { icon: <Ban size={20} />, title: "Blacklisted", val: stats.blacklisted, color: "red" }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 rounded-lg`}>{item.icon}</div>
                            <div><p className="text-sm text-slate-500 dark:text-slate-400">{item.title}</p><p className="text-xl font-bold text-slate-900 dark:text-white">{item.val}</p></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={18} /><input type="text" placeholder="Search by business name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:placeholder-slate-500" /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><option value="">All Statuses</option><option value="PENDING_APPROVAL">Pending Approval</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLACKLISTED">Blacklisted</option></select>
                    <select value={serviceTypeFilter} onChange={(e) => setServiceTypeFilter(e.target.value)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><option value="">All Service Types</option>{serviceTypes.map(type => <option key={type} value={type}>{formatServiceType(type)}</option>)}</select>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">#</th>
                                <th className="px-6 py-4">Business</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Services</th>
                                <th className="px-6 py-4">Documents</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2 text-slate-400"><Loader2 size={20} className="animate-spin" />Loading vendors...</div></td></tr> : vendors.length === 0 ? <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex flex-col items-center gap-3 text-slate-400"><Store size={40} className="opacity-50" /><p>No vendors found.</p></div></td></tr> : paginatedVendors.map((vendor, idx) => (
                                <VendorDetailRow key={vendor.id} vendor={vendor} index={(currentPage - 1) * itemsPerPage + idx + 1} showToast={showToast} onPreview={setPreviewDoc} />
                            ))}
                        </tbody>
                    </table>
                </div>
                {vendors.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, vendors.length)}</span> of <span className="font-bold">{vendors.length}</span> vendors</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * itemsPerPage >= vendors.length} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </div>
    );
};

export default AdminVendorsPage;
