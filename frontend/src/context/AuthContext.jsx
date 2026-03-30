import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is logged in on app load
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('harusiyangu_token');
            const storedUser = localStorage.getItem('harusiyangu_user');

            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
                // Optional: Verify token with backend here
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (phone, otp) => {
        try {
            // Call your Laravel API
            const response = await api.post('/auth/verify-otp', {
                phone,
                otp_code: otp,
                purpose: 'LOGIN'
            });

            if (response.data.success) {
                const { user: userData, token } = response.data.data;

                // Update State
                setUser(userData);

                // Persist Data
                localStorage.setItem('harusiyangu_token', token);
                localStorage.setItem('harusiyangu_user', JSON.stringify(userData));

                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('harusiyangu_token');
        localStorage.removeItem('harusiyangu_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);