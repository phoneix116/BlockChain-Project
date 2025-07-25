import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/invoice`,
  timeout: 30000,
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Invoice API error:', error);
    
    if (error.response) {
      throw new Error(error.response.data?.message || 'Invoice service error');
    } else if (error.request) {
      throw new Error('Network error - please check your connection');
    } else {
      throw new Error(error.message || 'Unknown error');
    }
  }
);

const invoiceAPI = {
  // Generate invoice with automatic PDF creation
  generateInvoice: async (invoiceData) => {
    const { recipient, amount, description, dueDate, title } = invoiceData;
    
    return api.post('/generate', {
      recipient,
      amount: amount.toString(), // Ensure amount is string
      description,
      dueDate: new Date(dueDate).toISOString(),
      title: title || 'Blockchain Invoice'
    });
  },

  // Generate PDF preview without uploading to IPFS
  previewInvoicePDF: async (invoiceData) => {
    const { recipient, amount, description, dueDate, title } = invoiceData;
    
    const response = await fetch(`${API_BASE_URL}/api/invoice/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient,
        amount: amount.toString(),
        description,
        dueDate: new Date(dueDate).toISOString(),
        title: title || 'Blockchain Invoice'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF preview');
    }

    return response.blob();
  },

  // Download generated PDF
  downloadGeneratedPDF: async (ipfsHash) => {
    const gatewayUrl = process.env.REACT_APP_IPFS_GATEWAY || 'http://localhost:3001/api/ipfs/file/';
    const url = gatewayUrl.includes('gateway.pinata.cloud') 
      ? `${gatewayUrl}${ipfsHash}`
      : `${API_BASE_URL}/api/ipfs/file/${ipfsHash}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    
    return response.blob();
  },

  // Store invoice metadata
  storeMetadata: (invoiceId, metadata) => 
    api.post('/metadata', { invoiceId, ...metadata }),

  // Get invoice metadata
  getMetadata: (invoiceId) => 
    api.get(`/metadata/${invoiceId}`),

  // Search invoices
  searchInvoices: (params) => 
    api.get('/search', { params }),

  // Export invoices
  exportInvoices: (format = 'json', filters = {}) => 
    api.get('/export', { 
      params: { format, ...filters },
      responseType: format === 'csv' ? 'text' : 'json'
    }),
};

export default invoiceAPI;
