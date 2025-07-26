const express = require('express');
const Joi = require('joi');
const pdfGenerator = require('../services/pdfGenerator');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Import MongoDB models
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Template = require('../models/Template');

const router = express.Router();

// Validation schemas
const invoiceMetadataSchema = Joi.object({
  invoiceId: Joi.string().required(),
  walletAddress: Joi.string().required(), // User's wallet address
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().valid('ETH', 'USD', 'EUR', 'GBP', 'USDC', 'DAI').default('ETH'),
  dueDate: Joi.date().iso().required(),
  issuerName: Joi.string().max(100).optional(),
  issuerEmail: Joi.string().email().optional(),
  recipientName: Joi.string().max(100).optional(),
  recipientEmail: Joi.string().email().optional(),
  recipientWallet: Joi.string().required(),
  notes: Joi.string().max(1000).optional().allow(''),
  category: Joi.string().max(50).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional()
});

const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid('services', 'products', 'consulting', 'development', 'design', 'other').default('other'),
  fields: Joi.object().required(),
  isPublic: Joi.boolean().optional().default(false),
  walletAddress: Joi.string().required()
});

const userSchema = Joi.object({
  walletAddress: Joi.string().required(),
  email: Joi.string().email().optional(),
  name: Joi.string().max(100).optional(),
  company: Joi.string().max(100).optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').default('dark'),
    notifications: Joi.boolean().default(true),
    defaultCurrency: Joi.string().valid('ETH', 'USD', 'EUR', 'GBP').default('ETH'),
    timezone: Joi.string().default('UTC')
  }).optional()
});

// Helper function to get or create user
async function getOrCreateUser(walletAddress, userData = {}) {
  try {
    let user = await User.findByWallet(walletAddress);
    
    if (!user) {
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        ...userData
      });
      await user.save();
      console.log(`✅ Created new user: ${walletAddress}`);
    } else {
      // Update last active
      await user.updateLastActive();
    }
    
    return user;
  } catch (error) {
    console.error('Error getting/creating user:', error);
    throw error;
  }
}

// Store invoice metadata in MongoDB
router.post('/metadata', async (req, res) => {
  try {
    const { error, value } = invoiceMetadataSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { invoiceId, walletAddress, recipientWallet, ...invoiceData } = value;
    
    // Get or create user
    const user = await getOrCreateUser(walletAddress);
    
    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ invoiceId });
    if (existingInvoice) {
      return res.status(409).json({
        error: 'Invoice already exists',
        message: 'An invoice with this ID already exists'
      });
    }
    
    // Create new invoice
    const invoice = new Invoice({
      invoiceId,
      userId: user._id,
      ...invoiceData,
      issuer: {
        name: invoiceData.issuerName,
        email: invoiceData.issuerEmail,
        walletAddress: walletAddress.toLowerCase()
      },
      recipient: {
        name: invoiceData.recipientName,
        email: invoiceData.recipientEmail,
        walletAddress: recipientWallet.toLowerCase()
      },
      status: 'draft'
    });
    
    await invoice.save();
    
    // Update user stats
    user.stats.totalInvoices += 1;
    await user.save();

    console.log('✅ Created invoice with ID:', invoice.invoiceId);

    res.json({
      success: true,
      message: 'Invoice metadata stored successfully',
      invoice: {
        _id: invoice._id,
        invoiceId: invoice.invoiceId,
        title: invoice.title,
        amount: parseFloat(invoice.amount.toString()),
        currency: invoice.currency,
        status: invoice.status,
        createdAt: invoice.createdAt
      }
    });

  } catch (error) {
    console.error('Store metadata error:', error);
    res.status(500).json({
      error: 'Failed to store metadata',
      message: error.message
    });
  }
});

// Get invoice metadata from MongoDB
router.get('/metadata/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return res.status(400).json({
        error: 'Invalid invoice ID',
        message: 'Please provide a valid invoice ID'
      });
    }

    const invoice = await Invoice.findOne({ invoiceId })
      .populate('userId', 'walletAddress name company')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'No invoice found with this ID'
      });
    }

    // Format response
    const formattedInvoice = {
      ...invoice,
      amount: parseFloat(invoice.amount.toString()), // Convert Decimal128 to number
      formattedAmount: parseFloat(invoice.amount.toString()).toFixed(4),
      daysUntilDue: invoice.dueDate ? Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      isOverdue: invoice.status === 'pending' && invoice.dueDate && new Date() > new Date(invoice.dueDate)
    };

    res.json({
      success: true,
      invoice: formattedInvoice
    });

  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      error: 'Failed to get metadata',
      message: error.message
    });
  }
});

// Search invoices in MongoDB
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      walletAddress,
      category, 
      tag, 
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build MongoDB query
    const searchQuery = {};
    
    // Filter by wallet address (user's invoices)
    if (walletAddress) {
      const user = await User.findByWallet(walletAddress);
      if (user) {
        searchQuery.userId = user._id;
      } else {
        return res.json({ success: true, invoices: [], total: 0 });
      }
    }
    
    // Text search across multiple fields
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'issuer.name': { $regex: query, $options: 'i' } },
        { 'recipient.name': { $regex: query, $options: 'i' } },
        { notes: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (category) {
      searchQuery.category = category;
    }
    
    // Filter by tag
    if (tag) {
      searchQuery.tags = { $in: [tag] };
    }
    
    // Filter by status
    if (status) {
      searchQuery.status = status;
    }
    
    // Filter by amount range
    if (minAmount || maxAmount) {
      searchQuery.amount = {};
      if (minAmount) searchQuery.amount.$gte = parseFloat(minAmount);
      if (maxAmount) searchQuery.amount.$lte = parseFloat(maxAmount);
    }
    
    // Filter by date range
    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
    }
    
    // Build sort object
    const sortObject = {};
    sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute search with pagination
    const [invoices, total] = await Promise.all([
      Invoice.find(searchQuery)
        .populate('userId', 'walletAddress name company')
        .sort(sortObject)
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      Invoice.countDocuments(searchQuery)
    ]);
    
    // Format results
    const formattedInvoices = invoices.map(invoice => ({
      ...invoice,
      amount: parseFloat(invoice.amount.toString()),
      formattedAmount: parseFloat(invoice.amount.toString()).toFixed(4),
      daysUntilDue: invoice.dueDate ? Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      isOverdue: invoice.status === 'pending' && invoice.dueDate && new Date() > new Date(invoice.dueDate)
    }));

    console.log('🔍 Search API returning invoices:', formattedInvoices.map(inv => ({
      _id: inv._id,
      invoiceId: inv.invoiceId,
      title: inv.title,
      amount: inv.amount
    })));

    res.json({
      success: true,
      results: formattedInvoices,
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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

// Create invoice template in MongoDB
router.post('/templates', async (req, res) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { walletAddress, ...templateData } = value;
    
    // Get or create user
    const user = await getOrCreateUser(walletAddress);
    
    // Create new template
    const template = new Template({
      userId: user._id,
      ...templateData
    });

    await template.save();

    res.json({
      success: true,
      message: 'Template created successfully',
      template: {
        id: template._id,
        name: template.name,
        description: template.description,
        category: template.category,
        isPublic: template.sharing.isPublic,
        createdAt: template.createdAt
      }
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      error: 'Failed to create template',
      message: error.message
    });
  }
});

// Get templates from MongoDB
router.get('/templates', async (req, res) => {
  try {
    const { isPublic, walletAddress, category } = req.query;
    
    let query = { isActive: true };
    
    // Filter by user's templates
    if (walletAddress) {
      const user = await User.findByWallet(walletAddress);
      if (user) {
        if (isPublic === 'true') {
          // Get user's templates + public templates
          query = {
            $or: [
              { userId: user._id },
              { 'sharing.isPublic': true }
            ],
            isActive: true
          };
        } else {
          // Get only user's templates
          query.userId = user._id;
        }
      } else if (isPublic === 'true') {
        // Only public templates for non-users
        query['sharing.isPublic'] = true;
      }
    } else if (isPublic === 'true') {
      // Only public templates
      query['sharing.isPublic'] = true;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    const templates = await Template.find(query)
      .populate('userId', 'walletAddress name company')
      .sort({ 'usage.timesUsed': -1, createdAt: -1 })
      .lean();

    // Format response
    const formattedTemplates = templates.map(template => ({
      id: template._id,
      name: template.name,
      description: template.description,
      category: template.category,
      fields: template.fields,
      isPublic: template.sharing.isPublic,
      isDefault: template.sharing.isDefault,
      usageCount: template.usage.timesUsed,
      createdAt: template.createdAt,
      lastUsed: template.usage.lastUsed,
      owner: template.userId ? {
        walletAddress: template.userId.walletAddress,
        name: template.userId.name
      } : null
    }));

    res.json({
      success: true,
      templates: formattedTemplates
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
  // Support both old format (single recipient) and new format (separate fields)
  recipient: Joi.alternatives().try(
    Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/),
    Joi.object({
      name: Joi.string().min(1).max(100).required(),
      email: Joi.string().email().optional().allow(''),
      walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
    })
  ).optional(),
  
  // New separate recipient fields
  recipientName: Joi.string().min(1).max(100).optional(),
  recipientEmail: Joi.string().email().optional().allow(''),
  recipientAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  
  amount: Joi.alternatives().try(
    Joi.string().required(),
    Joi.number().positive().required()
  ).messages({
    'any.required': 'Amount is required'
  }),
  description: Joi.string().min(1).max(500).optional().default('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  dueDate: Joi.date().iso().required()
    .messages({
      'date.base': 'Due date must be a valid date'
    }),
  title: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Title is required'
    }),
  tokenAddress: Joi.string().optional().allow('')
}).custom((value, helpers) => {
  // Ensure we have recipient information in some form
  const hasOldFormat = value.recipient && typeof value.recipient === 'string';
  const hasNewObjectFormat = value.recipient && typeof value.recipient === 'object';
  const hasNewFieldsFormat = value.recipientName && value.recipientAddress;
  
  if (!hasOldFormat && !hasNewObjectFormat && !hasNewFieldsFormat) {
    return helpers.error('custom.missingRecipient');
  }
  
  return value;
}, 'Recipient validation').messages({
  'custom.missingRecipient': 'Recipient information is required (either recipient field or recipientName + recipientAddress)'
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

    const { recipient, amount, description, dueDate, title, recipientName, recipientEmail, recipientAddress, tokenAddress } = value;

    console.log('📄 Generating invoice PDF automatically...');

    // Prepare invoice data for PDF generation with normalized recipient data
    const invoiceData = {
      amount,
      description,
      dueDate,
      createdAt: new Date().toISOString(),
      title,
      tokenAddress
    };

    // Normalize recipient data
    if (recipientName && recipientAddress) {
      // New format with separate fields
      invoiceData.recipient = recipientAddress;
      invoiceData.recipientName = recipientName;
      invoiceData.recipientEmail = recipientEmail || '';
    } else if (recipient && typeof recipient === 'object') {
      // Nested object format
      invoiceData.recipient = recipient.walletAddress;
      invoiceData.recipientName = recipient.name;
      invoiceData.recipientEmail = recipient.email || '';
    } else if (recipient && typeof recipient === 'string') {
      // Old format - just the address
      invoiceData.recipient = recipient;
      invoiceData.recipientName = 'N/A';
      invoiceData.recipientEmail = '';
    }

    // Generate PDF using pdf-lib
    const pdfBytes = await pdfGenerator.generateInvoicePDF(invoiceData);

    console.log('✅ PDF generated successfully, size:', pdfBytes.length, 'bytes');

    // Prepare metadata for IPFS upload
    const metadata = {
      filename: `invoice-${Date.now()}.pdf`,
      title: title || 'Blockchain Invoice',
      description: description,
      invoiceData: {
        recipient: invoiceData.recipient,
        recipientName: invoiceData.recipientName,
        recipientEmail: invoiceData.recipientEmail,
        amount,
        dueDate,
        createdAt: invoiceData.createdAt
      }
    };

    // Upload PDF to IPFS (Pinata or local storage)
    let ipfsResult;
    let useFallbackStorage = false;
    
    // For testing: Force local storage by setting this to true
    const forceLocalStorage = false; // Change to true to bypass Pinata completely
    
    if (!forceLocalStorage && process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      console.log('📤 Uploading generated PDF to Pinata IPFS...');
      console.log('🔑 Using Pinata API Key:', process.env.PINATA_API_KEY.substring(0, 5) + '...');
      
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
        // Extract form-data headers
        const formHeaders = {};
        // Only extract headers if getHeaders method exists
        if (typeof formData.getHeaders === 'function') {
          Object.assign(formHeaders, formData.getHeaders());
        }
        
        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            headers: {
              'pinata_api_key': process.env.PINATA_API_KEY,
              'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
              ...formHeaders
            },
            timeout: 60000 // 60 second timeout
          }
        );

        // Check if response is successful
        if (response.data && response.data.IpfsHash) {
          ipfsResult = {
            success: true,
            ipfsHash: response.data.IpfsHash,
            size: pdfBytes.length,
            timestamp: new Date().toISOString()
          };

          console.log('✅ Generated PDF uploaded to Pinata IPFS:', response.data.IpfsHash);
          console.log('📊 Pinata response:', JSON.stringify(response.data, null, 2));
        } else {
          console.error('❌ Pinata response missing IpfsHash:', response.data);
          throw new Error('Invalid response from Pinata: missing IpfsHash');
        }
      } catch (pinataError) {
        console.error('❌ Pinata upload failed:', pinataError.message);
        console.error('Error details:', pinataError.response?.data || 'No response data');
        console.log('📁 Falling back to local storage...');
        // Use fallback instead of throwing
        useFallbackStorage = true;
      }
    } else {
      // If Pinata keys aren't set or we're forcing local storage
      useFallbackStorage = true;
      console.log('📝 Using local storage for PDF', 
        forceLocalStorage ? '(forced)' : 
        (!process.env.PINATA_API_KEY ? '(no API key)' : '(as configured)'));
    }
    
    // Use local storage if needed
    if (useFallbackStorage) {
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

    // Normalize the invoice data for PDF generation
    const invoiceData = {
      ...value,
      createdAt: new Date().toISOString()
    };

    // Normalize recipient data for PDF generator
    if (value.recipientName && value.recipientAddress) {
      // New format with separate fields
      invoiceData.recipient = value.recipientAddress;
      invoiceData.recipientName = value.recipientName;
      invoiceData.recipientEmail = value.recipientEmail || '';
    } else if (value.recipient && typeof value.recipient === 'object') {
      // Nested object format
      invoiceData.recipient = value.recipient.walletAddress;
      invoiceData.recipientName = value.recipient.name;
      invoiceData.recipientEmail = value.recipient.email || '';
    } else if (value.recipient && typeof value.recipient === 'string') {
      // Old format - just the address
      invoiceData.recipient = value.recipient;
      invoiceData.recipientName = 'N/A';
      invoiceData.recipientEmail = '';
    }

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

// User management endpoints

// Get or create user profile
router.post('/users/profile', async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const user = await getOrCreateUser(value.walletAddress, value);

    res.json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        company: user.company,
        email: user.email,
        preferences: user.preferences,
        stats: {
          totalInvoices: user.stats.totalInvoices,
          totalEarned: parseFloat(user.stats.totalEarned.toString()).toFixed(4),
          totalPaid: parseFloat(user.stats.totalPaid.toString()).toFixed(4)
        },
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }
    });

  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// Update user preferences
router.put('/users/:walletAddress/preferences', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { preferences } = req.body;

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this wallet address'
      });
    }

    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// Update invoice status
router.put('/invoices/:invoiceId/status', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status, transactionHash, blockNumber } = req.body;

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: 'No invoice found with this ID'
      });
    }

    if (status === 'paid') {
      await invoice.markAsPaid(transactionHash, blockNumber);
    } else {
      await invoice.updateStatus(status);
    }

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      invoice: {
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        paidDate: invoice.paidDate,
        transactionHash: invoice.blockchain.transactionHash
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Failed to update invoice status',
      message: error.message
    });
  }
});

// Get user dashboard analytics
router.get('/users/:walletAddress/analytics', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this wallet address'
      });
    }

    // Get invoice analytics
    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalEarned,
      monthlyData
    ] = await Promise.all([
      Invoice.countDocuments({ userId: user._id }),
      Invoice.countDocuments({ userId: user._id, status: 'paid' }),
      Invoice.countDocuments({ userId: user._id, status: 'pending' }),
      Invoice.countDocuments({ 
        userId: user._id, 
        status: 'pending',
        dueDate: { $lt: new Date() }
      }),
      Invoice.aggregate([
        { $match: { userId: user._id, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Invoice.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        overview: {
          totalInvoices,
          paidInvoices,
          pendingInvoices,
          overdueInvoices,
          totalEarned: totalEarned[0] ? parseFloat(totalEarned[0].total.toString()).toFixed(4) : '0.0000',
          paymentRate: totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : 0
        },
        monthlyData: monthlyData.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count,
          totalAmount: parseFloat(item.totalAmount.toString()).toFixed(4)
        }))
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

module.exports = router;
