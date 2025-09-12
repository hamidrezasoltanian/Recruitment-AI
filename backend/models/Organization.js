const mongoose = require('mongoose');

const jobPositionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  department: String,
  isActive: {
    type: Boolean,
    default: true
  }
});

const stageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  isCore: {
    type: Boolean,
    default: false
  },
  color: String,
  order: {
    type: Number,
    default: 0
  }
});

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام سازمان الزامی است'],
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: String,
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'لطفا ایمیل معتبر وارد کنید']
  },
  logo: String,
  jobPositions: [jobPositionSchema],
  stages: {
    type: [stageSchema],
    default: [
      { id: 'inbox', title: 'صندوق ورودی', isCore: true, order: 0 },
      { id: 'screening', title: 'غربالگری', isCore: true, order: 1 },
      { id: 'interview-1', title: 'مصاحبه اول', isCore: true, order: 2 },
      { id: 'interview-2', title: 'مصاحبه دوم', isCore: false, order: 3 },
      { id: 'offer', title: 'ارائه پیشنهاد', isCore: true, order: 4 },
      { id: 'hired', title: 'استخدام شده', isCore: true, order: 5 },
      { id: 'rejected', title: 'رد شده', isCore: true, order: 6 },
      { id: 'archived', title: 'آرشیو', isCore: true, order: 7 }
    ]
  },
  sources: {
    type: [String],
    default: ['سایت شرکت', 'LinkedIn', 'JobVision', 'معرفی شده', 'دانشگاه', 'نمایشگاه شغلی', 'سایر']
  },
  testLibrary: [{
    name: String,
    url: String,
    description: String,
    category: String
  }],
  settings: {
    primaryColor: {
      type: String,
      default: 'indigo'
    },
    backgroundImage: String,
    emailSettings: {
      host: String,
      port: Number,
      secure: Boolean,
      user: String,
      pass: String
    },
    whatsappSettings: {
      apiUrl: String,
      apiKey: String,
      phoneNumber: String
    },
    aiSettings: {
      geminiApiKey: String,
      enableAiFeatures: {
        type: Boolean,
        default: true
      }
    },
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      },
      inAppNotifications: {
        type: Boolean,
        default: true
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    maxUsers: {
      type: Number,
      default: 5
    },
    maxCandidates: {
      type: Number,
      default: 100
    },
    features: [String]
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ name: 1 });
organizationSchema.index({ owner: 1 });

// Virtual for candidate count
organizationSchema.virtual('candidateCount', {
  ref: 'Candidate',
  localField: '_id',
  foreignField: 'organization',
  count: true
});

// Virtual for user count
organizationSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organization',
  count: true
});

// Method to add job position
organizationSchema.methods.addJobPosition = function(title, department) {
  this.jobPositions.push({ title, department });
  return this.save();
};

// Method to add custom stage
organizationSchema.methods.addStage = function(stage) {
  const maxOrder = Math.max(...this.stages.map(s => s.order));
  stage.order = maxOrder + 1;
  this.stages.push(stage);
  return this.save();
};

// Method to reorder stages
organizationSchema.methods.reorderStages = function(stageIds) {
  const reorderedStages = [];
  stageIds.forEach((id, index) => {
    const stage = this.stages.find(s => s.id === id);
    if (stage) {
      stage.order = index;
      reorderedStages.push(stage);
    }
  });
  this.stages = reorderedStages;
  return this.save();
};

// Method to check subscription limits
organizationSchema.methods.canAddUser = async function() {
  const User = mongoose.model('User');
  const userCount = await User.countDocuments({ organization: this._id });
  return userCount < this.subscription.maxUsers;
};

organizationSchema.methods.canAddCandidate = async function() {
  const Candidate = mongoose.model('Candidate');
  const candidateCount = await Candidate.countDocuments({ organization: this._id });
  return candidateCount < this.subscription.maxCandidates;
};

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;