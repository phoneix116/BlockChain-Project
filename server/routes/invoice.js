const express = require('express');
const Joi = require('joi');

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

module.exports = router;
