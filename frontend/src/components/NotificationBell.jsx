import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const NotificationBell = ({ onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
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

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/notifications/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/notifications/mark-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleNotifClick = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        if (onNotificationClick) {
            onNotificationClick(notif);
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${isOpen ? 'bg-zinc-100 text-black' : 'text-zinc-600 hover:text-black hover:bg-zinc-50'}`}
            >
                <div className="flex items-center gap-3">
                    <Bell size={16} strokeWidth={1.5} />
                    Notifications
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-full bottom-0 ml-3 w-80 bg-white rounded-lg shadow-xl border border-zinc-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                        <h3 className="text-sm font-semibold text-black tracking-tight flex items-center gap-2">
                            <BellRing size={14} className="text-zinc-500"/> Activity
                        </h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                                Mark all as read
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                                No new activity.
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif._id} 
                                        onClick={() => handleNotifClick(notif)}
                                        className={`px-4 py-3 flex gap-3 cursor-pointer transition-colors ${notif.isRead ? 'bg-white hover:bg-zinc-50 opacity-70' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${notif.isRead ? 'text-zinc-600' : 'text-black font-medium'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">
                                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="flex-shrink-0 flex items-center mt-1">
                                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;