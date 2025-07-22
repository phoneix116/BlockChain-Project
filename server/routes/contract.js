const express = require('express');
const { ethers } = require('ethers');
const Joi = require('joi');
const path = require('path');

const router = express.Router();

// Contract ABI - This will be updated after deployment
let contractABI = [];
let contractAddress = '';

// Try to load contract details
try {
  const contractPath = path.join(__dirname, '../../client/src/contracts/InvoiceManager.json');
  const contractData = require(contractPath);
  contractABI = contractData.abi;
  contractAddress = contractData.address;
  console.log(`✅ Contract loaded: ${contractAddress}`);
} catch (error) {
  console.warn('❌ Contract ABI not found. Deploy contract first.', error.message);
}

// Initialize provider
const getProvider = () => {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract instance
const getContract = () => {
  if (!contractABI.length || !contractAddress) {
    throw new Error('Contract not deployed or ABI not available');
  }
  
  const provider = getProvider();
  return new ethers.Contract(contractAddress, contractABI, provider);
};

// Validation schemas
const createInvoiceSchema = Joi.object({
  ipfsHash: Joi.string().required(),
  recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  amount: Joi.string().required(),
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).allow('').optional(),
  dueDate: Joi.number().integer().min(Date.now() / 1000).required(),
  description: Joi.string().max(500).required()
});

// Get contract info
router.get('/info', async (req, res) => {
  try {
    if (!contractAddress) {
      return res.status(404).json({
        error: 'Contract not deployed',
        message: 'Please deploy the contract first',
        details: 'No contract address found in configuration'
      });
    }

    if (!contractABI.length) {
      return res.status(404).json({
        error: 'Contract ABI not available',
        message: 'Contract ABI could not be loaded',
        details: 'Check if the contract artifact exists'
      });
    }

    const contract = getContract();
    const provider = getProvider();
    
    // Test provider connection
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    // Get contract state
    const nextInvoiceId = await contract.nextInvoiceId();
    const disputeFee = await contract.disputeFee();
    const platformFee = await contract.platformFee();
    
    res.json({
      success: true,
      contract: {
        address: contractAddress,
        network: {
          name: network.name,
          chainId: network.chainId.toString()
        },
        blockNumber,
        state: {
          nextInvoiceId: nextInvoiceId.toString(),
          disputeFee: ethers.formatEther(disputeFee),
          platformFee: platformFee.toString()
        }
      }
    });
    
  } catch (error) {
    console.error('Contract info error:', error);
    res.status(500).json({
      error: 'Failed to get contract info',
      message: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Get invoice by ID
router.get('/invoice/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({
        error: 'Invalid invoice ID',
        message: 'Please provide a valid invoice ID'
      });
    }

    const contract = getContract();
    const invoice = await contract.getInvoice(id);
    
    // Format invoice data
    const formattedInvoice = {
      id: invoice.id.toString(),
      ipfsHash: invoice.ipfsHash,
      issuer: invoice.issuer,
      recipient: invoice.recipient,
      amount: invoice.amount.toString(),
      tokenAddress: invoice.tokenAddress,
      status: invoice.status,
      createdAt: new Date(invoice.createdAt.toNumber() * 1000).toISOString(),
      dueDate: new Date(invoice.dueDate.toNumber() * 1000).toISOString(),
      paidAt: invoice.paidAt.toNumber() > 0 ? new Date(invoice.paidAt.toNumber() * 1000).toISOString() : null,
      description: invoice.description
    };

    res.json({
      success: true,
      invoice: formattedInvoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Failed to get invoice',
      message: error.message
    });
  }
});

// Get invoices by user address
router.get('/user/:address/invoices', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        error: 'Invalid address',
        message: 'Please provide a valid Ethereum address'
      });
    }

    const contract = getContract();
    const invoiceIds = await contract.getUserInvoices(address);
    
    // Get full invoice details for each ID
    const invoices = await Promise.all(
      invoiceIds.map(async (id) => {
        try {
          const invoice = await contract.getInvoice(id);
          return {
            id: invoice.id.toString(),
            ipfsHash: invoice.ipfsHash,
            issuer: invoice.issuer,
            recipient: invoice.recipient,
            amount: invoice.amount.toString(),
            tokenAddress: invoice.tokenAddress,
            status: invoice.status,
            createdAt: new Date(invoice.createdAt.toNumber() * 1000).toISOString(),
            dueDate: new Date(invoice.dueDate.toNumber() * 1000).toISOString(),
            paidAt: invoice.paidAt.toNumber() > 0 ? new Date(invoice.paidAt.toNumber() * 1000).toISOString() : null,
            description: invoice.description
          };
        } catch (error) {
          console.warn(`Failed to get invoice ${id.toString()}:`, error.message);
          return null;
        }
      })
    );

    // Filter out failed requests
    const validInvoices = invoices.filter(invoice => invoice !== null);

    res.json({
      success: true,
      invoices: validInvoices,
      count: validInvoices.length
    });

  } catch (error) {
    console.error('Get user invoices error:', error);
    res.status(500).json({
      error: 'Failed to get user invoices',
      message: error.message
    });
  }
});

// Get invoices by status
router.get('/invoices/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const statusMap = {
      'created': 0,
      'paid': 1,
      'disputed': 2,
      'resolved': 3,
      'cancelled': 4
    };
    
    if (!(status.toLowerCase() in statusMap)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: created, paid, disputed, resolved, cancelled'
      });
    }

    const contract = getContract();
    const invoices = await contract.getInvoicesByStatus(
      statusMap[status.toLowerCase()],
      parseInt(limit),
      parseInt(offset)
    );
    
    // Format invoice data
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id.toString(),
      ipfsHash: invoice.ipfsHash,
      issuer: invoice.issuer,
      recipient: invoice.recipient,
      amount: invoice.amount.toString(),
      tokenAddress: invoice.tokenAddress,
      status: invoice.status,
      createdAt: new Date(invoice.createdAt.toNumber() * 1000).toISOString(),
      dueDate: new Date(invoice.dueDate.toNumber() * 1000).toISOString(),
      paidAt: invoice.paidAt.toNumber() > 0 ? new Date(invoice.paidAt.toNumber() * 1000).toISOString() : null,
      description: invoice.description
    }));

    res.json({
      success: true,
      invoices: formattedInvoices,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: formattedInvoices.length
      }
    });

  } catch (error) {
    console.error('Get invoices by status error:', error);
    res.status(500).json({
      error: 'Failed to get invoices by status',
      message: error.message
    });
  }
});

// Get dispute info
router.get('/dispute/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId || isNaN(invoiceId) || parseInt(invoiceId) <= 0) {
      return res.status(400).json({
        error: 'Invalid invoice ID',
        message: 'Please provide a valid invoice ID'
      });
    }

    const contract = getContract();
    const dispute = await contract.getDispute(invoiceId);
    
    // Check if dispute exists
    if (dispute.status === 0) { // DisputeStatus.None
      return res.status(404).json({
        error: 'Dispute not found',
        message: 'No dispute exists for this invoice'
      });
    }
    
    const formattedDispute = {
      invoiceId: dispute.invoiceId.toString(),
      initiator: dispute.initiator,
      reason: dispute.reason,
      status: dispute.status,
      createdAt: new Date(dispute.createdAt.toNumber() * 1000).toISOString(),
      resolvedAt: dispute.resolvedAt.toNumber() > 0 ? new Date(dispute.resolvedAt.toNumber() * 1000).toISOString() : null,
      resolver: dispute.resolver !== ethers.ZeroAddress ? dispute.resolver : null
    };

    res.json({
      success: true,
      dispute: formattedDispute
    });

  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({
      error: 'Failed to get dispute',
      message: error.message
    });
  }
});

// Get contract events
router.get('/events/:eventType', async (req, res) => {
  try {
    const { eventType } = req.params;
    const { fromBlock = 0, toBlock = 'latest', limit = 100 } = req.query;
    
    const validEvents = ['InvoiceCreated', 'InvoicePaid', 'InvoiceDisputed', 'DisputeResolved', 'InvoiceCancelled'];
    
    if (!validEvents.includes(eventType)) {
      return res.status(400).json({
        error: 'Invalid event type',
        message: `Event type must be one of: ${validEvents.join(', ')}`
      });
    }

    const contract = getContract();
    const filter = contract.filters[eventType]();
    
    const events = await contract.queryFilter(filter, parseInt(fromBlock), toBlock);
    
    // Limit results
    const limitedEvents = events.slice(-parseInt(limit));
    
    // Format events
    const formattedEvents = limitedEvents.map(event => ({
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      args: Object.keys(event.args).reduce((acc, key) => {
        if (isNaN(key)) {
          const value = event.args[key];
          acc[key] = ethers.BigNumber.isBigNumber(value) ? value.toString() : value;
        }
        return acc;
      }, {}),
      timestamp: null // Would need additional provider call to get block timestamp
    }));

    res.json({
      success: true,
      events: formattedEvents,
      eventType,
      count: formattedEvents.length
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Failed to get events',
      message: error.message
    });
  }
});

// Validate transaction data (for frontend use)
router.post('/validate-transaction', async (req, res) => {
  try {
    const { error, value } = createInvoiceSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }

    // Additional validation
    const { amount, dueDate } = value;
    
    try {
      ethers.parseEther(amount);
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a valid number'
      });
    }

    if (dueDate < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({
        error: 'Invalid due date',
        message: 'Due date must be in the future'
      });
    }

    res.json({
      success: true,
      message: 'Transaction data is valid',
      validatedData: value
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

module.exports = router;
