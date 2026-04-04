import { useAuth } from '../context/AuthContext';
import { User, Shield, Phone, Mail, Camera, Save, Lock, Upload, X, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const ProfilePage = () => {
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    // --- CORRECT URL ---
    const BASE_URL = 'http://127.0.0.1:8000';
    const API_ENDPOINT = `${BASE_URL}/api/v1/users/profile`;

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        profile_photo_url: ''
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                profile_photo_url: user.profile_photo_url || ''
            });
            setImagePreview(user.profile_photo_url);
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setImagePreview(base64String);
                setFormData(prev => ({ ...prev, profile_photo_url: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setFormData(prev => ({ ...prev, profile_photo_url: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        // --- FIX 1: USE YOUR SPECIFIC TOKEN NAME ---
        const token = localStorage.getItem('harusiyangu_token');

        // --- FIX 2: SETUP HEADERS (NO COOKIES) ---
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Only add header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            setMessage({ type: 'error', text: 'Token "harusiyangu_token" not found. Please login again.' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: headers,
                // NOTICE: No 'credentials: include' here. This fixes the Network Error.
                body: JSON.stringify(formData)
            });

            const data = await response.json();

                        if (response.ok) {
                // --- FIX 1: GET THE NEW DATA FROM SERVER RESPONSE ---
                // Laravel returns { success: true, data: { ...userObject... } }
                const newUser = data.data;

                // --- FIX 2: UPDATE LOCAL STORAGE ---
                // This forces your browser to remember the NEW name for the next reload
                localStorage.setItem('harusiyangu_user', JSON.stringify(newUser));

                // --- FIX 3: RELOAD ---
                // Now the reload will pick up the updated name from LocalStorage
                window.location.reload();
                } else {
                let errorMessage = 'Update failed.';
                if (response.status === 401) errorMessage = 'Unauthorized. Your token might be expired.';
                else if (response.status === 422 && data.errors) {
                    const errorMessages = Object.values(data.errors).flat();
                    errorMessage = errorMessages[0] || 'Validation error.';
                } else if (data.message) {
                    errorMessage = data.message;
                }
                setMessage({ type: 'error', text: errorMessage });
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            setMessage({ type: 'error', text: 'Network Error: Could not connect to the server.' });
        } finally {
            setIsLoading(false);
        }
    };

    // 1. ADMIN RESTRICTION CHECK
    if (user?.role === 'SUPER_ADMIN') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900">Admin Access Only</h2>
                    <p className="text-slate-500 mt-2">Profile editing is disabled for Super Administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="h-24 bg-slate-50 border-b border-slate-100"></div>
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 gap-6">
                        <div className="h-24 w-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden relative">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-slate-400">{formData.first_name?.[0]}</span>
                            )}
                        </div>
                        <div className="text-center md:text-left flex-1 mb-1">
                            <h2 className="text-2xl font-bold text-slate-900">{formData.first_name} {formData.last_name}</h2>
                            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2">
                                <Shield size={16} className="text-brand-600" />
                                <span className="font-medium uppercase tracking-wide text-xs">{user?.role?.replace('_', ' ')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-8 py-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900">Edit Profile</h3>
                    <p className="text-sm text-slate-500 mt-1">Update your personal information.</p>
                </div>

                <div className="p-8">
                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg text-sm flex items-start gap-3 border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                            {message.type === 'error' ? <AlertCircle size={20} className="mt-0.5 flex-shrink-0" /> : <Save size={20} className="mt-0.5 flex-shrink-0" />}
                            <div>
                                <span className="font-semibold block mb-0.5">{message.type === 'success' ? 'Success' : 'Error'}</span>
                                <span className="opacity-90">{message.text}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-md border-slate-300 pl-10 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Profile Photo</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition-colors">
                                <div className="space-y-1 text-center">
                                    {imagePreview ? (
                                        <div className="relative inline-block">
                                            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-md mx-auto shadow-sm" />
                                            <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                            <div className="flex text-sm text-slate-600 mt-2">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 2MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-200 p-2 rounded-full"><Phone size={18} className="text-slate-500" /></div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                    <p className="text-slate-900 font-medium tracking-widest mt-1">####</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Hidden</span>
                                <p className="text-xs text-slate-400 mt-1 max-w-[150px] ml-auto">Contact Admin to view or change</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none">Cancel</button>
                            <button type="submit" disabled={isLoading} className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                                {isLoading ? 'Saving...' : <><Save size={16} className="mr-2" />Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;