import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, LogOut, Menu, ChevronRight, ChevronDown, Settings, Calendar, Home } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Events', icon: Calendar, path: '/events' },
    // ADDED: My Profile Link in Sidebar below My Events
    { name: 'My Profile', icon: User, path: '/profile' },
    { name: 'Users', icon: Users, path: '/users' },
];

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [headerTitle, setHeaderTitle] = useState('Dashboard');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const location = useLocation();
    const dropdownRef = useRef(null);

    // SIMPLE TITLE LOGIC
    useEffect(() => {
        if (document.title !== 'HarusiYangu') {
            setHeaderTitle(document.title);
        } else {
            const path = location.pathname;
            if (path === '/dashboard') setHeaderTitle('Dashboard');
            else if (path === '/events') setHeaderTitle('My Events');
            else if (path === '/users') setHeaderTitle('User Management');
            else if (path === '/profile') setHeaderTitle('My Profile');
            else if (path.match(/^\/events\/[a-f0-9-]+$/)) setHeaderTitle('Event Details');
            else setHeaderTitle(path.replace('/', '').replace('/', ' ').replace(/\b\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1)));
        }
    }, [location]);

    // Update title if document title changes
    useEffect(() => {
        if (document.title !== 'HarusiYangu') {
            setHeaderTitle(document.title);
        }
    }, [document.title]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen bg-slate-50">

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
                {/* Logo Section in Sidebar */}
                <div className="flex items-center justify-center h-16 bg-slate-950 shadow-md border-b border-slate-800">
                    <span className="text-xl font-bold tracking-wider text-brand-400">HARUSIANGU</span>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {menuItems.map((item) => {
                        // SECURITY CHECK 1: Hide Users from everyone except SUPER_ADMIN
                        if (item.name === 'Users' && user?.role !== 'SUPER_ADMIN') {
                            return null;
                        }

                        // SECURITY CHECK 2: Hide My Profile from everyone except HOST
                        if (item.name === 'My Profile' && user?.role !== 'HOST') {
                            return null;
                        }

                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                  ${isActive
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }
                `}
                            >
                                <Icon size={20} className="mr-3" />
                                {item.name}
                                {isActive && <ChevronRight size={16} className="ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Header (Cleaned Up) */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-slate-700">
                            <Menu size={24} />
                        </button>
                        
                        {/* UPDATED: Use headerTitle state instead of raw pathname */}
                        <h2 className="text-xl font-bold text-slate-800 ml-2 lg:ml-0">
                            {headerTitle}
                        </h2>
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 focus:outline-none"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-s2xl font-slate-900">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-slate-500">{user?.role || 'Guest'}</p>
                            </div>
                            
                            {/* UPDATED AVATAR LOGIC: SHOW IMAGE IF EXISTS, ELSE FIRST LETTER */}
                            <div className="h-10 w-10 rounded-full bg-brand-100 border-2 border-brand-500 flex items-center justify-center overflow-hidden hover:bg-brand-200 transition-colors">
                                {user?.profile_photo_url ? (
                                    <img 
                                        src={user.profile_photo_url} 
                                        alt="Profile" 
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-brand-700 font-bold">
                                        {user?.first_name?.[0] || 'A'}
                                    </span>
                                )}
                            </div>
                            
                            <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 animate-in fade-in slide-in-from-top-5 duration-200">
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                                    <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
                                    <p className="text-xs text-slate-500">{user?.email || user?.phone}</p>
                                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-700 uppercase">
                                        {user?.role}
                                    </span>
                                </div>

                                <div className="py-1">
                                    {/* STRICT CHECK: My Profile only for HOST */}
                                    {user?.role === 'HOST' && (
                                        <Link
                                            to="/profile"
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <User size={16} /> My Profile
                                        </Link>
                                    )}

                                    <Link
                                        to="/settings"
                                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <Settings size={16} /> Settings
                                    </Link>
                                </div>

                                <div className="border-t border-slate-100 mt-1 pt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;