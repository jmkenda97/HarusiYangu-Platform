import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Users as UsersIcon, Shield, Search, MoreVertical, Pencil, Trash2, Ban, Check } from 'lucide-react';
import UserFormModal from '../components/UserFormModal';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // Null = Add Mode, Object = Edit Mode

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

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
            // Update local state optimistically
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    // Handle Delete (Soft Delete)
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action is irreversible.`)) return;

        try {
            await api.delete(`/users/${id}`);
            // Remove from list
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500">Manage system users, roles, and access.</p>
                </div>
                <button onClick={handleAddClick} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 shadow-sm flex items-center gap-2">
                    <UsersIcon size={18} /> Add New User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><UsersIcon size={20} /></div>
                        <div>
                            <p className="text-sm text-slate-500">Total Users</p>
                            <p className="text-xl font-bold text-slate-900">{users.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center">No users found.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                    {user.first_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500">{user.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                <Shield size={12} /> {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                        ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">

                                                {/* Suspend/Activate Button */}
                                                <button
                                                    onClick={() => handleToggleStatus(user)}
                                                    title={user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                                                    className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${user.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'}`}
                                                >
                                                    {user.status === 'ACTIVE' ? <Ban size={16} /> : <Check size={16} />}
                                                </button>

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    title="Edit User"
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(user.id, user.full_name)}
                                                    title="Delete User"
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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