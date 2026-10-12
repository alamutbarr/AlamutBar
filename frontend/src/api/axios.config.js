import axios from 'axios';

const api = axios.create({
    // این پورت باید دقیقاً همان پورتی باشد که بک‌اند شما روی آن اجراست
    baseURL: 'http://localhost:5000/api',
});

// این بخش باعث می‌شود توکن کاربر به صورت خودکار به بک‌اند فرستاده شود
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
