import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // OPTIMIZATION: Lazy initialization from localStorage
        try {
            const storedUser = localStorage.getItem('harusiyangu_user');
            return storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false); // Changed to false - no need to wait

    // OPTIMIZATION: Verify token on mount (faster than before)
    useEffect(() => {
        const token = localStorage.getItem('harusiyangu_token');
        
        // If no token, ensure user is null
        if (!token) {
            setUser(null);
            return;
        }

        // Optional: Verify token validity with a quick API call
        // Commented out for speed - can be enabled if needed
        /*
        api.get('/auth/me')
            .then(res => setUser(res.data.data))
            .catch(() => {
                setUser(null);
                localStorage.removeItem('harusiyangu_token');
                localStorage.removeItem('harusiyangu_user');
            });
        */
    }, []);

    const login = useCallback(async (phone, otp) => {
        try {
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
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('harusiyangu_token');
        localStorage.removeItem('harusiyangu_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);