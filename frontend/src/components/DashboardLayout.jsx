import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, LogOut, Menu, ChevronRight, ChevronDown, Settings, Calendar, Home, PanelLeftClose, PanelLeftOpen, Moon, Sun, Store, Building2, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Events', icon: Calendar, path: '/events' },
    { name: 'My Profile', icon: User, path: '/profile' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Vendors', icon: Store, path: '/admin/vendors' },
    // --- HOST: Vendor Catalog ---
    { name: 'Vendor Catalog', icon: Store, path: '/vendor-catalog' },
];

// Vendor-specific menu items
const vendorMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor/dashboard' },
    { name: 'My Profile', icon: Building2, path: '/vendor/profile' },
];

const SidebarContent = ({ sidebarOpen, setSidebarOpen, isDesktopCollapsed, toggleDesktopCollapse, handleLogout }) => {
    const { user } = useAuth();
    const location = useLocation();

    const [headerTitle, setHeaderTitle] = useState('Dashboard');
    useEffect(() => {
        if (document.title !== 'HarusiYangu') {
            setHeaderTitle(document.title);
        } else {
            const path = location.pathname;
            if (path === '/dashboard') setHeaderTitle('Dashboard');
            else if (path === '/events') setHeaderTitle('My Events');
            else if (path === '/users') setHeaderTitle('User Management');
            else if (path === '/profile') setHeaderTitle('My Profile');
            else if (path === '/admin/vendors') setHeaderTitle('Vendor Management');
            else if (path === '/vendor-catalog') setHeaderTitle('Vendor Catalog');
            else if (path === '/vendor/dashboard') setHeaderTitle('Vendor Dashboard');
            else if (path === '/vendor/profile') setHeaderTitle('Vendor Profile');
            else if (path.match(/^\/events\/[a-f0-9-]+$/)) setHeaderTitle('Event Details');
            else setHeaderTitle(path.replace('/', '').replace('/', ' ').replace(/\b\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1)));
        }
    }, [location]);

    return (
        <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 ${isDesktopCollapsed ? 'px-2' : 'px-6'}`}>
                {!isDesktopCollapsed && <span className="text-xl font-bold tracking-wider text-brand-600 dark:text-brand-400 whitespace-nowrap">HARUSIYANGU</span>}
                <button 
                    onClick={toggleDesktopCollapse} 
                    className="hidden lg:block p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isDesktopCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className={`flex-1 mt-6 ${isDesktopCollapsed ? 'px-2' : 'px-4'} space-y-2`}>
                {/* VENDOR NAVIGATION */}
                {user?.role === 'VENDOR' && vendorMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            title={isDesktopCollapsed ? item.name : ''}
                            className={`
                                flex items-center ${isDesktopCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors duration-200 group relative
                                ${isActive
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            <Icon size={20} className={isDesktopCollapsed ? '' : 'mr-3'} />
                            {!isDesktopCollapsed && (
                                <>
                                    {item.name}
                                    {isActive && <ChevronRight size={16} className="ml-auto" />}
                                </>
                            )}
                        </Link>
                    );
                })}

                {/* STANDARD NAVIGATION (Non-Vendor) */}
                {user?.role !== 'VENDOR' && menuItems.map((item) => {
                    if (item.name === 'Users' && user?.role !== 'SUPER_ADMIN') return null;
                    
                    // --- ADDED THIS LINE TO HIDE "MY EVENTS" FOR SUPER ADMIN ---
                    if (item.name === 'My Events' && user?.role === 'SUPER_ADMIN') return null;

                    // --- MY PROFILE: For HOST and COMMITTEE ---
                    if (item.name === 'My Profile' && user?.role !== 'HOST' && user?.role !== 'COMMITTEE_MEMBER') return null;

                    // --- VENDORS: Only for SUPER_ADMIN and ADMIN ---
                    if (item.name === 'Vendors' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') return null;

                    // --- HOST: Vendor Catalog - Only for HOST ---
                    if (item.name === 'Vendor Catalog' && user?.role !== 'HOST') return null;

                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            title={isDesktopCollapsed ? item.name : ''}
                            className={`
                                flex items-center ${isDesktopCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors duration-200 group relative
                                ${isActive
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            <Icon size={20} className={isDesktopCollapsed ? '' : 'mr-3'} />
                            {!isDesktopCollapsed && (
                                <>
                                    {item.name}
                                    {isActive && <ChevronRight size={16} className="ml-auto" />}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* --- SIDEBAR LOGOUT BUTTON (Bottom) --- */}
            <div className={`p-4 border-t border-slate-200 dark:border-slate-800 ${isDesktopCollapsed ? 'text-center' : ''}`}>
                <button
                    onClick={handleLogout}
                    className={`
                        w-full flex items-center ${isDesktopCollapsed ? 'justify-center' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors duration-200
                        text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                    `}
                    title="Log Out"
                >
                    <LogOut size={20} className={isDesktopCollapsed ? '' : 'mr-3'} />
                    {!isDesktopCollapsed && <span>Log Out</span>}
                </button>
            </div>
        </div>
    );
};

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const location = useLocation();
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'}
                w-64
            `}>
                <SidebarContent 
                    sidebarOpen={sidebarOpen} 
                    setSidebarOpen={setSidebarOpen} 
                    isDesktopCollapsed={isDesktopCollapsed}
                    toggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                    handleLogout={handleLogout}
                />
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
                
                {/* TOP HEADER */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 shadow-sm z-10 transition-colors duration-300">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white ml-2 lg:ml-0">
                            {document.title !== 'HarusiYangu' ? document.title : 
                                location.pathname === '/dashboard' ? 'Dashboard' : 
                                location.pathname === '/events' ? 'My Events' : 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* NOTIFICATION BELL */}
                        <NotificationBell />

                        {/* THEME TOGGLE */}
                        <button 
                            onClick={() => {
                                console.log("Toggle Clicked"); // Debug
                                toggleTheme(); 
                            }}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* PROFILE DROPDOWN */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-3 focus:outline-none"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name || 'User'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{user?.display_role || user?.role || 'Guest'}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900 border-2 border-brand-500 flex items-center justify-center overflow-hidden hover:bg-brand-200 transition-colors">
                                    {user?.profile_photo_url ? (
                                        <img src={user.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-brand-700 dark:text-brand-300 font-bold">{user?.first_name?.[0] || 'A'}</span>
                                    )}
                                </div>
                                <ChevronDown size={16} className="text-slate-400 hidden sm:block dark:text-slate-500" />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 animate-in fade-in slide-in-from-top-5 duration-200 z-50">
                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.full_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || user?.phone}</p>
                                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 uppercase">
                                            {user?.role}
                                        </span>
                                    </div>
                                    <div className="py-1">
                                        {(user?.role === 'HOST' || user?.role === 'COMMITTEE_MEMBER') && (
                                            <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 flex items-center gap-2" onClick={() => setIsDropdownOpen(false)}>
                                                <User size={16} /> My Profile
                                            </Link>
                                        )}
                                        <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 flex items-center gap-2" onClick={() => setIsDropdownOpen(false)}>
                                            <Settings size={16} /> Settings
                                        </Link>
                                    </div>
                                    <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;