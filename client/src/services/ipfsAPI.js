import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/ipfs`,
  timeout: 60000, // Longer timeout for file uploads
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('IPFS API error:', error);
    
    if (error.response) {
      throw new Error(error.response.data?.message || 'IPFS service error');
    } else if (error.request) {
      throw new Error('Network error - please check your connection');
    } else {
      throw new Error(error.message || 'Unknown error');
    }
  }
);

const ipfsAPI = {
  // Upload file to IPFS
  uploadFile: async (file, title, description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) {
      formData.append('description', description);
    }

    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get file info from IPFS
  getFileInfo: (hash) => api.get(`/file/${hash}`),

  // Pin existing IPFS hash
  pinHash: (hash) => api.post(`/pin/${hash}`),

  // List pinned files
  listPins: (page = 1, limit = 10) => 
    api.get('/pins', {
      params: { page, limit }
    }),

  // Generate IPFS gateway URL
  getGatewayUrl: (hash) => {
    const gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${gateway}${hash}`;
  },

  // Download file from IPFS
  downloadFile: async (hash) => {
    const url = ipfsAPI.getGatewayUrl(hash);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      return response.blob();
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },

  // Validate PDF file
  validatePDF: (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf'];

    if (!file) {
      throw new Error('No file selected');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF files are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    return true;
  },
};

export default ipfsAPI;
