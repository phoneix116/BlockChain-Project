const express = require('express');
const Joi = require('joi');
const pdfGenerator = require('../services/pdfGenerator');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

// In-memory storage for demo purposes
// In production, use a proper database like MongoDB, PostgreSQL, etc.
const invoiceStore = new Map();

// Validation schemas
const invoiceMetadataSchema = Joi.object({
  invoiceId: Joi.string().required(),
  title: Joi.string().min(1).max(100).required(),
  issuerName: Joi.string().max(100).optional(),
  recipientName: Joi.string().max(100).optional(),
  notes: Joi.string().max(1000).optional(),
  category: Joi.string().max(50).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional()
});

const templateSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(500).optional(),
  fields: Joi.object().required(),
  isPublic: Joi.boolean().optional().default(false)
});

// Store additional invoice metadata
router.post('/metadata', async (req, res) => {
  try {
    const { error, value } = invoiceMetadataSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { invoiceId } = value;
    
    // Store metadata
    const metadata = {
      ...value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    invoiceStore.set(`metadata_${invoiceId}`, metadata);

    res.json({
      success: true,
      message: 'Invoice metadata stored successfully',
      metadata
    });

  } catch (error) {
    console.error('Store metadata error:', error);
    res.status(500).json({
      error: 'Failed to store metadata',
      message: error.message
    });
  }
});

// Get invoice metadata
router.get('/metadata/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return res.status(400).json({
        error: 'Invalid invoice ID',
        message: 'Please provide a valid invoice ID'
      });
    }

    const metadata = invoiceStore.get(`metadata_${invoiceId}`);
    
    if (!metadata) {
      return res.status(404).json({
        error: 'Metadata not found',
        message: 'No metadata found for this invoice'
      });
    }

    res.json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      error: 'Failed to get metadata',
      message: error.message
    });
  }
});

// Search invoices by metadata
router.get('/search', async (req, res) => {
  try {
    const { query, category, tag, limit = 20, offset = 0 } = req.query;
    
    const allMetadata = Array.from(invoiceStore.entries())
      .filter(([key]) => key.startsWith('metadata_'))
      .map(([key, value]) => value);

    let results = allMetadata;

    // Filter by search query
    if (query) {
      const searchLower = query.toLowerCase();
      results = results.filter(metadata => 
        metadata.title.toLowerCase().includes(searchLower) ||
        metadata.notes?.toLowerCase().includes(searchLower) ||
        metadata.issuerName?.toLowerCase().includes(searchLower) ||
        metadata.recipientName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (category) {
      results = results.filter(metadata => 
        metadata.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by tag
    if (tag) {
      results = results.filter(metadata => 
        metadata.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      success: true,
      results: paginatedResults,
      pagination: {
        total: results.length,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: endIndex < results.length
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Invoice templates management
router.post('/templates', async (req, res) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template = {
      id: templateId,
      ...value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    invoiceStore.set(templateId, template);

    res.json({
      success: true,
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      error: 'Failed to create template',
      message: error.message
    });
  }
});

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const { isPublic } = req.query;
    
    const templates = Array.from(invoiceStore.entries())
      .filter(([key]) => key.startsWith('template_'))
      .map(([key, value]) => value);

    let filteredTemplates = templates;
    
    // Filter by public/private
    if (isPublic !== undefined) {
      const publicOnly = isPublic === 'true';
      filteredTemplates = templates.filter(template => template.isPublic === publicOnly);
    }

    // Sort by usage count and creation date
    filteredTemplates.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      templates: filteredTemplates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// Get specific template
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = invoiceStore.get(templateId);
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: 'Template does not exist'
      });
    }

    // Increment usage count
    template.usageCount = (template.usageCount || 0) + 1;
    template.lastUsed = new Date().toISOString();
    invoiceStore.set(templateId, template);

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      error: 'Failed to get template',
      message: error.message
    });
  }
});

// Invoice analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Get all metadata
    const allMetadata = Array.from(invoiceStore.entries())
      .filter(([key]) => key.startsWith('metadata_'))
      .map(([key, value]) => value);

    // Calculate date threshold
    const now = new Date();
    const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const threshold = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Filter by timeframe
    const recentMetadata = allMetadata.filter(metadata => 
      new Date(metadata.createdAt) >= threshold
    );

    // Calculate statistics
    const summary = {
      totalInvoices: recentMetadata.length,
      categoriesBreakdown: {},
      tagsBreakdown: {},
      timeframe,
      generatedAt: new Date().toISOString()
    };

    // Categories breakdown
    recentMetadata.forEach(metadata => {
      const category = metadata.category || 'Uncategorized';
      summary.categoriesBreakdown[category] = (summary.categoriesBreakdown[category] || 0) + 1;
    });

    // Tags breakdown
    recentMetadata.forEach(metadata => {
      if (metadata.tags) {
        metadata.tags.forEach(tag => {
          summary.tagsBreakdown[tag] = (summary.tagsBreakdown[tag] || 0) + 1;
        });
      }
    });

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

// Export invoice data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', includeMetadata = 'true' } = req.query;
    
    if (format !== 'json' && format !== 'csv') {
      return res.status(400).json({
        error: 'Invalid format',
        message: 'Format must be json or csv'
      });
    }

    const allMetadata = Array.from(invoiceStore.entries())
      .filter(([key]) => key.startsWith('metadata_'))
      .map(([key, value]) => value);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=invoices.json');
      res.json({
        exportedAt: new Date().toISOString(),
        count: allMetadata.length,
        invoices: allMetadata
      });
    } else {
      // CSV format
      const headers = ['invoiceId', 'title', 'issuerName', 'recipientName', 'category', 'createdAt'];
      const csvRows = [headers.join(',')];
      
      allMetadata.forEach(metadata => {
        const row = headers.map(header => {
          const value = metadata[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
      res.send(csvRows.join('\n'));
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

// Validation schema for invoice generation
const generateInvoiceSchema = Joi.object({
  recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
    .messages({
      'string.pattern.base': 'Recipient must be a valid Ethereum address'
    }),
  amount: Joi.string().required()
    .messages({
      'string.empty': 'Amount is required'
    }),
  description: Joi.string().min(1).max(500).required()
    .messages({
      'string.empty': 'Description is required',
      'string.max': 'Description cannot exceed 500 characters'
    }),
  dueDate: Joi.date().iso().min('now').required()
    .messages({
      'date.min': 'Due date must be in the future'
    }),
  title: Joi.string().min(1).max(100).optional().default('Blockchain Invoice')
});

// POST /api/invoice/generate - Generate invoice with PDF automatically
router.post('/generate', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = generateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { recipient, amount, description, dueDate, title } = value;

    console.log('📄 Generating invoice PDF automatically...');

    // Prepare invoice data for PDF generation
    const invoiceData = {
      recipient,
      amount,
      description,
      dueDate,
      createdAt: new Date().toISOString(),
      title
    };

    // Generate PDF using pdf-lib
    const pdfBytes = await pdfGenerator.generateInvoicePDF(invoiceData);

    console.log('✅ PDF generated successfully, size:', pdfBytes.length, 'bytes');

    // Prepare metadata for IPFS upload
    const metadata = {
      filename: `invoice-${Date.now()}.pdf`,
      title: title || 'Blockchain Invoice',
      description: description,
      invoiceData: {
        recipient,
        amount,
        dueDate,
        createdAt: invoiceData.createdAt
      }
    };

    // Upload PDF to IPFS (Pinata or local storage)
    let ipfsResult;

    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      console.log('📤 Uploading generated PDF to Pinata IPFS...');
      
      const formData = new FormData();
      formData.append('file', Buffer.from(pdfBytes), {
        filename: metadata.filename,
        contentType: 'application/pdf'
      });

      const pinataMetadata = JSON.stringify({
        name: metadata.title || 'Blockchain Invoice',
        type: 'invoice-pdf'
      });

      formData.append('pinataMetadata', pinataMetadata);
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

      try {
        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            headers: {
              'pinata_api_key': process.env.PINATA_API_KEY,
              'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
              ...formData.getHeaders()
            },
            timeout: 60000
          }
        );

        ipfsResult = {
          success: true,
          ipfsHash: response.data.IpfsHash,
          size: pdfBytes.length,
          timestamp: new Date().toISOString()
        };

        console.log('✅ Generated PDF uploaded to Pinata IPFS:', response.data.IpfsHash);
      } catch (pinataError) {
        console.error('❌ Pinata upload failed:', pinataError.message);
        throw pinataError;
      }
    } else {
      // Fallback to local storage
      console.log('📁 Saving generated PDF locally...');
      
      const mockIPFSHash = 'Qm' + crypto.randomBytes(32).toString('hex').substring(0, 44);
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${mockIPFSHash}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      const metadataPath = path.join(uploadsDir, `${mockIPFSHash}.json`);

      // Save PDF file
      fs.writeFileSync(filePath, pdfBytes);
      
      // Save metadata
      fs.writeFileSync(metadataPath, JSON.stringify({
        ...metadata,
        ipfsHash: mockIPFSHash,
        uploadedAt: new Date().toISOString(),
        generated: true
      }, null, 2));

      ipfsResult = {
        success: true,
        ipfsHash: mockIPFSHash,
        size: pdfBytes.length,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Generated PDF saved locally:', fileName);
    }

    // Return success response
    res.json({
      success: true,
      message: 'Invoice PDF generated and uploaded successfully',
      data: {
        ipfsHash: ipfsResult.ipfsHash,
        fileName: metadata.filename,
        size: ipfsResult.size,
        invoiceData: {
          recipient,
          amount,
          description,
          dueDate,
          title,
          createdAt: invoiceData.createdAt
        },
        downloadUrl: process.env.IPFS_GATEWAY ? 
          `${process.env.IPFS_GATEWAY}${ipfsResult.ipfsHash}` : 
          `http://localhost:3001/api/ipfs/file/${ipfsResult.ipfsHash}`
      }
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice',
      message: error.message
    });
  }
});

// POST /api/invoice/preview - Generate PDF preview without uploading
router.post('/preview', async (req, res) => {
  try {
    const { error, value } = generateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    const invoiceData = {
      ...value,
      createdAt: new Date().toISOString()
    };

    // Generate PDF
    const pdfBytes = await pdfGenerator.generateInvoicePDF(invoiceData);

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="invoice-preview.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF directly
    res.end(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('PDF preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF preview',
      message: error.message
    });
  }
});

module.exports = router;
