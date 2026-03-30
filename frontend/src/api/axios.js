import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/v1', // Pointing to your Laravel API
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// 1. REQUEST INTERCEPTOR
// Automatically attaches the Bearer Token if it exists in localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('harusiyangu_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 2. RESPONSE INTERCEPTOR
// Handles global errors, like 401 Unauthorized (Auto Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('harusiyangu_token');
            localStorage.removeItem('harusiyangu_user');
            window.location.href = '/login'; // Force redirect to login
        }
        return Promise.reject(error);
    }
);

export default api;