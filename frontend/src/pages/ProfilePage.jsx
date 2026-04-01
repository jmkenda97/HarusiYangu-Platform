import { useAuth } from '../context/AuthContext';
import { User, Shield, Phone, Mail, Clock } from 'lucide-react';

const ProfilePage = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-brand-600 to-brand-800"></div>

                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 gap-6">

                        {/* MODIFIED AVATAR SECTION: Shows Image or Initials */}
                        <div className="h-24 w-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden relative">
                            {user?.profile_photo_url ? (
                                <img
                                    src={user.profile_photo_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-3xl font-bold text-brand-600">
                                    {user?.first_name?.[0]}
                                </span>
                            )}
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-2xl font-bold text-slate-900">{user?.full_name}</h2>
                            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2">
                                <Shield size={16} className={user?.role === 'SUPER_ADMIN' ? 'text-purple-600' : 'text-blue-600'} />
                                <span className="font-semibold uppercase tracking-wide">{user?.role}</span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600 mb-1">
                                <Phone size={18} className="text-brand-500" />
                                <span className="text-sm font-medium">Phone</span>
                            </div>
                            <p className="text-lg font-semibold text-slate-900 pl-7">{user?.phone}</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600 mb-1">
                                <Mail size={18} className="text-brand-500" />
                                <span className="text-sm font-medium">Email</span>
                            </div>
                            <p className="text-lg font-semibold text-slate-900 pl-7">{user?.email || 'Not provided'}</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600 mb-1">
                                <Clock size={18} className="text-brand-500" />
                                <span className="text-sm font-medium">Last Login</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 pl-7">
                                {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'First time login'}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600 mb-1">
                                <User size={18} className="text-brand-500" />
                                <span className="text-sm font-medium">Status</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 pl-7">{user?.status}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;