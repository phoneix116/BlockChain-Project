import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data?.message || 'Server error');
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - please check your connection');
    } else {
      // Something else happened
      throw new Error(error.message || 'Unknown error');
    }
  }
);

const contractAPI = {
  // Get contract info
  getContractInfo: () => api.get('/contract/info'),

  // Get invoice by ID
  getInvoice: (invoiceId) => api.get(`/contract/invoice/${invoiceId}`),

  // Get user invoices
  getUserInvoices: (address) => api.get(`/contract/user/${address}/invoices`),

  // Get invoices by status
  getInvoicesByStatus: (status, limit = 10, offset = 0) => 
    api.get(`/contract/invoices/status/${status}`, {
      params: { limit, offset }
    }),

  // Get dispute info
  getDispute: (invoiceId) => api.get(`/contract/dispute/${invoiceId}`),

  // Get contract events
  getEvents: (eventType, fromBlock = 0, toBlock = 'latest', limit = 100) =>
    api.get(`/contract/events/${eventType}`, {
      params: { fromBlock, toBlock, limit }
    }),

  // Validate transaction data
  validateTransaction: (data) => api.post('/contract/validate-transaction', data),
};

export default contractAPI;
