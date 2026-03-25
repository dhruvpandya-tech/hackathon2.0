import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

export const analyzeUrl = (url, overrides = {}) =>
  apiClient.post('/analyze', {
    url,
    ...overrides,
  });

export const sendReport = (payload) =>
  apiClient.post('/send-report', payload);
