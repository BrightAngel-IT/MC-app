import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

const isLocalWeb = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalWeb 
  ? 'http://localhost:5000/api' 
  : 'https://mcbackend.crescereluna.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response && error.response.status === 401) {
        // Clear storage and force reload if 401 Unauthorized
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        // You could emit an event here to trigger state update in AuthContext
    }
    return Promise.reject(error);
});


export default api;