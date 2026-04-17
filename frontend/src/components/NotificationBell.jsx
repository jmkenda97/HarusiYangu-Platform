import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, MessageSquare, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const NotificationBell = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unread_count || 0);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const handleNotificationClick = async (notif) => {
        // 1. Mark as read on the backend if not already read
        if (!notif.read_at) {
            try {
                await api.put(`/notifications/${notif.id}/read`);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n));
            } catch (error) {
                console.error('Failed to mark as read', error);
            }
        }

        // 2. Navigate to the link if it exists
        if (notif.data?.link) {
            navigate(notif.data.link);
            setIsOpen(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const getIcon = (iconName) => {
        const icons = {
            'MessageSquare': <MessageSquare size={16} className="text-blue-500" />,
            'DollarSign': <DollarSign size={16} className="text-emerald-500" />,
            'CheckCircle': <CheckCircle size={16} className="text-emerald-500" />,
            'AlertCircle': <AlertCircle size={16} className="text-red-500" />,
            'Bell': <Bell size={16} className="text-slate-500" />
        };
        return icons[iconName] || icons.Bell;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id}
                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!notif.read_at ? 'bg-brand-50/20 dark:bg-brand-900/10' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex gap-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.read_at ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-900'}`}>
                                            {getIcon(notif.data?.icon)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read_at ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {notif.data?.subject || 'Notification'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                {notif.data?.content || 'Click to view details'}
                                            </p>
                                        </div>
                                        {!notif.read_at && (
                                            <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Mark as read"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <Bell size={32} className="mx-auto text-slate-300 mb-3 opacity-20" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">All caught up!</p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <button 
                            onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium py-1"
                        >
                            View all activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
