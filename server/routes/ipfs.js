const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Joi = require('joi');
const pdfParse = require('pdf-parse');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Validation schemas
const uploadSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional()
});

// IPFS upload using Pinata
async function uploadToPinata(fileBuffer, metadata) {
  const formData = new FormData();
  formData.append('file', fileBuffer, {
    filename: metadata.filename,
    contentType: 'application/pdf'
  });

  const pinataMetadata = JSON.stringify({
    name: metadata.title,
    keyvalues: {
      description: metadata.description || '',
      uploadedAt: new Date().toISOString(),
      fileType: 'invoice-pdf'
    }
  });

  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });

  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
        },
      }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      size: response.data.PinSize,
      timestamp: response.data.Timestamp
    };
  } catch (error) {
    console.error('Pinata upload error:', error.response?.data || error.message);
    throw new Error('Failed to upload to IPFS');
  }
}

// Alternative: Upload to Web3.Storage
async function uploadToWeb3Storage(fileBuffer, metadata) {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: metadata.filename,
      contentType: 'application/pdf'
    });

    const response = await axios.post(
      'https://api.web3.storage/upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        },
      }
    );

    return {
      success: true,
      ipfsHash: response.data.cid,
      size: fileBuffer.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Web3.Storage upload error:', error.response?.data || error.message);
    throw new Error('Failed to upload to IPFS');
  }
}

// Upload PDF to IPFS
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF file to upload'
      });
    }

    // Validate request body
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    // Extract text from PDF for validation
    let pdfText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      pdfText = pdfData.text;
      
      // Basic invoice validation
      const hasAmount = /\$[\d,]+\.?\d*|\d+\.\d{2}/.test(pdfText);
      const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(pdfText);
      
      if (!hasAmount && !hasDate) {
        console.warn('PDF may not be a valid invoice - no amount or date detected');
      }
    } catch (pdfError) {
      console.warn('PDF text extraction failed:', pdfError.message);
    }

    const metadata = {
      filename: req.file.originalname,
      title: value.title,
      description: value.description,
      size: req.file.size,
      uploadedBy: req.ip // In production, use authenticated user ID
    };

    // Try Pinata first, fallback to Web3.Storage
    let result;
    try {
      if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
        result = await uploadToPinata(req.file.buffer, metadata);
      } else if (process.env.WEB3_STORAGE_TOKEN) {
        result = await uploadToWeb3Storage(req.file.buffer, metadata);
      } else {
        throw new Error('No IPFS service configured');
      }
    } catch (uploadError) {
      console.error('Primary IPFS upload failed:', uploadError.message);
      
      // Try fallback service
      if (process.env.WEB3_STORAGE_TOKEN && !result) {
        try {
          result = await uploadToWeb3Storage(req.file.buffer, metadata);
        } catch (fallbackError) {
          console.error('Fallback IPFS upload failed:', fallbackError.message);
          throw new Error('All IPFS services failed');
        }
      } else {
        throw uploadError;
      }
    }

    res.json({
      success: true,
      ipfsHash: result.ipfsHash,
      metadata: {
        filename: metadata.filename,
        title: metadata.title,
        description: metadata.description,
        size: metadata.size,
        uploadedAt: result.timestamp
      },
      gateway: `${process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'}${result.ipfsHash}`,
      message: 'File uploaded successfully to IPFS'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Get file info from IPFS
router.get('/file/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || hash.length < 10) {
      return res.status(400).json({
        error: 'Invalid IPFS hash',
        message: 'Please provide a valid IPFS hash'
      });
    }

    // Try to get metadata from Pinata
    let metadata = null;
    if (process.env.PINATA_API_KEY) {
      try {
        const response = await axios.get(
          `https://api.pinata.cloud/data/pinList?hashContains=${hash}`,
          {
            headers: {
              'pinata_api_key': process.env.PINATA_API_KEY,
              'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
            },
          }
        );

        if (response.data.rows && response.data.rows.length > 0) {
          const pin = response.data.rows[0];
          metadata = {
            ipfsHash: pin.ipfs_pin_hash,
            size: pin.size,
            uploadedAt: pin.date_pinned,
            metadata: pin.metadata
          };
        }
      } catch (pinataError) {
        console.warn('Failed to get metadata from Pinata:', pinataError.message);
      }
    }

    res.json({
      success: true,
      ipfsHash: hash,
      gateway: `${process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'}${hash}`,
      metadata: metadata,
      message: 'IPFS file info retrieved'
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      error: 'Failed to get file info',
      message: error.message
    });
  }
});

// Pin existing IPFS hash
router.post('/pin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || hash.length < 10) {
      return res.status(400).json({
        error: 'Invalid IPFS hash',
        message: 'Please provide a valid IPFS hash'
      });
    }

    if (!process.env.PINATA_API_KEY) {
      return res.status(501).json({
        error: 'Service not available',
        message: 'Pinning service not configured'
      });
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinByHash',
      {
        hashToPin: hash,
        pinataMetadata: {
          name: `Pinned-${hash}`,
          keyvalues: {
            pinnedAt: new Date().toISOString(),
            source: 'invoice-chain'
          }
        }
      },
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
        },
      }
    );

    res.json({
      success: true,
      ipfsHash: response.data.ipfsHash,
      message: 'IPFS hash pinned successfully'
    });

  } catch (error) {
    console.error('Pin error:', error);
    res.status(500).json({
      error: 'Failed to pin IPFS hash',
      message: error.response?.data?.message || error.message
    });
  }
});

// List pinned files
router.get('/pins', async (req, res) => {
  try {
    if (!process.env.PINATA_API_KEY) {
      return res.status(501).json({
        error: 'Service not available',
        message: 'Pinning service not configured'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    
    const response = await axios.get(
      `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${(page - 1) * limit}`,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
        },
      }
    );

    const pins = response.data.rows.map(pin => ({
      ipfsHash: pin.ipfs_pin_hash,
      size: pin.size,
      uploadedAt: pin.date_pinned,
      metadata: pin.metadata,
      gateway: `${process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'}${pin.ipfs_pin_hash}`
    }));

    res.json({
      success: true,
      pins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: response.data.count
      }
    });

  } catch (error) {
    console.error('List pins error:', error);
    res.status(500).json({
      error: 'Failed to list pinned files',
      message: error.message
    });
  }
});

module.exports = router;
