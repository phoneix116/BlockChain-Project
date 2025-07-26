const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true // Allows multiple null values
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    defaultCurrency: {
      type: String,
      enum: ['ETH', 'USD', 'EUR', 'GBP'],
      default: 'ETH'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  stats: {
    totalInvoices: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    },
    totalPaid: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'users'
});

// Indexes for better performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.name && this.company) {
    return `${this.name} (${this.company})`;
  }
  return this.name || this.company || 'Anonymous User';
});

// Instance method to update last active
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

// Static method to find by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// Pre-save middleware to update stats
userSchema.pre('save', function(next) {
  if (this.isModified('walletAddress')) {
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
