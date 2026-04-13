import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { 
    Store, Search, CheckCircle, XCircle, Ban, Check, 
    FileText, Phone, Mail, MapPin, Star, ChevronDown, ChevronUp,
    ExternalLink, Loader2, AlertCircle, ArrowRight, X, Shield,
    Calendar, DollarSign, Clock
} from 'lucide-react';

// --- UTILITY FUNCTIONS ---
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

// --- TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' 
        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' 
        : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    const textColor = type === 'success' 
        ? 'text-emerald-800 dark:text-emerald-100' 
        : 'text-red-800 dark:text-red-100';

    return (
        <div className={`${bgColor} border ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300 min-w-[300px] fixed bottom-4 right-4 z-50`}>
            {type === 'success' ? (
                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                    <Check size={14} className="text-emerald-600 dark:text-emerald-200" />
                </div>
            ) : (
                <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                    <AlertCircle size={14} className="text-red-600 dark:text-red-200" />
                </div>
            )}
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={16} />
            </button>
        </div>
    );
};

// --- STATUS BADGE COMPONENT ---
const StatusBadge = React.memo(({ status }) => {
    const styles = {
        PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        BLACKLISTED: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    };

    const labels = {
        PENDING_APPROVAL: 'Pending Approval',
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        BLACKLISTED: 'Blacklisted'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.INACTIVE}`}>
            {labels[status] || status}
        </span>
    );
});

// --- DOCUMENT STATUS BADGE ---
const DocumentStatusBadge = React.memo(({ status }) => {
    const styles = {
        PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.PENDING}`}>
            {status}
        </span>
    );
});

// --- DOCUMENT TYPE BADGE ---
const DocumentTypeBadge = React.memo(({ type }) => {
    const styles = {
        BUSINESS_LICENSE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        TIN_CERTIFICATE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
        INSURANCE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        PORTFOLIO: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        OTHER: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    };

    const labels = {
        BUSINESS_LICENSE: 'Business License',
        TIN_CERTIFICATE: 'TIN Certificate',
        INSURANCE: 'Insurance',
        PORTFOLIO: 'Portfolio',
        OTHER: 'Other'
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type] || styles.OTHER}`}>
            {labels[type] || type}
        </span>
    );
});

// --- VENDOR DETAIL ROW ---
const VendorDetailRow = React.memo(({ vendor }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [vendorDetails, setVendorDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [docReviewLoading, setDocReviewLoading] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null); // { type: 'vendor'|'document', id }

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
        if (!isExpanded) {
            fetchVendorDetails();
        }
        setIsExpanded(!isExpanded);
    };

    const handleAction = async (action, reason = null) => {
        setActionLoading(action);
        try {
            const payload = reason ? { rejection_reason: reason } : {};
            await api.put(`/admin/vendors/${vendor.id}/${action}`, payload);
            
            // Update local state
            if (action === 'approve') vendor.status = 'ACTIVE';
            if (action === 'reject') vendor.status = 'INACTIVE';
            if (action === 'block') vendor.status = 'BLACKLISTED';
            if (action === 'unblock') vendor.status = 'ACTIVE';
            
            return true;
        } catch (error) {
            console.error(`Failed to ${action} vendor`, error);
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
            
            await api.put(`/admin/vendors/${vendor.id}/documents/${docId}/review`, payload);
            
            // Update local state
            if (vendorDetails) {
                const doc = vendorDetails.documents?.find(d => d.id === docId);
                if (doc) {
                    doc.verification_status = status;
                    if (reason) doc.rejection_reason = reason;
                }
            }
            return true;
        } catch (error) {
            console.error('Failed to review document', error);
            return false;
        } finally {
            setDocReviewLoading(null);
        }
    };

    const openRejectModal = (type, id) => {
        setRejectTarget({ type, id });
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectionReason.trim()) return;
        
        if (rejectTarget.type === 'vendor') {
            await handleAction('reject', rejectionReason);
        } else if (rejectTarget.type === 'document') {
            await handleDocumentReview(rejectTarget.id, 'REJECTED', rejectionReason);
        }
        
        setShowRejectModal(false);
        setRejectTarget(null);
        setRejectionReason('');
    };

    const pendingDocsCount = vendorDetails?.documents?.filter(d => d.verification_status === 'PENDING').length || 0;
    const approvedDocsCount = vendorDetails?.documents?.filter(d => d.verification_status === 'APPROVED').length || 0;

    return (
        <>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={handleToggleExpand}>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                            <Store size={20} />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">{vendor.business_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{vendor.full_name}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Phone size={14} className="text-slate-400" />
                        {vendor.phone}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {formatServiceType(vendor.service_type)}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <StatusBadge status={vendor.status} />
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {vendor.documents_count > 0 ? (
                            <>
                                <FileText size={14} className="text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                    {vendor.documents_count} docs
                                </span>
                                {vendor.pending_documents_count > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                        {vendor.pending_documents_count} pending
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-sm text-slate-400">No documents</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(vendor.created_at)}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {vendor.status === 'PENDING_APPROVAL' && (
                            <>
                                <button
                                    onClick={() => handleAction('approve')}
                                    disabled={actionLoading}
                                    className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                    title="Approve Vendor"
                                >
                                    {actionLoading === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                </button>
                                <button
                                    onClick={() => openRejectModal('vendor', vendor.id)}
                                    disabled={actionLoading}
                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                    title="Reject Vendor"
                                >
                                    {actionLoading === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                </button>
                            </>
                        )}
                        {vendor.status === 'ACTIVE' && (
                            <button
                                onClick={() => handleAction('block')}
                                disabled={actionLoading}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                title="Block Vendor"
                            >
                                {actionLoading === 'block' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                            </button>
                        )}
                        {vendor.status === 'BLACKLISTED' && (
                            <button
                                onClick={() => handleAction('unblock')}
                                disabled={actionLoading}
                                className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                title="Unblock Vendor"
                            >
                                {actionLoading === 'unblock' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            </button>
                        )}
                        <button
                            onClick={handleToggleExpand}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded Detail View */}
            {isExpanded && (
                <tr>
                    <td colSpan="7" className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
                        {loadingDetails ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-brand-600" />
                            </div>
                        ) : vendorDetails ? (
                            <div className="space-y-6">
                                {/* Vendor Info Header */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Contact Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <Mail size={14} className="text-slate-400" />
                                                {vendorDetails.email || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <Phone size={14} className="text-slate-400" />
                                                {vendorDetails.phone}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <MapPin size={14} className="text-slate-400" />
                                                {vendorDetails.address || 'No address provided'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Business Details</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <Store size={14} className="text-slate-400" />
                                                {vendorDetails.service_type}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <Star size={14} className="text-amber-400" />
                                                {vendorDetails.rating ? `${vendorDetails.rating}/5` : 'No rating'}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <Calendar size={14} className="text-slate-400" />
                                                Registered {formatDate(vendorDetails.created_at)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Documents Summary</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Total</span>
                                                <span className="font-medium text-slate-900 dark:text-white">{vendorDetails.documents?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-600 dark:text-emerald-400">Approved</span>
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">{approvedDocsCount}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-amber-600 dark:text-amber-400">Pending</span>
                                                <span className="font-medium text-amber-600 dark:text-amber-400">{pendingDocsCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Services Section */}
                                {vendorDetails.services && vendorDetails.services.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Services Offered</h4>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {vendorDetails.services.map(service => (
                                                <div key={service.id} className="px-4 py-3 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{service.service_name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{service.service_type}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                                            {formatCurrency(service.min_price)} - {formatCurrency(service.max_price)}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            service.is_available 
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                            {service.is_available ? 'Available' : 'Unavailable'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Documents Section */}
                                {vendorDetails.documents && vendorDetails.documents.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h4>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {vendorDetails.documents.map(doc => (
                                                <div key={doc.id} className="px-4 py-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                                <FileText size={18} className="text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.document_name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <DocumentTypeBadge type={doc.document_type} />
                                                                    <DocumentStatusBadge status={doc.verification_status} />
                                                                </div>
                                                                {doc.rejection_reason && (
                                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                                        Reason: {doc.rejection_reason}
                                                                    </p>
                                                                )}
                                                                {doc.reviewed_by && (
                                                                    <p className="text-xs text-slate-400 mt-1">
                                                                        Reviewed by {doc.reviewed_by} on {formatDate(doc.reviewed_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={doc.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                                                                title="View Document"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                            {doc.verification_status === 'PENDING' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDocumentReview(doc.id, 'APPROVED')}
                                                                        disabled={docReviewLoading === `${doc.id}-APPROVED`}
                                                                        className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                                                        title="Approve Document"
                                                                    >
                                                                        {docReviewLoading === `${doc.id}-APPROVED` ? (
                                                                            <Loader2 size={16} className="animate-spin" />
                                                                        ) : (
                                                                            <Check size={16} />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openRejectModal('document', doc.id)}
                                                                        disabled={docReviewLoading === `${doc.id}-REJECTED`}
                                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                                                        title="Reject Document"
                                                                    >
                                                                        {docReviewLoading === `${doc.id}-REJECTED` ? (
                                                                            <Loader2 size={16} className="animate-spin" />
                                                                        ) : (
                                                                            <X size={16} />
                                                                        )}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {vendorDetails.notes && (
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Notes</h4>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{vendorDetails.notes}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                                Failed to load vendor details
                            </div>
                        )}
                    </td>
                </tr>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Rejection Reason</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {rejectTarget?.type === 'vendor' ? 'Reject vendor application' : 'Reject document'}
                                </p>
                            </div>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Please provide a reason for rejection *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                                rows="3"
                                placeholder="Enter rejection reason..."
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

// --- MAIN COMPONENT ---
const AdminVendorsPage = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState('');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Service types matching backend enum
    const serviceTypes = [
        'CATERING',
        'DECORATION',
        'MC',
        'PHOTOGRAPHY',
        'VIDEOGRAPHY',
        'SOUND',
        'TRANSPORT',
        'TENT_CHAIRS',
        'CAKE',
        'MAKEUP',
        'SECURITY',
        'VENUE',
        'PRINTING',
        'OTHER',
    ];
    
    useEffect(() => {
        fetchVendors();
    }, [statusFilter, serviceTypeFilter, searchQuery]);

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

    // Stats
    const stats = useMemo(() => {
        const total = vendors.length;
        const pending = vendors.filter(v => v.status === 'PENDING_APPROVAL').length;
        const active = vendors.filter(v => v.status === 'ACTIVE').length;
        const blacklisted = vendors.filter(v => v.status === 'BLACKLISTED').length;
        return { total, pending, active, blacklisted };
    }, [vendors]);

    return (
        <div className="space-y-6 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage vendor applications, approvals, and compliance.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Store size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Vendors</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pending Approval</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Active Vendors</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                            <Ban size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Blacklisted</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.blacklisted}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by business name or contact name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="BLACKLISTED">Blacklisted</option>
                    </select>
                    <select
                        value={serviceTypeFilter}
                        onChange={(e) => setServiceTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        <option value="">All Service Types</option>
                        {serviceTypes.map(type => (
                            <option key={type} value={type}>{formatServiceType(type)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vendors Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Business</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Service Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Documents</th>
                                <th className="px-6 py-4">Registered</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                            <Loader2 size={20} className="animate-spin" />
                                            Loading vendors...
                                        </div>
                                    </td>
                                </tr>
                            ) : vendors.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                                            <Store size={40} className="opacity-50" />
                                            <p>No vendors found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                vendors.map((vendor) => (
                                    <VendorDetailRow key={vendor.id} vendor={vendor} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminVendorsPage;
