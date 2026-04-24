
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Bell, Check, MailOpen, Clock, MessageSquare, Briefcase, FileText, CheckCircle, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../components/SkeletonLoader';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            // Aligned with new API structure
            const responseData = res.data.data;
            if (responseData && responseData.notifications) {
                setNotifications(responseData.notifications);
            } else {
                setNotifications(res.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id, link) => {
        try {
            await api.put(`/notifications/${id}/read`);
            // Update local state to mark as read
            setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            
            // Navigate if link exists
            if (link) navigate(link);
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
            showToast("All notifications marked as read");
        } catch (error) {
            showToast("Failed to mark all as read", "error");
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'CheckCircle': return <CheckCircle size={20} className="text-emerald-500" />;
            case 'AlertCircle': return <AlertCircle size={20} className="text-amber-500" />;
            case 'FileText': return <FileText size={20} className="text-blue-500" />;
            case 'Briefcase': return <Briefcase size={20} className="text-purple-500" />;
            case 'MessageSquare': return <MessageSquare size={20} className="text-brand-500" />;
            default: return <Bell size={20} className="text-slate-400" />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-TZ', { 
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <p className="text-sm font-bold">{toast.message}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Stay updated with your account activities and platform alerts.</p>
                </div>
                {notifications.some(n => !n.read_at) && (
                    <button 
                        onClick={markAllRead}
                        className="text-brand-600 dark:text-brand-400 text-sm font-bold flex items-center gap-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-3 py-2 rounded-lg transition-colors"
                    >
                        <Check size={18} /> Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-xl"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Bell size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No notifications yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">When you receive alerts, they will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.map((n) => {
                            const data = n.data || {};
                            return (
                                <div 
                                    key={n.id}
                                    onClick={() => markAsRead(n.id, data.link)}
                                    className={`p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative group ${!n.read_at ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                                >
                                    {!n.read_at && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600"></div>}
                                    <div className={`p-3 rounded-xl flex-shrink-0 ${!n.read_at ? 'bg-white dark:bg-slate-800 shadow-sm border border-brand-100 dark:border-brand-900' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
                                        {getIcon(data.icon)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-bold ${!n.read_at ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {data.subject || 'System Update'}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                                                <Clock size={10} /> {formatDate(n.created_at)}
                                            </span>
                                        </div>
                                        <p className={`text-xs leading-relaxed ${!n.read_at ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                                            {data.content || n.message}
                                        </p>
                                        
                                        {data.link && (
                                            <div className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                Click to view <ArrowRight size={10} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
