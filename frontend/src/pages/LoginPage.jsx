import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Lock, Phone, ArrowRight, RefreshCw, User, Mail, Image, Check, X as CloseIcon, Shield, CreditCard, Users, Menu, ChevronRight, ChevronLeft, Zap, Globe, Clock } from 'lucide-react';

// --- 1. IMAGE CONFIGURATION ---
const ASSETS = {
    // The Hero Image: Updated to use your local WEDDING1.webp
    hero: "/WEDDING1.webp", 
    
    // Celebration Slider Images: Updated to use your local files
    celebrations: [
        { title: "Harusi (Wedding)", desc: "The grand celebration of your union. Manage everything from invites to the reception.", img: "/WEDDING1.webp" },
        { title: "Kitchen Party", desc: "Organize the kitchen party budget and committee activities with precision.", img: "/KITCHENPARTY.webp" },
        { title: "Sendoff", desc: "Coordinate the sendoff budget and committee activities with precision.", img: "/SENDOFF.webp" },
        { title: "Bag Party", desc: "Organize intimate gatherings and contributions efficiently.", img: "/BAGPACK.webp" },
        { title: "Bridal Shower", desc: "Elegant planning tools for the perfect pre-wedding celebration.", img: "/BRIDALSHOWER.webp" }
    ]
};

const LandingPage = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login'); 
    const [currentSlide, setCurrentSlide] = useState(0);

    // --- AUTH LOGIC (PRESERVED) ---
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [formData, setFormData] = useState({
        first_name: '', middle_name: '', last_name: '', email: '',
        password: '', password_confirmation: '', profile_photo_url: ''
    });
    const [imagePreview, setImagePreview] = useState(null);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    // --- SLIDER LOGIC ---
    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % ASSETS.celebrations.length);
    };
    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + ASSETS.celebrations.length) % ASSETS.celebrations.length);
    };
    // Auto-advance slider every 5 seconds
    useEffect(() => {
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, []);

    const resetForm = () => {
        setStep(1); setMessage(''); setPhone(''); setOtp('');
        setFormData({ first_name: '', middle_name: '', last_name: '', email: '', password: '', password_confirmation: '', profile_photo_url: '' });
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
            const endpoint = authMode === 'register' ? '/auth/register-otp' : '/auth/request-otp';
            const payload = authMode === 'register' ? { phone } : { phone, purpose: 'LOGIN' };
            const res = await api.post(endpoint, payload);
            if (res.data.success) {
                setStep(2); setMessage(`OTP sent! (Code: ${res.data.data.debug_otp})`);
            }
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to send OTP');
        } finally { setLoading(false); }
    };
    const handleVerifyOtp = async (e) => {
        e.preventDefault(); setLoading(true); setMessage('');
        try {
            if (authMode === 'register') {
                const res = await api.post('/auth/verify-register-otp', { phone, otp_code: otp });
                if (res.data.success) {
                    const { temp_token } = res.data.data;
                    localStorage.setItem('harusiyangu_token', temp_token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${temp_token}`;
                    setStep(3); setMessage('Phone verified! Please complete your profile.');
                }
            } else {
                const result = await login(phone, otp);
                if (result.success) { handleCloseAuth(); navigate('/dashboard'); }
            }
        } catch (err) { setMessage(err.response?.data?.message || 'Invalid or expired OTP'); }
        finally { setLoading(false); }
    };
    const handleCompleteProfile = async (e) => {
        e.preventDefault(); setLoading(true); setMessage('');
        try {
            const res = await api.post('/auth/complete-registration', { ...formData, profile_photo_url: formData.profile_photo_url || null });
            if (res.data.success) {
                const { token } = res.data.data;
                localStorage.setItem('harusiyangu_token', token);
                handleCloseAuth();
                window.location.href = '/dashboard';
            }
        } catch (error) { setMessage(error.response?.data?.message || 'Failed to save profile.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            
            {/* --- NAVBAR --- */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                        <div className="w-10 h-10 bg-[#1e3a8a] rounded-lg flex items-center justify-center text-white font-serif text-xl font-bold shadow-md">H</div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">HarusiYangu</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Event Platform</span>
                        </div>
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
                            The Central Platform for Your <span className="text-[#1e3a8a] italic">Big Day</span>.
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
                        {/* HERO IMAGE: Uses the local file WEDDING1.webp */}
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

            {/* --- CELEBRATION SLIDER (UPDATED WITH LOCAL IMAGES) --- */}
            <section id="celebrations" className="py-24 px-6 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">For Every Celebration</h2>
                        <p className="text-slate-500 text-lg">Our platform adapts to the unique needs of every Tanzanian event type.</p>
                    </div>

                    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 h-[500px] md:h-[600px]">
                        {/* Navigation Arrows */}
                        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"><ChevronLeft size={24} /></button>
                        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"><ChevronRight size={24} /></button>
                        
                        {/* Slider Container */}
                        <div className="relative w-full h-full flex items-center">
                            {ASSETS.celebrations.map((slide, index) => (
                                <div 
                                    key={index}
                                    className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col md:flex-row ${index === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'}`}
                                >
                                    {/* Image Side */}
                                    <div className="w-full md:w-3/5 h-64 md:h-full overflow-hidden bg-slate-200">
                                        <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                                    </div>
                                    {/* Text Side */}
                                    <div className="w-full md:w-2/5 p-8 md:p-16 flex flex-col justify-center bg-white">
                                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">{slide.title}</h3>
                                        <p className="text-lg text-slate-600 leading-relaxed mb-8">{slide.desc}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['Budgeting', 'Guest List', 'Invites'].map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Indicators */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                            {ASSETS.celebrations.map((_, idx) => (
                                <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-blue-900 w-8' : 'bg-slate-300'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS (FROM DOCS) --- */}
            <section id="how-it-works" className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">How HarusiYangu Works</h2>
                        <p className="text-slate-500 text-lg">A streamlined workflow from planning to execution.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
                        
                        {[
                            { icon: <User size={32} />, title: "1. Create Event", desc: "Sign up and create your event profile. Add committee members and set your initial budget." },
                            { icon: <Zap size={32} />, title: "2. Manage & Automate", desc: "Send digital invitations, record contributions, and track vendor payments automatically." },
                            { icon: <Globe size={32} />, title: "3. Celebrate", desc: "Use QR codes for gate access. Post-event, view analytics and send thank-you messages." }
                        ].map((step, i) => (
                            <div key={i} className="text-center relative">
                                <div className="w-24 h-24 mx-auto bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-blue-900 mb-6 shadow-md">{step.icon}</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- WHY CHOOSE US (DOCUMENTATION) --- */}
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
                            <div>
                                <h3 className="font-bold text-lg">Ready to Start?</h3>
                                <p className="text-slate-400 text-sm">Join thousands of event hosts.</p>
                            </div>
                        </div>
                        <button onClick={() => handleOpenAuth('register')} className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg hover:bg-blue-50 transition-colors">Get Started Free</button>
                    </div>
                </div>
            </section>

            {/* --- AUTH MODAL (PRESERVED) --- */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-scale-up">
                        <button onClick={handleCloseAuth} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 z-20 hidden md:block"><CloseIcon size={18} /></button>
                        <div className="hidden md:flex md:w-2/5 bg-[#0f172a] text-white p-12 flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-2xl font-bold mb-8">H</div>
                                <h3 className="text-2xl font-bold mb-4">{authMode === 'login' ? 'Welcome Back.' : 'Join the Platform.'}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">{authMode === 'login' ? "Access your event dashboard, manage your contributions, and stay updated with your committee." : "Create your account and start planning your event with the most advanced tools available."}</p>
                            </div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 transform translate-x-1/2 translate-y-1/2"></div>
                        </div>
                        <div className="w-full md:w-3/5 p-8 md:p-12 bg-white flex flex-col justify-center relative">
                            <button onClick={handleCloseAuth} className="md:hidden absolute top-4 right-4 text-slate-400"><CloseIcon size={24} /></button>
                            <div className="max-w-md mx-auto w-full">
                                <div className="text-right mb-8">
                                    {authMode === 'login' ? <span className="text-sm text-slate-500">New to HarusiYangu? <button onClick={() => handleSwitchMode('register')} className="text-blue-900 font-bold hover:underline">Create Account</button></span> : <span className="text-sm text-slate-500">Already have an account? <button onClick={() => handleSwitchMode('login')} className="text-blue-900 font-bold hover:underline">Log In</button></span>}
                                </div>
                                {message && <div className={`p-3 rounded-lg mb-6 text-xs font-medium flex items-center gap-2 ${message.includes('sent') || message.includes('verified') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{message.includes('suspended') ? <Lock size={14} /> : <Check size={14} />}<span>{message}</span></div>}
                                {step === 1 && (
                                    <div className="animate-fade-in-up">
                                        <h4 className="text-2xl font-bold text-slate-900 mb-2">{authMode === 'login' ? 'Login' : 'Register'}</h4>
                                        <p className="text-slate-500 text-sm mb-8">Enter your phone number to receive a verification code.</p>
                                        <form onSubmit={handleRequestOtp} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Phone size={20} /></div>
                                                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all text-base font-medium" placeholder="+255 712 345 678" required />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">{loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Send Verification Code</span>}{!loading && <ChevronRight size={20} />}</button>
                                        </form>
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="animate-fade-in-up">
                                        <div className="mb-8">
                                            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-1 mb-4"><ArrowRight size={16} className="rotate-180"/> Change Number</button>
                                            <h4 className="text-2xl font-bold text-slate-900">Verify Phone</h4>
                                            <p className="text-slate-500 text-sm mt-1">We sent a code to {phone}</p>
                                        </div>
                                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Enter 6-Digit Code</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Lock size={20} /></div>
                                                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all text-center font-mono text-2xl tracking-widest" placeholder="000000" maxLength={6} required autoFocus />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">{loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Verify & {authMode === 'register' ? 'Continue' : 'Login'}</span>}</button>
                                        </form>
                                    </div>
                                )}
                                {step === 3 && authMode === 'register' && (
                                    <div className="animate-fade-in-up space-y-4">
                                        <h4 className="text-2xl font-bold text-slate-900 mb-6">Complete Profile</h4>
                                        <form onSubmit={handleCompleteProfile} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">First Name</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-sm font-medium" required /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Last Name</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-sm font-medium" required /></div>
                                            </div>
                                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400"><Mail size={18} /></span><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-sm font-medium" /></div></div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Profile Photo</label>
                                                <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-dashed border-slate-200 rounded-lg hover:bg-slate-50 transition-colors relative">
                                                    <div className="space-y-1 text-center">
                                                        {imagePreview ? (<div className="relative inline-block"><img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-full object-cover border-2 border-blue-900 shadow-md" /><button type="button" onClick={removeImage} className="absolute top-0 right-0 bg-slate-900 text-white rounded-full p-1 hover:bg-red-500"><CloseIcon size={12} /></button></div>) : (<><Image className="mx-auto h-8 w-8 text-slate-400" /><div className="flex text-sm text-slate-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-900 hover:text-blue-700"><span>Upload Photo</span><input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} /></label></div></>)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-sm font-medium" required /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Confirm</label><input type="password" value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-sm font-medium" required /></div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all mt-2">{loading ? <RefreshCw className="animate-spin inline mr-2" size={20} /> : <span>Create Account</span>}</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PROFESSIONAL FOOTER --- */}
            <footer className="bg-[#0f172a] text-white pt-16 pb-8 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center font-bold">H</div>
                                <span className="text-xl font-bold">HarusiYangu</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">The digital transformation of Tanzanian social event culture, combining financial transparency, automation, and community engagement.</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Platform</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Support</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-white">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                            </ul>
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