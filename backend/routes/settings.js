const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

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

// @route   GET /api/settings
// @desc    Get organization settings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization)
      .select('-owner -createdAt -updatedAt');

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    res.json({
      success: true,
      data: {
        name: organization.name,
        website: organization.website,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        logo: organization.logo,
        jobPositions: organization.jobPositions,
        stages: organization.stages,
        sources: organization.sources,
        testLibrary: organization.testLibrary,
        settings: organization.settings,
        subscription: organization.subscription
      }
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت تنظیمات' 
    });
  }
});

// @route   PUT /api/settings
// @desc    Update organization settings
// @access  Private (Admin only)
router.put('/', [auth, require('../middleware/auth').isAdmin], async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization);

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'website', 'address', 'phone', 'email', 'logo',
      'jobPositions', 'sources', 'testLibrary', 'settings'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        organization[field] = req.body[field];
      }
    });

    await organization.save();

    logger.info(`Organization settings updated: ${organization.name}`);

    res.json({
      success: true,
      message: 'تنظیمات با موفقیت به‌روزرسانی شد',
      data: organization
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در به‌روزرسانی تنظیمات' 
    });
  }
});

// @route   POST /api/settings/stages
// @desc    Add new stage
// @access  Private (Admin only)
router.post('/stages', [
  auth, 
  require('../middleware/auth').isAdmin,
  body('id').notEmpty().withMessage('شناسه مرحله الزامی است'),
  body('title').notEmpty().withMessage('عنوان مرحله الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization);

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    // Check if stage ID already exists
    if (organization.stages.some(s => s.id === req.body.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'مرحله با این شناسه قبلاً وجود دارد' 
      });
    }

    await organization.addStage({
      id: req.body.id,
      title: req.body.title,
      color: req.body.color,
      isCore: false
    });

    res.json({
      success: true,
      message: 'مرحله جدید اضافه شد',
      data: organization.stages
    });
  } catch (error) {
    logger.error('Add stage error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در افزودن مرحله' 
    });
  }
});

// @route   PUT /api/settings/stages/:id
// @desc    Update stage
// @access  Private (Admin only)
router.put('/stages/:id', [auth, require('../middleware/auth').isAdmin], async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization);

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    const stage = organization.stages.find(s => s.id === req.params.id);
    
    if (!stage) {
      return res.status(404).json({ 
        success: false, 
        message: 'مرحله یافت نشد' 
      });
    }

    // Don't allow editing core stages
    if (stage.isCore) {
      return res.status(403).json({ 
        success: false, 
        message: 'مراحل اصلی قابل ویرایش نیستند' 
      });
    }

    // Update stage fields
    if (req.body.title) stage.title = req.body.title;
    if (req.body.color) stage.color = req.body.color;

    await organization.save();

    res.json({
      success: true,
      message: 'مرحله به‌روزرسانی شد',
      data: organization.stages
    });
  } catch (error) {
    logger.error('Update stage error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در به‌روزرسانی مرحله' 
    });
  }
});

// @route   DELETE /api/settings/stages/:id
// @desc    Delete stage
// @access  Private (Admin only)
router.delete('/stages/:id', [auth, require('../middleware/auth').isAdmin], async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization);

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    const stage = organization.stages.find(s => s.id === req.params.id);
    
    if (!stage) {
      return res.status(404).json({ 
        success: false, 
        message: 'مرحله یافت نشد' 
      });
    }

    // Don't allow deleting core stages
    if (stage.isCore) {
      return res.status(403).json({ 
        success: false, 
        message: 'مراحل اصلی قابل حذف نیستند' 
      });
    }

    // Check if any candidates are in this stage
    const Candidate = require('../models/Candidate');
    const candidatesInStage = await Candidate.countDocuments({
      organization: req.organization,
      stage: req.params.id
    });

    if (candidatesInStage > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `${candidatesInStage} متقاضی در این مرحله وجود دارد. ابتدا آنها را به مرحله دیگری منتقل کنید.` 
      });
    }

    // Remove stage
    organization.stages = organization.stages.filter(s => s.id !== req.params.id);
    await organization.save();

    res.json({
      success: true,
      message: 'مرحله حذف شد',
      data: organization.stages
    });
  } catch (error) {
    logger.error('Delete stage error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در حذف مرحله' 
    });
  }
});

// @route   PUT /api/settings/stages/reorder
// @desc    Reorder stages
// @access  Private (Admin only)
router.put('/stages/reorder', [
  auth, 
  require('../middleware/auth').isAdmin,
  body('stageIds').isArray().withMessage('لیست شناسه مراحل الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    const organization = await Organization.findById(req.organization);

    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'سازمان یافت نشد' 
      });
    }

    await organization.reorderStages(req.body.stageIds);

    res.json({
      success: true,
      message: 'ترتیب مراحل به‌روزرسانی شد',
      data: organization.stages
    });
  } catch (error) {
    logger.error('Reorder stages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در تغییر ترتیب مراحل' 
    });
  }
});

module.exports = router;