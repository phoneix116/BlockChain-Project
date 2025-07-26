const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Invoice Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['ETH', 'USD', 'EUR', 'GBP', 'USDC', 'DAI'],
    default: 'ETH'
  },
  
  // Parties
  issuer: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    }
  },
  recipient: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    }
  },

  // Dates
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled', 'disputed'],
    default: 'draft',
    index: true
  },

  // Blockchain data
  blockchain: {
    contractAddress: {
      type: String,
      lowercase: true
    },
    transactionHash: {
      type: String,
      lowercase: true,
      sparse: true
    },
    blockNumber: {
      type: Number
    },
    gasUsed: {
      type: String
    },
    network: {
      type: String,
      enum: ['localhost', 'sepolia', 'mainnet'],
      default: 'localhost'
    }
  },

  // IPFS data
  ipfs: {
    hash: {
      type: String,
      trim: true
    },
    pdfUrl: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },

  // Organization
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  
  // Additional metadata
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  attachments: [{
    filename: String,
    ipfsHash: String,
    fileSize: Number,
    mimeType: String
  }],

  // Dispute information
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    resolvedAt: {
      type: Date
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  }
}, {
  timestamps: true,
  collection: 'invoices'
});

// Indexes for better performance
invoiceSchema.index({ invoiceId: 1 });
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'issuer.walletAddress': 1 });
invoiceSchema.index({ 'recipient.walletAddress': 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ amount: 1 });
invoiceSchema.index({ category: 1 });
invoiceSchema.index({ 'blockchain.transactionHash': 1 });

// Compound indexes
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

// Virtual for formatted amount
invoiceSchema.virtual('formattedAmount').get(function() {
  if (this.amount) {
    return parseFloat(this.amount.toString()).toFixed(4);
  }
  return '0.0000';
});

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function() {
  if (this.dueDate) {
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pending' && this.dueDate) {
    return new Date() > new Date(this.dueDate);
  }
  return false;
});

// Instance methods
invoiceSchema.methods.markAsPaid = function(transactionHash, blockNumber) {
  this.status = 'paid';
  this.paidDate = new Date();
  if (transactionHash) {
    this.blockchain.transactionHash = transactionHash;
  }
  if (blockNumber) {
    this.blockchain.blockNumber = blockNumber;
  }
  return this.save();
};

invoiceSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'overdue' && this.status === 'pending') {
    // Auto-update to overdue if past due date
  }
  return this.save();
};

// Static methods
invoiceSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.status) {
    query.where({ status: options.status });
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.sort({ createdAt: -1 });
};

invoiceSchema.statics.findOverdue = function() {
  return this.find({
    status: 'pending',
    dueDate: { $lt: new Date() }
  });
};

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  // Auto-update overdue status
  if (this.status === 'pending' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  
  // Ensure wallet addresses are lowercase
  if (this.issuer && this.issuer.walletAddress) {
    this.issuer.walletAddress = this.issuer.walletAddress.toLowerCase();
  }
  if (this.recipient && this.recipient.walletAddress) {
    this.recipient.walletAddress = this.recipient.walletAddress.toLowerCase();
  }
  
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
