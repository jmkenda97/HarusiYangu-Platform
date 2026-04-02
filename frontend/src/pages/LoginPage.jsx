import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Lock, Phone, ArrowRight, RefreshCw, User, Mail, Image, Check, X } from 'lucide-react';

const LoginPage = () => {
    const [activeTab, setActiveTab] = useState('login');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [debugOtp, setDebugOtp] = useState('');

    // FIELDS STATE
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        profile_photo_url: ''
    });

    const [imagePreview, setImagePreview] = useState(null);
    
    // Only need 'login' from context
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, profile_photo_url: reader.result });
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormData({ ...formData, profile_photo_url: '' });
        setImagePreview(null);
    };

    // --- FLOW 1: REQUEST OTP (FIXED PAYLOAD) ---
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const endpoint = activeTab === 'register' ? '/auth/register-otp' : '/auth/request-otp';
            
            // FIX: Conditional Payload based on tab
            // Register endpoint does NOT need 'purpose'.
            // Login endpoint DOES need 'purpose'.
            const payload = activeTab === 'register' 
                ? { phone } 
                : { phone, purpose: 'LOGIN' };

            const res = await api.post(endpoint, payload);

            if (res.data.success) {
                setStep(2);
                setDebugOtp(res.data.data.debug_otp);
                setMessage(`OTP sent! (Code: ${res.data.data.debug_otp})`);
                setLoading(false);
            }
        } catch (err) {
            console.error("Request OTP Error:", err);
            setMessage(err.response?.data?.message || 'Failed to send OTP');
            setLoading(false);
        }
    };

    // --- FLOW 2: VERIFY OTP ---
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (activeTab === 'register') {
                // REGISTER FLOW
                const res = await api.post('/auth/verify-register-otp', { phone, otp_code: otp });
                
                if (res.data.success) {
                    const { temp_token } = res.data.data;
                    
                    // Store temp token for next step
                    localStorage.setItem('harusiyangu_token', temp_token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${temp_token}`;
                    
                    setStep(3);
                    setMessage('Phone verified! Please complete your profile.');
                }
            } else {
                // LOGIN FLOW - Use Context Login
                const result = await login(phone, otp);
                if (result.success) {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setMessage(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    // --- FLOW 3: COMPLETE PROFILE ---
    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await api.post('/auth/complete-registration', {
                ...formData,
                profile_photo_url: formData.profile_photo_url || null
            });

            if (res.data.success) {
                const { token } = res.data.data;
                
                // Save the final token
                localStorage.setItem('harusiyangu_token', token);
                
                // Reload page to bootstrap the app with new user data
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error("Complete Profile Error:", error);
            
            // Show actual error message
            const errorMsg = error.response?.data?.message || 'Failed to save profile. Please check your details.';
            setMessage(errorMsg);
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white from-brand-900 via-brand-800 to-brand-600 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">

                    <div className="bg-gradient-to-r from-brand-700 to-brand-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-4 ring-1 ring-white/20">
                            <span className="text-3xl font-bold text-white">H</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">HarusiYangu</h2>
                        <p className="text-blue-100 mt-2 font-light">
                            {step === 3 ? 'Complete Your Profile' : (activeTab === 'login' ? 'Login to Your Account' : 'Create New Account')}
                        </p>
                    </div>

                    <div className="p-8">
                        {message && (
                            <div className={`p-4 rounded-lg mb-6 text-sm font-medium flex items-center gap-2 ${message.includes('sent') || message.includes('verified') || message.includes('Welcome') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {message.includes('suspended') ? <Lock size={18} /> : <Check size={18} />}
                                <span>{message}</span>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                                <button onClick={() => setActiveTab('login')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'login' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Login</button>
                                <button onClick={() => setActiveTab('register')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'register' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Register</button>
                            </div>
                        )}

                        <form onSubmit={step === 1 ? handleRequestOtp : (step === 2 ? handleVerifyOtp : handleCompleteProfile)} className="space-y-4">

                            {step === 1 && (
                                <div>
                                    <label className="block text-slate-700 text-sm font-semibold mb-2">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" /></div>
                                        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm" placeholder="+255712345678" required />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-slate-700 text-sm font-semibold mb-2">Verification Code</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" /></div>
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm tracking-widest text-center font-mono text-lg"
                                            placeholder="000000"
                                            maxLength={6}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-brand-600 mt-2">Wrong number? Go back.</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-700 text-sm font-semibold mb-1.5">First Name</label>
                                            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400"><User size={16} /></span><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" required /></div>
                                        </div>
                                        <div>
                                            <label className="block text-slate-700 text-sm font-semibold mb-1.5">Last Name</label>
                                            <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400"><User size={16} /></span><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" required /></div>
                                        </div>
                                    </div>
                                    <div><label className="block text-slate-700 text-sm font-semibold mb-1.5">Middle Name</label><input type="text" value={formData.middle_name} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" /></div>
                                    <div><label className="block text-slate-700 text-sm font-semibold mb-1.5">Email</label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-400"><Mail size={16} /></span><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" /></div></div>

                                    <div>
                                        <label className="block text-slate-700 text-sm font-semibold mb-1.5">Profile Photo</label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 transition-colors relative">
                                            <div className="space-y-1 text-center">
                                                {imagePreview ? (
                                                    <div className="relative inline-block">
                                                        <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-full object-cover border-2 border-brand-500 shadow-lg" />
                                                        <button type="button" onClick={removeImage} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Image className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" />
                                                        <div className="flex text-sm text-slate-600">
                                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                                                <span>Upload a file</span>
                                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-slate-700 text-sm font-semibold mb-1.5">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" required /></div>
                                        <div><label className="block text-slate-700 text-sm font-semibold mb-1.5">Confirm</label><input type="password" value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" required /></div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all mt-4">
                                {loading ? <RefreshCw className="animate-spin" size={20} /> : <span>{step === 1 ? 'Get Code' : (step === 2 ? 'Verify' : 'Complete Registration')}</span>}
                                {!loading && <ArrowRight size={20} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;