import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Lock, Phone, ArrowRight, RefreshCw, User, Mail, Image, Check, X as CloseIcon, Shield, CreditCard, Users, Menu, ChevronRight, ChevronLeft, Zap, Globe, Clock, Store, Briefcase, Upload, FileText, AlertCircle, DollarSign } from 'lucide-react';

// --- 1. IMAGE CONFIGURATION ---
const ASSETS = {
    hero: "/WEDDING1.webp",
    celebrations: [
        { title: "Harusi (Wedding)", desc: "The grand celebration of your union. Manage everything from invites to the reception.", img: "/WEDDING1.webp" },
        { title: "Kitchen Party", desc: "Organize the kitchen party budget and committee activities with precision.", img: "/KITCHENPARTY.webp" },
        { title: "Sendoff", desc: "Coordinate the sendoff budget and committee activities with precision.", img: "/SENDOFF.webp" },
        { title: "Bag Party", desc: "Organize intimate gatherings and contributions efficiently.", img: "/BAGPACK.webp" },
        { title: "Bridal Shower", desc: "Elegant planning tools for the perfect pre-wedding celebration.", img: "/BRIDALSHOWER.webp" }
    ]
};

// Service Types matching your Database ENUM
const VENDOR_SERVICES = [
    'CATERING', 'DECORATION', 'MC', 'PHOTOGRAPHY', 'VIDEOGRAPHY',
    'SOUND', 'TRANSPORT', 'TENT_CHAIRS', 'CAKE', 'MAKEUP',
    'SECURITY', 'VENUE', 'PRINTING', 'OTHER'
];

const normalizePhone = (value) => value.replace(/\D/g, '');
const normalizeOtp = (value) => value.replace(/\D/g, '').slice(0, 6);
const getErrorMessage = (error, fallback) => {
    const apiMessage = error.response?.data?.message;
    const fieldErrors = error.response?.data?.errors;

    if (fieldErrors && typeof fieldErrors === 'object') {
        const firstFieldError = Object.values(fieldErrors).flat()[0];
        if (firstFieldError) return firstFieldError;
    }

    return apiMessage || fallback;
};

const LandingPage = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [currentSlide, setCurrentSlide] = useState(0);

    // --- AUTH LOGIC ---
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    // NEW: Registration Type State
    const [accountType, setAccountType] = useState('HOST'); // 'HOST' or 'VENDOR'

    // State for Text Inputs
    const [formData, setFormData] = useState({
        first_name: '', middle_name: '', last_name: '', email: '',
        password: '', password_confirmation: '', profile_photo_url: '',
        // Vendor Specific Fields
        business_name: '', service_type: 'CATERING', address: '',
        min_price: '', max_price: ''
    });

    // State for File Inputs (Documents)
    const [files, setFiles] = useState({
        business_license: null,
        brela_certificate: null,
        tin_certificate: null
    });

    const [imagePreview, setImagePreview] = useState(null);

    const { login, setUser } = useAuth();
    const navigate = useNavigate();

    // --- SLIDER LOGIC ---
    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % ASSETS.celebrations.length);
    };
    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + ASSETS.celebrations.length) % ASSETS.celebrations.length);
    };
    useEffect(() => {
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, []);

    const resetForm = () => {
        setStep(1); setMessage(''); setPhone(''); setOtp('');
        setAccountType('HOST');
        setFormData({
            first_name: '', middle_name: '', last_name: '', email: '',
            password: '', password_confirmation: '', profile_photo_url: '',
            business_name: '', service_type: 'CATERING', address: ''
        });
        setFiles({ business_license: null, brela_certificate: null, tin_certificate: null });
        setImagePreview(null);
    };

    const handleOpenAuth = (mode) => { setAuthMode(mode); resetForm(); setIsAuthModalOpen(true); };
    const handleCloseAuth = () => { setIsAuthModalOpen(false); resetForm(); };
    const handleSwitchMode = (mode) => { setAuthMode(mode); resetForm(); };

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

    const handleRequestOtp = async (e) => {
        e.preventDefault(); setLoading(true); setMessage('');
        try {
            const normalizedPhone = normalizePhone(phone);

            if (normalizedPhone.length < 10) {
                setMessage('Enter a valid phone number.');
                return;
            }

            if (authMode === 'register') {
                const payload = { phone: normalizedPhone, role: accountType };
                const res = await api.post('/auth/register-otp', payload);
                if (res.data.success) {
                    setPhone(normalizedPhone);
                    setStep(2); setMessage(`OTP sent! (Code: ${res.data.data.debug_otp})`);
                }
            } else {
                const res = await api.post('/auth/request-otp', { phone: normalizedPhone, purpose: 'LOGIN' });
                if (res.data.success) {
                    setPhone(normalizedPhone);
                    setStep(2); setMessage(`OTP sent! (Code: ${res.data.data.debug_otp})`);
                }
            }
        } catch (err) {
            setMessage(getErrorMessage(err, 'Failed to send OTP'));
        } finally { setLoading(false); }
    };


    // REPLACE THIS FUNCTION
    const handleVerifyOtp = async (e) => {
        e.preventDefault(); setLoading(true); setMessage('');
        try {
            const normalizedPhone = normalizePhone(phone);
            const normalizedOtp = normalizeOtp(otp);

            if (normalizedPhone.length < 10) {
                setMessage('Enter a valid phone number.');
                return;
            }

            if (normalizedOtp.length !== 6) {
                setMessage('Enter the full 6-digit OTP code.');
                return;
            }

            if (authMode === 'register') {
                const res = await api.post('/auth/verify-register-otp', {
                    phone: normalizedPhone,
                    otp_code: normalizedOtp,
                });

                if (res.data.success) {
                    setPhone(normalizedPhone);
                    setOtp(normalizedOtp);
                    setStep(3);
                    setMessage('Phone verified! Please complete your profile.');
                }
            } else {
                const result = await login(normalizedPhone, normalizedOtp);
                if (result.success) {
                    handleCloseAuth();
                    // Navigate to dashboard immediately (role-based redirect handled by AuthContext)
                    const storedUser = JSON.parse(localStorage.getItem('harusiyangu_user'));
                    if (storedUser?.role === 'VENDOR') {
                        navigate('/vendor/dashboard', { replace: true });
                    } else {
                        navigate('/dashboard', { replace: true });
                    }
                }
            }
        } catch (err) {
            setMessage(getErrorMessage(err, 'Invalid or expired OTP'));
        }
        finally { setLoading(false); }
    };

    // REPLACE THIS FUNCTION
    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const normalizedPhone = normalizePhone(phone);

            if (normalizedPhone.length < 10) {
                setMessage('Phone number is missing. Please go back and verify your phone again.');
                return;
            }

            const basePayload = {
                phone: normalizedPhone,
                role: accountType,
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                email: formData.email,
                password: formData.password,
                password_confirmation: formData.password_confirmation,
                profile_photo_url: formData.profile_photo_url,
            };

            let res;
            if (accountType === 'VENDOR') {
                const dataPayload = new FormData();

                Object.entries(basePayload).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        dataPayload.append(key, value);
                    }
                });

                dataPayload.append('business_name', formData.business_name);
                dataPayload.append('service_type', formData.service_type);
                dataPayload.append('address', formData.address || '');
                
                const minP = parseFloat(formData.min_price);
                dataPayload.append('min_price', isNaN(minP) ? 0 : minP);
                
                if (formData.max_price) {
                    const maxP = parseFloat(formData.max_price);
                    if (!isNaN(maxP)) dataPayload.append('max_price', maxP);
                }
                
                // REQUIRED DOCUMENTS
                if (files.business_license) dataPayload.append('business_license', files.business_license);
                if (files.brela_certificate) dataPayload.append('brela_certificate', files.brela_certificate);
                if (files.tin_certificate) dataPayload.append('tin_certificate', files.tin_certificate);

                res = await api.post('/auth/complete-registration', dataPayload);
            } else {
                res = await api.post('/auth/complete-registration', basePayload);
            }

            if (res.data.success) {
                const { token, user } = res.data.data;

                // 1. Save the NEW real token and user data
                localStorage.setItem('harusiyangu_token', token);
                localStorage.setItem('harusiyangu_user', JSON.stringify(user));

                // 2. Update auth context immediately (NO PAGE RELOAD)
                setUser(user);

                // 3. Close the modal
                handleCloseAuth();

                // 4. Navigate to appropriate dashboard based on role (FAST, no reload)
                if (user.role === 'VENDOR') {
                    navigate('/vendor/dashboard', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            }
        } catch (error) {
            console.error(error);
            setMessage(getErrorMessage(error, 'Failed to save profile.'));
        }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* --- NAVBAR --- */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        {/* <div className="w-10 h-10 bg-[#1e3a8a] rounded-lg flex items-center justify-center text-white font-serif text-xl font-bold shadow-md">H</div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">HarusiYangu</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Event Platform</span>
                        </div> */}
                    </div>
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-blue-900 transition-colors">Features</a>
                        <a href="#celebrations" className="hover:text-blue-900 transition-colors">Events</a>
                        <a href="#how-it-works" className="hover:text-blue-900 transition-colors">How It Works</a>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <button onClick={() => handleOpenAuth('login')} className="text-slate-900 font-semibold hover:text-blue-700 text-sm">Log In</button>
                        <button onClick={() => handleOpenAuth('register')} className="bg-[#1e3a8a] hover:bg-[#172554] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md">Get Started</button>
                    </div>
                    <button className="md:hidden text-slate-800" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}</button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 p-6 space-y-4 animate-fade-in">
                        <a href="#features" className="block text-slate-700 font-semibold py-2">Features</a>
                        <a href="#celebrations" className="block text-slate-700 font-semibold py-2">Events</a>
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <button onClick={() => { handleOpenAuth('login'); setMobileMenuOpen(false); }} className="w-full text-left text-slate-900 font-bold">Log In</button>
                            <button onClick={() => { handleOpenAuth('register'); setMobileMenuOpen(false); }} className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold text-center">Get Started</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 max-w-2xl animate-fade-in-up">
                        <div className="inline-block px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                            <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">The Central Platform</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight font-serif">
                            The Central Platform for Your <span className="text-[#1e3a8a] ">Big Day</span>.
                        </h1>
                        <p className="text-lg text-slate-600 leading-relaxed border-l-4 border-[#1e3a8a] pl-6">
                            Elevating Tanzanian events through precision, transparency, and elegance. Manage contributions, budgets, and vendors with absolute control.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button onClick={() => handleOpenAuth('register')} className="bg-[#1e3a8a] hover:bg-[#172554] text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3">Start Your Event <ChevronRight size={20} /></button>
                            <button className="bg-white border border-slate-200 hover:border-slate-400 text-slate-700 px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3"><Users size={20} className="text-slate-400" /> View Demo</button>
                        </div>
                    </div>
                    <div className="relative lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
                        <img src={ASSETS.hero} alt="Wedding Setup" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES SECTION --- */}
            <section id="features" className="py-24 px-6 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Designed for Perfection.</h2>
                        <p className="text-slate-500 text-lg">A comprehensive suite of tools that handles the complexity so you can enjoy the celebration.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: <CreditCard size={32} />, title: "Smart Contributions", desc: "Digital pledges and payments tracked in real-time." },
                            { icon: <Shield size={32} />, title: "Budget Control", desc: "Plan, allocate, and monitor every shilling with precision." },
                            { icon: <Users size={32} />, title: "Committee Hub", desc: "Centralized task management for your event committee." },
                            { icon: <Lock size={32} />, title: "Secure Access", desc: "Digital invitations with unique QR codes for entry." }
                        ].map((feature, idx) => (
                            <div key={idx} className="group p-8 border border-slate-100 rounded-xl hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-900 mb-6 group-hover:bg-blue-900 group-hover:text-white transition-colors">{feature.icon}</div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CELEBRATION SLIDER --- */}
            <section id="celebrations" className="py-24 px-6 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">For Every Celebration</h2>
                        <p className="text-slate-500 text-lg">Our platform adapts to the unique needs of every Tanzanian event type.</p>
                    </div>
                    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 h-[500px] md:h-[600px]">
                        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"><ChevronLeft size={24} /></button>
                        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"><ChevronRight size={24} /></button>
                        <div className="relative w-full h-full flex items-center">
                            {ASSETS.celebrations.map((slide, index) => (
                                <div key={index} className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col md:flex-row ${index === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'}`}>
                                    <div className="w-full md:w-3/5 h-64 md:h-full overflow-hidden bg-slate-200"><img src={slide.img} alt={slide.title} className="w-full h-full object-cover" /></div>
                                    <div className="w-full md:w-2/5 p-8 md:p-16 flex flex-col justify-center bg-white">
                                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">{slide.title}</h3>
                                        <p className="text-lg text-slate-600 leading-relaxed mb-8">{slide.desc}</p>
                                        <div className="flex flex-wrap gap-2">{['Budgeting', 'Guest List', 'Invites'].map(tag => (<span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-full">{tag}</span>))}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">{ASSETS.celebrations.map((_, idx) => (<button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-blue-900 w-8' : 'bg-slate-300'}`} />))}</div>
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section id="how-it-works" className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">How HarusiYangu Works</h2>
                        <p className="text-slate-500 text-lg">A streamlined workflow from planning to execution.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12 relative">
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
                        {[
                            { icon: <User size={32} />, title: "1. Create Account", desc: "Sign up as a Host or Vendor and verify your phone number." },
                            { icon: <Zap size={32} />, title: "2. Setup Profile", desc: "Hosts create events; Vendors upload docs & list services." },
                            { icon: <Globe size={32} />, title: "3. Connect", desc: "Hosts find and book vendors. Manage everything in one place." }
                        ].map((stepItem, i) => (
                            <div key={i} className="text-center relative">
                                <div className="w-24 h-24 mx-auto bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-blue-900 mb-6 shadow-md">{stepItem.icon}</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{stepItem.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{stepItem.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- WHY CHOOSE US --- */}
            <section className="py-24 px-6 bg-[#0f172a] text-white">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Professionals Choose HarusiYangu</h2>
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0"><Clock size={20} /></div>
                                <div><h4 className="text-lg font-bold mb-1">Real-Time Visibility</h4><p className="text-slate-400 text-sm">See pledges vs payments instantly. No more spreadsheets.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0"><Shield size={20} /></div>
                                <div><h4 className="text-lg font-bold mb-1">Bank-Grade Security</h4><p className="text-slate-400 text-sm">Your data is encrypted. QR codes prevent fake entries.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0"><Users size={20} /></div>
                                <div><h4 className="text-lg font-bold mb-1">Committee Collaboration</h4><p className="text-slate-400 text-sm">Assign roles and communicate effectively within the platform.</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl font-bold">H</div>
                            <div><h3 className="font-bold text-lg">Ready to Start?</h3><p className="text-slate-400 text-sm">Join thousands of event hosts.</p></div>
                        </div>
                        <button onClick={() => handleOpenAuth('register')} className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg hover:bg-blue-50 transition-colors">Get Started Free</button>
                    </div>
                </div>
            </section>

            {/* --- AUTH MODAL --- */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-scale-up">
                        <button onClick={handleCloseAuth} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 z-20 hidden md:block"><CloseIcon size={18} /></button>
                        <div className="hidden md:flex md:w-2/5 bg-[#0f172a] text-white p-12 flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-2xl font-bold mb-8">H</div>
                                <h3 className="text-2xl font-bold mb-4">{authMode === 'login' ? 'Welcome Back.' : (accountType === 'VENDOR' ? 'Join as Vendor.' : 'Join the Platform.')}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    {authMode === 'login'
                                        ? "Access your event dashboard, manage your contributions, and stay updated with your committee."
                                        : (accountType === 'VENDOR'
                                            ? "Create your vendor profile, upload documents, and get discovered by thousands of event hosts."
                                            : "Create your account and start planning your event with the most advanced tools available.")
                                    }
                                </p>
                            </div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 transform translate-x-1/2 translate-y-1/2"></div>
                        </div>
                        <div className="w-full md:w-3/5 p-6 md:p-10 bg-white relative max-h-[90vh] overflow-y-auto">
                            <button onClick={handleCloseAuth} className="md:hidden absolute top-4 right-4 text-slate-400"><CloseIcon size={24} /></button>
                            <div className="max-w-xl mx-auto w-full">
                                <div className="text-right mb-8">
                                    {authMode === 'login' ?
                                        <span className="text-sm text-slate-500">New to HarusiYangu? <button onClick={() => handleSwitchMode('register')} className="text-blue-900 font-bold hover:underline">Create Account</button></span> :
                                        <span className="text-sm text-slate-500">Already have an account? <button onClick={() => handleSwitchMode('login')} className="text-blue-900 font-bold hover:underline">Log In</button></span>
                                    }
                                </div>
                                {message && <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3 ${message.includes('sent') || message.includes('verified') || message.includes('Welcome') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{message.includes('suspended') ? <Lock size={16} /> : <Check size={16} />}<span>{message}</span></div>}

                                {step === 1 && (
                                    <div className="animate-fade-in-up">
                                        <h4 className="text-3xl font-bold text-slate-900 mb-2">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h4>
                                        <p className="text-slate-500 text-sm mb-8">Enter your phone number to receive a verification code.</p>

                                        {authMode === 'register' && (
                                            <div className="mb-8 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="grid grid-cols-2 gap-1">
                                                    <button type="button" onClick={() => setAccountType('HOST')} className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${accountType === 'HOST' ? 'bg-white text-blue-900 shadow-sm border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}><User size={18} /> Event Host</button>
                                                    <button type="button" onClick={() => setAccountType('VENDOR')} className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${accountType === 'VENDOR' ? 'bg-white text-blue-900 shadow-sm border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}><Store size={18} /> Service Vendor</button>
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={handleRequestOtp} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Phone size={20} /></div>
                                                    <input type="text" value={phone} onChange={(e) => setPhone(normalizePhone(e.target.value))} className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all text-base font-medium" placeholder="0712 345 678" required />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-[#172554] text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5">{loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Send Verification Code</span>}{!loading && <ChevronRight size={20} />}</button>
                                        </form>
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="animate-fade-in-up">
                                        <div className="mb-8">
                                            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-1 mb-4"><ArrowRight size={16} className="rotate-180" /> Change Number</button>
                                            <h4 className="text-3xl font-bold text-slate-900">Verify Phone</h4>
                                            <p className="text-slate-500 text-sm mt-2">We sent a code to <span className="text-slate-900 font-bold">{phone}</span></p>
                                        </div>
                                        <form onSubmit={handleVerifyOtp} className="space-y-8">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-4 text-center">Enter 6-Digit Code</label>
                                                <input type="text" value={otp} onChange={(e) => setOtp(normalizeOtp(e.target.value))} className="block w-full py-5 border border-slate-200 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all text-center font-mono text-4xl tracking-[1em]" placeholder="000000" maxLength={6} required autoFocus />
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-[#172554] text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5">{loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Verify & Continue</span>}</button>
                                        </form>
                                    </div>
                                )}
                                {step === 3 && authMode === 'register' && (
                                    <div className="animate-fade-in-up space-y-6 pb-6">
                                        <div className="mb-2">
                                            <h4 className="text-2xl font-bold text-slate-900">Complete Your Profile</h4>
                                            <p className="text-slate-500 text-sm mt-1">Provide your details to set up your account.</p>
                                        </div>
                                        
                                        <form onSubmit={handleCompleteProfile} className="space-y-8">
                                            
                                            {/* --- SECTION: PERSONAL INFORMATION --- */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-100 pb-2">
                                                    <User size={16} /> Personal Information
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                                                        <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="John" required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Middle Name</label>
                                                        <input type="text" value={formData.middle_name} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="(Optional)" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                                                        <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="Doe" required />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-3.5 text-slate-400"><Mail size={18} /></span>
                                                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="john@example.com" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Profile Photo</label>
                                                        <div className="flex items-center gap-4">
                                                            {imagePreview ? (
                                                                <div className="relative">
                                                                    <img src={imagePreview} className="h-11 w-11 rounded-full object-cover border-2 border-blue-100 shadow-sm" />
                                                                    <button type="button" onClick={removeImage} className="absolute -top-1 -right-1 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 transition-colors"><CloseIcon size={12} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-400"><Image size={18} /></div>
                                                            )}
                                                            <label className="text-xs text-blue-900 font-bold cursor-pointer hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors">
                                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /> 
                                                                {imagePreview ? 'Change Photo' : 'Upload Photo'}
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* --- SECTION: VENDOR SPECIFIC DETAILS --- */}
                                            {accountType === 'VENDOR' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-100 pb-2">
                                                        <Briefcase size={16} /> Business Details
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business Name</label>
                                                            <input type="text" value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-white shadow-sm" placeholder="e.g. Royal Catering" required />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Type</label>
                                                            <select value={formData.service_type} onChange={(e) => setFormData({ ...formData, service_type: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-white shadow-sm cursor-pointer" required>
                                                                {VENDOR_SERVICES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business Address</label>
                                                        <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-white shadow-sm" placeholder="City, Street, Building..." />
                                                    </div>

                                                    {/* Price Range Info */}
                                                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-inner">
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><DollarSign size={18} /></div>
                                                            <div>
                                                                <h5 className="text-sm font-bold text-blue-900">Service Price Range</h5>
                                                                <p className="text-xs text-blue-600 mt-1">Give potential clients an idea of your service cost.</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Minimum Price (TZS)</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={formData.min_price || ''} 
                                                                    onChange={(e) => setFormData({ ...formData, min_price: e.target.value })} 
                                                                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm bg-white shadow-sm" 
                                                                    placeholder="000,000" 
                                                                    min="0"
                                                                    required 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Maximum Price (TZS)</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={formData.max_price || ''} 
                                                                    onChange={(e) => setFormData({ ...formData, max_price: e.target.value })} 
                                                                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm bg-white shadow-sm" 
                                                                    placeholder="0,000,000" 
                                                                    min="0"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* --- DOCUMENT UPLOADS --- */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                                                            <AlertCircle size={14} /> Required Verification Documents
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {[
                                                                { id: 'business_license', label: 'Business License', icon: '📄', key: 'business_license' },
                                                                { id: 'brela_certificate', label: 'BRELA Registration Certificate', icon: '🏢', key: 'brela_certificate' },
                                                                { id: 'tin_certificate', label: 'TIN Certificate', icon: '💰', key: 'tin_certificate' }
                                                            ].map((doc) => (
                                                                <div key={doc.id} className="relative">
                                                                    <input type="file" id={doc.id} className="hidden" accept="image/*,.pdf" onChange={(e) => setFiles({ ...files, [doc.key]: e.target.files[0] })} required />
                                                                    <label htmlFor={doc.id} className={`flex items-center justify-between w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${files[doc.key] ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-500'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xl">{doc.icon}</span>
                                                                            <div className="text-left">
                                                                                <div className="text-xs font-bold">{doc.label}</div>
                                                                                <div className="text-[10px] opacity-70 truncate max-w-[200px]">{files[doc.key] ? files[doc.key].name : 'Click to upload (PDF, JPG, PNG)'}</div>
                                                                            </div>
                                                                        </div>
                                                                        {files[doc.key] ? <Check size={18} className="text-emerald-500" /> : <Upload size={18} className="text-slate-400" />}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- SECTION: SECURITY --- */}
                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm border-b border-slate-100 pb-2">
                                                    <Lock size={16} /> Security
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Create Password</label>
                                                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="••••••••" required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
                                                        <input type="password" value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 outline-none text-sm bg-slate-50" placeholder="••••••••" required />
                                                    </div>
                                                </div>
                                            </div>

                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-[#172554] text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all mt-4 flex items-center justify-center gap-2 transform hover:-translate-y-0.5">{loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Create {accountType === 'VENDOR' ? 'Vendor Profile' : 'Account'}</span>}</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER --- */}
            <footer className="bg-[#0f172a] text-white pt-16 pb-8 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center font-bold">H</div><span className="text-xl font-bold">HarusiYangu</span></div>
                            <p className="text-slate-400 text-sm leading-relaxed">The digital transformation of Tanzanian social event culture.</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Platform</h4>
                            <ul className="space-y-2 text-sm text-slate-400"><li><a href="#" className="hover:text-white transition-colors">About Us</a></li><li><a href="#" className="hover:text-white transition-colors">Pricing</a></li></ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Support</h4>
                            <ul className="space-y-2 text-sm text-slate-400"><li><a href="#" className="hover:text-white transition-colors">Help Center</a></li><li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li></ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-400"><li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li><li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li></ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} HarusiYangu. All rights reserved.</p>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 bg-slate-800 rounded-full hover:bg-slate-700 cursor-pointer transition-colors"></div>
                            <div className="w-8 h-8 bg-slate-800 rounded-full hover:bg-slate-700 cursor-pointer transition-colors"></div>
                            <div className="w-8 h-8 bg-slate-800 rounded-full hover:bg-slate-700 cursor-pointer transition-colors"></div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
