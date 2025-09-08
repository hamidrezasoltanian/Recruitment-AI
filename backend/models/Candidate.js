const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const testResultSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['not_sent', 'pending', 'passed', 'failed', 'review'],
    default: 'not_sent'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: String,
  sentDate: Date,
  deadlineHours: Number,
  file: {
    name: String,
    type: String,
    url: String,
    uploadedAt: Date
  },
  aiSummary: String
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام متقاضی الزامی است'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'ایمیل الزامی است'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'لطفا ایمیل معتبر وارد کنید']
  },
  phone: {
    type: String,
    required: [true, 'شماره تلفن الزامی است'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'موقعیت شغلی الزامی است']
  },
  stage: {
    type: String,
    required: true,
    default: 'inbox'
  },
  source: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  interviewDate: String,
  interviewTime: String,
  interviewTimeChanged: {
    type: Boolean,
    default: false
  },
  history: [historyEntrySchema],
  comments: [commentSchema],
  hasResume: {
    type: Boolean,
    default: false
  },
  resumeUrl: String,
  testResults: [testResultSchema],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
candidateSchema.index({ organization: 1, stage: 1 });
candidateSchema.index({ organization: 1, createdAt: -1 });
candidateSchema.index({ organization: 1, position: 1 });
candidateSchema.index({ organization: 1, email: 1 });
candidateSchema.index({ organization: 1, isArchived: 1 });
candidateSchema.index({ '$**': 'text' }); // Text index for search

// Virtual for age calculation if birthdate is stored
candidateSchema.virtual('daysInPipeline').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to add history entry
candidateSchema.methods.addHistoryEntry = function(user, action, details) {
  this.history.push({
    user: user.name || user.username,
    action,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// Method to add comment
candidateSchema.methods.addComment = function(user, text) {
  this.comments.push({
    user: user.name || user.username,
    text,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update stage
candidateSchema.methods.updateStage = async function(newStage, user) {
  const oldStage = this.stage;
  this.stage = newStage;
  this.lastModifiedBy = user._id;
  
  await this.addHistoryEntry(user, `مرحله از "${oldStage}" به "${newStage}" تغییر کرد`);
  
  // Emit socket event for real-time update
  const io = require('../server').io;
  io.to(`org-${this.organization}`).emit('candidate:stageChanged', {
    candidateId: this._id,
    oldStage,
    newStage,
    updatedBy: user.name
  });
  
  return this;
};

// Method to archive candidate
candidateSchema.methods.archive = async function(user) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = user._id;
  this.stage = 'archived';
  
  await this.addHistoryEntry(user, 'متقاضی آرشیو شد');
  return this.save();
};

// Method to unarchive candidate
candidateSchema.methods.unarchive = async function(user) {
  this.isArchived = false;
  this.archivedAt = null;
  this.archivedBy = null;
  this.stage = 'inbox';
  
  await this.addHistoryEntry(user, 'متقاضی از آرشیو خارج شد');
  return this.save();
};

// Pre-save middleware
candidateSchema.pre('save', function(next) {
  // Ensure organization is set
  if (!this.organization) {
    return next(new Error('Organization is required'));
  }
  next();
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;