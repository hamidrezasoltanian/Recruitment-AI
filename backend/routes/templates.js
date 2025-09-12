const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Template Schema
const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'whatsapp', 'sms'],
    required: true
  },
  stageId: String,
  variables: [String],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Template = mongoose.model('Template', templateSchema);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

// @route   GET /api/templates
// @desc    Get all templates
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const templates = await Template.find({ 
      organization: req.organization 
    }).populate('createdBy', 'name');

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت قالب‌ها' 
    });
  }
});

// @route   GET /api/templates/:id
// @desc    Get single template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organization
    }).populate('createdBy', 'name');

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'قالب یافت نشد' 
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت قالب' 
    });
  }
});

// @route   POST /api/templates
// @desc    Create new template
// @access  Private (Admin only)
router.post('/', [
  auth,
  require('../middleware/auth').isAdmin,
  body('name').notEmpty().withMessage('نام قالب الزامی است'),
  body('content').notEmpty().withMessage('محتوای قالب الزامی است'),
  body('type').isIn(['email', 'whatsapp', 'sms']).withMessage('نوع قالب نامعتبر است'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Extract variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(req.body.content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    const template = new Template({
      ...req.body,
      variables,
      organization: req.organization,
      createdBy: req.user._id
    });

    await template.save();

    logger.info(`New template created: ${template.name}`);

    res.status(201).json({
      success: true,
      message: 'قالب با موفقیت ایجاد شد',
      data: template
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در ایجاد قالب' 
    });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  require('../middleware/auth').isAdmin,
  handleValidationErrors
], async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'قالب یافت نشد' 
      });
    }

    // Update fields
    if (req.body.name) template.name = req.body.name;
    if (req.body.content) {
      template.content = req.body.content;
      
      // Re-extract variables
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables = [];
      let match;
      
      while ((match = variableRegex.exec(req.body.content)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
      
      template.variables = variables;
    }
    if (req.body.type) template.type = req.body.type;
    if (req.body.stageId !== undefined) template.stageId = req.body.stageId;

    await template.save();

    res.json({
      success: true,
      message: 'قالب با موفقیت به‌روزرسانی شد',
      data: template
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در به‌روزرسانی قالب' 
    });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template
// @access  Private (Admin only)
router.delete('/:id', [auth, require('../middleware/auth').isAdmin], async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'قالب یافت نشد' 
      });
    }

    logger.info(`Template deleted: ${template.name}`);

    res.json({
      success: true,
      message: 'قالب حذف شد'
    });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در حذف قالب' 
    });
  }
});

// @route   POST /api/templates/:id/render
// @desc    Render template with variables
// @access  Private
router.post('/:id/render', [
  auth,
  body('variables').isObject().withMessage('متغیرها باید به صورت شیء باشند'),
  handleValidationErrors
], async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organization
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'قالب یافت نشد' 
      });
    }

    let renderedContent = template.content;
    
    // Replace variables
    Object.keys(req.body.variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, req.body.variables[key]);
    });

    res.json({
      success: true,
      data: {
        content: renderedContent,
        type: template.type
      }
    });
  } catch (error) {
    logger.error('Render template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در پردازش قالب' 
    });
  }
});

module.exports = router;