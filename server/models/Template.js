const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['services', 'products', 'consulting', 'development', 'design', 'other'],
    default: 'other'
  },
  
  // Template fields with default values
  fields: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    },
    currency: {
      type: String,
      enum: ['ETH', 'USD', 'EUR', 'GBP', 'USDC', 'DAI'],
      default: 'ETH'
    },
    daysUntilDue: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    },
    issuerInfo: {
      name: {
        type: String,
        default: ''
      },
      email: {
        type: String,
        default: ''
      },
      company: {
        type: String,
        default: ''
      }
    },
    terms: {
      type: String,
      default: 'Payment due within specified timeframe.',
      maxlength: 1000
    },
    notes: {
      type: String,
      default: '',
      maxlength: 500
    }
  },
  
  // Usage tracking
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    }
  },
  
  // Sharing settings
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    allowCopy: {
      type: Boolean,
      default: true
    }
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'templates'
});

// Indexes
templateSchema.index({ userId: 1 });
templateSchema.index({ category: 1 });
templateSchema.index({ 'sharing.isPublic': 1 });
templateSchema.index({ 'sharing.isDefault': 1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ 'usage.timesUsed': -1 });
templateSchema.index({ 'usage.lastUsed': -1 });

// Compound indexes
templateSchema.index({ userId: 1, category: 1 });
templateSchema.index({ userId: 1, 'sharing.isDefault': 1 });

// Virtual for formatted amount
templateSchema.virtual('formattedAmount').get(function() {
  if (this.fields && this.fields.amount) {
    return parseFloat(this.fields.amount.toString()).toFixed(4);
  }
  return '0.0000';
});

// Instance methods
templateSchema.methods.incrementUsage = function() {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

templateSchema.methods.setAsDefault = async function() {
  // Remove default status from other templates by this user
  await this.constructor.updateMany(
    { 
      userId: this.userId, 
      _id: { $ne: this._id } 
    },
    { 
      $set: { 'sharing.isDefault': false } 
    }
  );
  
  // Set this template as default
  this.sharing.isDefault = true;
  return this.save();
};

// Static methods
templateSchema.statics.findByUser = function(userId, includePublic = false) {
  const query = includePublic 
    ? this.find({
        $or: [
          { userId: userId },
          { 'sharing.isPublic': true }
        ]
      })
    : this.find({ userId: userId });
    
  return query.where({ isActive: true }).sort({ 'usage.timesUsed': -1, createdAt: -1 });
};

templateSchema.statics.findPublicTemplates = function(category = null) {
  const query = this.find({ 
    'sharing.isPublic': true, 
    isActive: true 
  });
  
  if (category) {
    query.where({ category: category });
  }
  
  return query.sort({ 'usage.timesUsed': -1, createdAt: -1 });
};

templateSchema.statics.findDefaultTemplate = function(userId) {
  return this.findOne({ 
    userId: userId, 
    'sharing.isDefault': true, 
    isActive: true 
  });
};

templateSchema.statics.getPopularTemplates = function(limit = 10) {
  return this.find({ 
    'sharing.isPublic': true, 
    isActive: true 
  })
  .sort({ 'usage.timesUsed': -1, createdAt: -1 })
  .limit(limit);
};

// Pre-save middleware
templateSchema.pre('save', function(next) {
  // Ensure only one default template per user
  if (this.sharing.isDefault && this.isModified('sharing.isDefault')) {
    this.constructor.updateMany(
      { 
        userId: this.userId, 
        _id: { $ne: this._id },
        'sharing.isDefault': true 
      },
      { 
        $set: { 'sharing.isDefault': false } 
      }
    ).exec();
  }
  
  next();
});

module.exports = mongoose.model('Template', templateSchema);
