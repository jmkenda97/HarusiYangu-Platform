import { useState, useEffect } from 'react';
import { X, Loader, Lock, Shield } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const UserFormModal = ({ isOpen, onClose, userToEdit, onSuccess }) => {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '', // <--- ADDED STATE
        last_name: '',
        phone: '',
        email: '',
        role: 'HOST',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setFormData({
                    first_name: userToEdit.first_name || '',
                    middle_name: userToEdit.middle_name || '', // <--- ADDED POPULATION
                    last_name: userToEdit.last_name || '',
                    phone: userToEdit.phone || '',
                    email: userToEdit.email || '',
                    role: userToEdit.role || 'HOST',
                });
            } else {
                setFormData({ first_name: '', middle_name: '', last_name: '', phone: '', email: '', role: 'HOST' });
            }
        }
    }, [isOpen, userToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (userToEdit) {
                await api.put(`/users/${userToEdit.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Operation failed.';
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Shield className="text-brand-600" size={20} />
                        <h3 className="text-lg font-bold text-slate-900">
                            {userToEdit ? 'Edit User Account' : 'Add New Host'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Name Fields - Updated Layout */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                    placeholder="e.g. John"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Middle Name</label>
                                <input
                                    type="text"
                                    value={formData.middle_name}
                                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                    placeholder="e.g. Michael"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="e.g. Doe"
                            />
                        </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                        <input
                            type="text"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="0712 345 678"
                        />
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="user@example.com"
                        />
                    </div>

                    {/* Role Dropdown (Locked for Super Admin) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">System Role</label>

                        {currentUser?.role === 'SUPER_ADMIN' ? (
                            <div className="relative">
                                <select
                                    value="HOST"
                                    disabled
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed font-medium appearance-none"
                                >
                                    <option value="HOST">HOST</option>
                                </select>
                                <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                                    <Lock size={18} />
                                </div>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    <span className="font-semibold text-amber-600">Note:</span> As Super Admin, you manage Host accounts only. Other roles (Vendor, Gate Officer) are managed by Hosts within their specific events.
                                </p>
                            </div>
                        ) : (
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white transition-all"
                            >
                                <option value="HOST">HOST</option>
                                <option value="COMMITTEE_MEMBER">COMMITTEE MEMBER</option>
                                <option value="GATE_OFFICER">GATE OFFICER</option>
                                <option value="VENDOR">VENDOR</option>
                            </select>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-brand-500/20 transition-all"
                        >
                            {loading ? <Loader size={18} className="animate-spin" /> : (userToEdit ? 'Update Account' : 'Create Host')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;