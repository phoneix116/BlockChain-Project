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

  // Download file from IPFS - Direct Pinata gateway access
  downloadFile: async (hash) => {
    // Primary: Use Pinata gateway directly
    const pinataGateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://cyan-glamorous-tarsier-110.mypinata.cloud/ipfs/';
    const directUrl = `${pinataGateway}${hash}`;
    
    try {
      console.log('Downloading from Pinata gateway:', directUrl);
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf, application/octet-stream',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Pinata gateway failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Downloaded from Pinata - Size:', blob.size, 'Type:', blob.type);
      return blob;
      
    } catch (error) {
      console.error('Pinata download failed, trying backend fallback:', error);
      
      // Fallback: Use backend API
      try {
        const fallbackUrl = `${API_BASE_URL}/api/ipfs/file/${hash}`;
        const response = await fetch(fallbackUrl);
        
        if (!response.ok) {
          throw new Error(`Backend fallback failed: ${response.status}`);
        }
        
        return response.blob();
      } catch (fallbackError) {
        console.error('Both Pinata and backend download failed:', fallbackError);
        throw new Error('Failed to download file from IPFS');
      }
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
