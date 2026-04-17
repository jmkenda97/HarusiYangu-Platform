import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import { Users as UsersIcon, Shield, Search, Pencil, Trash2, Ban, Check, ChevronLeft, ChevronRight, CheckCircle, UserCog } from 'lucide-react';
import UserFormModal from '../components/UserFormModal';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // Null = Add Mode, Object = Edit Mode

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculated stats
    const userStats = useMemo(() => {
        if (loading) return null;
        return {
            total: users.length,
            active: users.filter(u => u.status === 'ACTIVE').length,
            suspended: users.filter(u => u.status === 'SUSPENDED').length
        };
    }, [users, loading]);

    // Filtered users based on search query (Partial Matching)
    const filteredUsers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return users;
        
        return users.filter(user => 
            (user.full_name || '').toLowerCase().includes(query) ||
            (user.first_name || '').toLowerCase().includes(query) ||
            (user.last_name || '').toLowerCase().includes(query) ||
            (user.phone || '').toLowerCase().includes(query) ||
            (user.email || '').toLowerCase().includes(query) ||
            (user.role || '').toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Paginated users
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage]);

    // Open Modal for Add
    const handleAddClick = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const handleEditClick = (user) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    // Handle Suspend/Activate Toggle
    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const confirmMsg = newStatus === 'SUSPENDED'
            ? `Are you sure you want to suspend ${user.full_name}? They will not be able to login.`
            : `Activate ${user.full_name}?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await api.put(`/users/${user.id}`, { status: newStatus });
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    // Handle Delete (Soft Delete)
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            await api.delete(`/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage system users, roles, and access.</p>
                </div>
                <button onClick={handleAddClick} className="bg-brand-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                    <UsersIcon size={18} /> Add New User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading || !userStats ? (
                    <SkeletonCard count={3} />
                ) : (
                    <>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><UsersIcon size={20} /></div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{userStats.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle size={20} /></div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Active Accounts</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{userStats.active}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"><Ban size={20} /></div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Suspended Users</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{userStats.suspended}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, email or role..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:placeholder-slate-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-6"><SkeletonTable rows={5} columns={5} /></div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">#</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedUsers.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center"><div className="flex flex-col items-center gap-3 text-slate-400"><UsersIcon size={40} className="opacity-20" /><p>No users found matching your search.</p></div></td></tr>
                                ) : (
                                    paginatedUsers.map((user, idx) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                                {(currentPage - 1) * itemsPerPage + idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                                                        {(user.full_name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email || user.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                    <Shield size={10} /> {user.role?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        title={user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                                                        className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${user.status === 'ACTIVE' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                                                    >
                                                        {user.status === 'ACTIVE' ? <Ban size={16} /> : <Check size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        title="Edit User"
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.full_name)}
                                                        title="Delete User"
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                {filteredUsers.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold">{filteredUsers.length}</span> users
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage * itemsPerPage >= filteredUsers.length}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* The Modal */}
            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userToEdit={currentUser}
                onSuccess={fetchUsers}
            />
        </div>
    );
};

export default UsersPage;
