import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/invoice`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Only log errors that aren't network timeouts or rate limits
    if (error.response?.status !== 429 && error.code !== 'NETWORK_ERROR') {
      console.error('Invoice API error:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Log validation details if available
      if (error.response?.data?.details) {
        console.error('Validation details:', error.response.data.details);
      }
    }
    
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error('Rate limit exceeded - please wait a moment');
      }
      
      // Show specific validation errors if available
      let errorMessage = error.response.data?.error || error.response.data?.message || 'Invoice service error';
      
      if (error.response.data?.details && Array.isArray(error.response.data.details)) {
        const validationErrors = error.response.data.details.map(detail => detail.message || detail).join('; ');
        errorMessage = `${errorMessage}: ${validationErrors}`;
      }
      
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('Network error - please check your connection');
    } else {
      throw new Error(error.message || 'Unknown error');
    }
  }
);

const invoiceAPI = {
  // User Management
  createOrGetUser: (userData) => 
    api.post('/users/profile', userData),

  updateUserPreferences: (walletAddress, preferences) =>
    api.put(`/users/${walletAddress}/preferences`, { preferences }),

  getUserAnalytics: (walletAddress) =>
    api.get(`/users/${walletAddress}/analytics`),

  // Invoice Management
  createInvoiceMetadata: (invoiceData) =>
    api.post('/metadata', invoiceData),

  getInvoiceMetadata: (invoiceId) =>
    api.get(`/metadata/${invoiceId}`),

  searchInvoices: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Add search parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    return api.get(`/search?${queryParams.toString()}`);
  },

  updateInvoiceStatus: (invoiceId, statusData) =>
    api.put(`/invoices/${invoiceId}/status`, statusData),

  // Template Management
  createTemplate: (templateData) =>
    api.post('/templates', templateData),

  getTemplates: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    return api.get(`/templates?${queryParams.toString()}`);
  },

  // Invoice Generation (with PDF and IPFS)
  generateInvoice: async (invoiceData) => {
    // Handle different recipient formats and use the field names expected by backend
    let recipient, recipientName, recipientEmail, recipientAddress;
    
    if (typeof invoiceData.recipient === 'string') {
      recipient = invoiceData.recipient;
      recipientName = invoiceData.recipientName || '';
      recipientEmail = invoiceData.recipientEmail || '';
      recipientAddress = invoiceData.recipient;
    } else if (invoiceData.recipient && typeof invoiceData.recipient === 'object') {
      recipient = invoiceData.recipient;
      recipientName = invoiceData.recipient.name || invoiceData.recipientName || '';
      recipientEmail = invoiceData.recipient.email || invoiceData.recipientEmail || '';
      recipientAddress = invoiceData.recipient.walletAddress;
    } else {
      recipientAddress = invoiceData.recipientAddress;
      recipientName = invoiceData.recipientName || '';
      recipientEmail = invoiceData.recipientEmail || '';
      recipient = recipientAddress;
    }

    // Send data in the format expected by the backend validation schema
    const requestData = {
      recipient: recipient,
      recipientAddress: recipientAddress,
      amount: invoiceData.amount.toString(),
      description: invoiceData.description || '',
      dueDate: new Date(invoiceData.dueDate).toISOString(),
      title: invoiceData.title || 'Blockchain Invoice',
      tokenAddress: invoiceData.tokenAddress || ''
    };

    // Only include optional fields if they have valid values
    if (recipientName && recipientName.trim()) {
      requestData.recipientName = recipientName.trim();
    }
    
    if (recipientEmail && recipientEmail.trim() && recipientEmail.includes('@')) {
      requestData.recipientEmail = recipientEmail.trim();
    }
    
    return api.post('/generate', requestData);
  },

  // Helper methods for common operations
  getUserInvoices: (walletAddress, filters = {}) => {
    const params = { walletAddress, ...filters };
    return invoiceAPI.searchInvoices(params);
  },

  getPendingInvoices: (walletAddress) =>
    invoiceAPI.searchInvoices({ walletAddress, status: 'pending' }),

  getOverdueInvoices: (walletAddress) =>
    invoiceAPI.searchInvoices({ walletAddress, status: 'overdue' }),

  getPaidInvoices: (walletAddress) =>
    invoiceAPI.searchInvoices({ walletAddress, status: 'paid' }),

  // Search with advanced filters
  searchWithFilters: ({
    walletAddress,
    query,
    category,
    status,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 20,
    offset = 0
  } = {}) => {
    const params = {
      walletAddress,
      query,
      category,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      limit,
      offset
    };

    return invoiceAPI.searchInvoices(params);
  },

  // Get dashboard data
  getDashboardData: async (walletAddress) => {
    try {
      const [analytics, recentInvoices, pendingInvoices] = await Promise.all([
        invoiceAPI.getUserAnalytics(walletAddress),
        invoiceAPI.searchInvoices({ 
          walletAddress, 
          limit: 5, 
          sortBy: 'createdAt', 
          sortOrder: 'desc' 
        }),
        invoiceAPI.getPendingInvoices(walletAddress)
      ]);

      return {
        analytics: analytics.analytics,
        recentInvoices: recentInvoices.results || [],
        pendingInvoices: pendingInvoices.results || []
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Format invoice data for creation
  formatInvoiceForCreation: (formData, walletAddress, userInfo = {}) => {
    // Handle different recipient formats
    let recipientWallet, recipientName, recipientEmail;
    
    if (typeof formData.recipient === 'string') {
      // Old format: recipient is just the wallet address
      recipientWallet = formData.recipient.toLowerCase();
      recipientName = formData.recipientName || '';
      recipientEmail = formData.recipientEmail || '';
    } else if (formData.recipient && typeof formData.recipient === 'object') {
      // New object format
      recipientWallet = formData.recipient.walletAddress.toLowerCase();
      recipientName = formData.recipient.name || formData.recipientName || '';
      recipientEmail = formData.recipient.email || formData.recipientEmail || '';
    } else {
      // Separate fields format
      recipientWallet = formData.recipientAddress.toLowerCase();
      recipientName = formData.recipientName || '';
      recipientEmail = formData.recipientEmail || '';
    }

    const invoiceData = {
      invoiceId: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      walletAddress: walletAddress.toLowerCase(),
      title: formData.title || 'Blockchain Invoice',
      description: formData.description || '',
      amount: parseFloat(formData.amount),
      currency: formData.currency || 'ETH',
      dueDate: formData.dueDate,
      recipientWallet: recipientWallet,
      category: formData.category || 'other',
      tags: formData.tags || []
    };

    // Only include optional email fields if they have valid values
    const issuerName = formData.issuerName || userInfo.name || '';
    const issuerEmail = formData.issuerEmail || userInfo.email || '';
    
    if (issuerName && issuerName.trim()) {
      invoiceData.issuerName = issuerName;
    }
    
    if (issuerEmail && issuerEmail.trim() && issuerEmail.includes('@')) {
      invoiceData.issuerEmail = issuerEmail;
    }
    
    if (recipientName && recipientName.trim()) {
      invoiceData.recipientName = recipientName;
    }
    
    if (recipientEmail && recipientEmail.trim() && recipientEmail.includes('@')) {
      invoiceData.recipientEmail = recipientEmail;
    }

    // Only include notes if it's not empty
    if (formData.notes && formData.notes.trim()) {
      invoiceData.notes = formData.notes;
    }

    return invoiceData;
  },

  // Create complete invoice workflow
  createCompleteInvoice: async (formData, walletAddress, userInfo = {}) => {
    try {
      // 1. Ensure user exists
      await invoiceAPI.createOrGetUser({
        walletAddress: walletAddress.toLowerCase(),
        name: userInfo.name,
        email: userInfo.email,
        company: userInfo.company
      });

      // 2. Format invoice data
      const invoiceData = invoiceAPI.formatInvoiceForCreation(formData, walletAddress, userInfo);

      // 3. Create invoice metadata in MongoDB
      const invoiceResponse = await invoiceAPI.createInvoiceMetadata(invoiceData);

      try {
        // 4. Generate PDF and upload to IPFS
        const pdfResponse = await invoiceAPI.generateInvoice({
          recipient: formData.recipient,
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          recipientAddress: formData.recipientAddress,
          amount: formData.amount,
          description: formData.description,
          dueDate: formData.dueDate,
          title: formData.title,
          tokenAddress: formData.tokenAddress
        });

        return {
          invoice: invoiceResponse.invoice,
          pdf: pdfResponse
        };
      } catch (pdfError) {
        console.error('PDF generation/upload error:', pdfError);
        
        // Return the invoice data even if PDF upload fails
        // This allows the user to at least have the invoice metadata saved
        return {
          invoice: invoiceResponse.invoice,
          error: 'Invoice was created but PDF generation or IPFS upload failed. Please try downloading it later.',
          errorDetails: pdfError.message
        };
      }
    } catch (error) {
      console.error('Error creating complete invoice:', error);
      throw error;
    }
  },

  // Invoice status updates
  markInvoiceAsPaid: (invoiceId, txHash) =>
    api.put(`/invoice/${invoiceId}/paid`, { transactionHash: txHash }),

  // Export/Import functionality
  exportInvoices: (walletAddress, format = 'json', filters = {}) =>
    api.get('/export', { 
      params: { walletAddress, format, ...filters },
      responseType: 'blob'
    }),

  // IPFS operations
  uploadToIPFS: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ipfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getFromIPFS: (hash) => api.get(`/ipfs/${hash}`),

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

  // Error handling wrapper
  withErrorHandling: (operation) => async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error(`API Error in ${operation.name}:`, error);
      const errorObj = new Error(error.response?.data?.error || error.message || 'Unknown error');
      errorObj.status = error.response?.status || 500;
      errorObj.data = error.response?.data || null;
      throw errorObj;
    }
  }
};

export default invoiceAPI;
