import { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
    CreditCard, 
    Smartphone, 
    Plus, 
    Trash2, 
    CheckCircle, 
    AlertCircle, 
    Loader2, 
    Building2, 
    Star,
    X,
    Info
} from 'lucide-react';

const formatLabel = (value) => value?.replace(/_/g, ' ') || '';

const VendorPayoutAccounts = ({ showToast }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        account_type: 'MOBILE_MONEY',
        provider_name: '',
        account_number: '',
        account_name: '',
        branch_code: '',
        is_primary: false
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendor/payout-accounts');
            setAccounts(res.data.data);
        } catch (error) {
            showToast('Failed to load payout accounts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/vendor/payout-accounts', form);
            showToast('Payout account added successfully');
            setShowModal(false);
            setForm({
                account_type: 'MOBILE_MONEY',
                provider_name: '',
                account_number: '',
                account_name: '',
                branch_code: '',
                is_primary: false
            });
            fetchAccounts();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save account';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this account?')) return;
        try {
            await api.delete(`/vendor/payout-accounts/${id}`);
            showToast('Account removed successfully');
            fetchAccounts();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to delete account', 'error');
        }
    };

    const handleSetPrimary = async (id) => {
        try {
            await api.put(`/vendor/payout-accounts/${id}/primary`);
            showToast('Primary account updated');
            fetchAccounts();
        } catch (error) {
            showToast('Failed to update primary account', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="mt-2 text-sm text-slate-500">Loading accounts...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Settlement Accounts</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Where you receive your milestone payments from Hosts.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-700 active:scale-95 shadow-lg shadow-brand-500/20"
                >
                    <Plus size={18} />
                    Add Account
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-12 px-6 text-center">
                    <div className="mb-4 rounded-full bg-slate-50 dark:bg-slate-800 p-4 text-slate-400">
                        <CreditCard size={32} />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">No payout accounts found</h4>
                    <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">Add your Bank or Mobile Money details to start receiving payments for your invoices.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {accounts.map((account) => (
                        <div 
                            key={account.id}
                            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                                account.is_primary 
                                ? 'border-brand-200 bg-brand-50/30 dark:border-brand-900/50 dark:bg-brand-900/10' 
                                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`rounded-xl p-3 ${
                                            account.account_type === 'MOBILE_MONEY'
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        }`}>
                                            {account.account_type === 'MOBILE_MONEY' ? <Smartphone size={24} /> : <Building2 size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white">{account.provider_name}</h4>
                                                {account.is_primary && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                                                        <Star size={10} fill="currentColor" />
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatLabel(account.account_type)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {!account.is_primary && (
                                            <button 
                                                onClick={() => handleSetPrimary(account.id)}
                                                className="rounded-full p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-brand-600 transition-all shadow-sm"
                                                title="Set as Primary"
                                            >
                                                <Star size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(account.id)}
                                            className="rounded-full p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-600 transition-all shadow-sm"
                                            title="Delete Account"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{account.account_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</span>
                                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{account.account_number}</span>
                                    </div>
                                    {account.branch_code && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Code</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{account.branch_code}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4 flex items-center gap-2">
                                    {account.is_verified ? (
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                            <CheckCircle size={12} />
                                            Verified
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                            <Clock size={12} />
                                            Pending Review
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Account Info Box */}
            <div className="rounded-2xl bg-brand-50/50 dark:bg-brand-900/10 p-4 border border-brand-100 dark:border-brand-900/30">
                <div className="flex gap-3">
                    <div className="text-brand-600 dark:text-brand-400 shrink-0">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-brand-900 dark:text-brand-100">Professional Payment Info</h4>
                        <p className="text-xs text-brand-700/70 dark:text-brand-400/70 mt-1 leading-relaxed">
                            These details will be automatically included in the milestone invoices sent to your Hosts. 
                            Ensure account names match your legal registration for faster processing.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal for Adding Account */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Payout Account</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">New Settlement Destination</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                <button 
                                    type="button"
                                    onClick={() => setForm({...form, account_type: 'MOBILE_MONEY'})}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        form.account_type === 'MOBILE_MONEY' 
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Smartphone size={16} />
                                    Mobile Money
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setForm({...form, account_type: 'BANK'})}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        form.account_type === 'BANK' 
                                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Building2 size={16} />
                                    Bank Account
                                </button>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                                    {form.account_type === 'MOBILE_MONEY' ? 'Network Provider' : 'Bank Name'}
                                </label>
                                <input 
                                    required
                                    placeholder={form.account_type === 'MOBILE_MONEY' ? 'e.g., M-Pesa, Airtel Money' : 'e.g., CRDB, NMB'}
                                    value={form.provider_name}
                                    onChange={(e) => setForm({...form, provider_name: e.target.value})}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Account Holder Name</label>
                                <input 
                                    required
                                    placeholder="Legal name on account"
                                    value={form.account_name}
                                    onChange={(e) => setForm({...form, account_name: e.target.value})}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Account Number</label>
                                    <input 
                                        required
                                        placeholder={form.account_type === 'MOBILE_MONEY' ? '07XXXXXXXX' : 'Account number'}
                                        value={form.account_number}
                                        onChange={(e) => setForm({...form, account_number: e.target.value})}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                </div>
                                {form.account_type === 'BANK' && (
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Branch Code</label>
                                        <input 
                                            placeholder="Optional"
                                            value={form.branch_code}
                                            onChange={(e) => setForm({...form, branch_code: e.target.value})}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={form.is_primary}
                                        onChange={(e) => setForm({...form, is_primary: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
                                </label>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Set as Primary Settlement Account</span>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorPayoutAccounts;
