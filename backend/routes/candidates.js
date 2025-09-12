const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Candidate = require('../models/Candidate');
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

// @route   GET /api/candidates
// @desc    Get all candidates for organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      stage, 
      position, 
      source, 
      search, 
      sortBy = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 50,
      archived = false
    } = req.query;

    // Build query
    const queryObj = { 
      organization: req.organization,
      isArchived: archived === 'true'
    };

    if (stage) queryObj.stage = stage;
    if (position) queryObj.position = position;
    if (source) queryObj.source = source;
    
    // Search in name, email, phone
    if (search) {
      queryObj.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const candidates = await Candidate
      .find(queryObj)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name')
      .populate('lastModifiedBy', 'name');

    // Get total count for pagination
    const total = await Candidate.countDocuments(queryObj);

    res.json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get candidates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت لیست متقاضیان' 
    });
  }
});

// @route   GET /api/candidates/:id
// @desc    Get single candidate
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const candidate = await Candidate
      .findOne({ 
        _id: req.params.id, 
        organization: req.organization 
      })
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    logger.error('Get candidate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت اطلاعات متقاضی' 
    });
  }
});

// @route   POST /api/candidates
// @desc    Create new candidate
// @access  Private
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('نام متقاضی الزامی است'),
  body('email').isEmail().withMessage('ایمیل معتبر وارد کنید'),
  body('phone').notEmpty().withMessage('شماره تلفن الزامی است'),
  body('position').notEmpty().withMessage('موقعیت شغلی الزامی است'),
  body('source').notEmpty().withMessage('منبع الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Check organization limits
    const organization = await Organization.findById(req.organization);
    const canAdd = await organization.canAddCandidate();
    
    if (!canAdd) {
      return res.status(403).json({ 
        success: false, 
        message: 'محدودیت تعداد متقاضیان. لطفاً پلن خود را ارتقا دهید.' 
      });
    }

    // Check for duplicate email in organization
    const existingCandidate = await Candidate.findOne({
      email: req.body.email,
      organization: req.organization
    });

    if (existingCandidate) {
      return res.status(400).json({ 
        success: false, 
        message: 'متقاضی با این ایمیل قبلاً ثبت شده است' 
      });
    }

    // Create candidate
    const candidate = new Candidate({
      ...req.body,
      organization: req.organization,
      createdBy: req.user._id,
      history: [{
        user: req.user.name,
        action: 'متقاضی ایجاد شد',
        timestamp: new Date()
      }]
    });

    await candidate.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.to(`org-${req.organization}`).emit('candidate:created', {
      candidate,
      createdBy: req.user.name
    });

    logger.info(`New candidate created: ${candidate.email} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'متقاضی با موفقیت اضافه شد',
      data: candidate
    });
  } catch (error) {
    logger.error('Create candidate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در ایجاد متقاضی' 
    });
  }
});

// @route   PUT /api/candidates/:id
// @desc    Update candidate
// @access  Private
router.put('/:id', [
  auth,
  body('email').optional().isEmail().withMessage('ایمیل معتبر وارد کنید'),
  handleValidationErrors
], async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ 
      _id: req.params.id, 
      organization: req.organization 
    });

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'history' && key !== 'comments' && key !== '_id' && key !== 'organization') {
        candidate[key] = req.body[key];
      }
    });

    candidate.lastModifiedBy = req.user._id;
    
    // Add history entry
    candidate.history.push({
      user: req.user.name,
      action: 'اطلاعات ویرایش شد',
      timestamp: new Date()
    });

    await candidate.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`org-${req.organization}`).emit('candidate:updated', {
      candidateId: candidate._id,
      updatedBy: req.user.name
    });

    res.json({
      success: true,
      message: 'اطلاعات با موفقیت به‌روزرسانی شد',
      data: candidate
    });
  } catch (error) {
    logger.error('Update candidate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در به‌روزرسانی متقاضی' 
    });
  }
});

// @route   PUT /api/candidates/:id/stage
// @desc    Update candidate stage
// @access  Private
router.put('/:id/stage', [
  auth,
  body('stage').notEmpty().withMessage('مرحله جدید الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ 
      _id: req.params.id, 
      organization: req.organization 
    });

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    const oldStage = candidate.stage;
    await candidate.updateStage(req.body.stage, req.user);

    res.json({
      success: true,
      message: `مرحله از "${oldStage}" به "${req.body.stage}" تغییر کرد`,
      data: candidate
    });
  } catch (error) {
    logger.error('Update stage error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در تغییر مرحله' 
    });
  }
});

// @route   POST /api/candidates/:id/comments
// @desc    Add comment to candidate
// @access  Private
router.post('/:id/comments', [
  auth,
  body('text').notEmpty().withMessage('متن یادداشت الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ 
      _id: req.params.id, 
      organization: req.organization 
    });

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    await candidate.addComment(req.user, req.body.text);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`org-${req.organization}`).emit('candidate:commentAdded', {
      candidateId: candidate._id,
      comment: candidate.comments[candidate.comments.length - 1],
      addedBy: req.user.name
    });

    res.json({
      success: true,
      message: 'یادداشت اضافه شد',
      data: candidate
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در افزودن یادداشت' 
    });
  }
});

// @route   DELETE /api/candidates/:id
// @desc    Delete candidate
// @access  Private (Admin only)
router.delete('/:id', [auth, require('../middleware/auth').isAdmin], async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndDelete({ 
      _id: req.params.id, 
      organization: req.organization 
    });

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`org-${req.organization}`).emit('candidate:deleted', {
      candidateId: req.params.id,
      deletedBy: req.user.name
    });

    logger.info(`Candidate deleted: ${candidate.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'متقاضی حذف شد'
    });
  } catch (error) {
    logger.error('Delete candidate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در حذف متقاضی' 
    });
  }
});

// @route   PUT /api/candidates/:id/archive
// @desc    Archive/Unarchive candidate
// @access  Private
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ 
      _id: req.params.id, 
      organization: req.organization 
    });

    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'متقاضی یافت نشد' 
      });
    }

    if (candidate.isArchived) {
      await candidate.unarchive(req.user);
      res.json({
        success: true,
        message: 'متقاضی از آرشیو خارج شد',
        data: candidate
      });
    } else {
      await candidate.archive(req.user);
      res.json({
        success: true,
        message: 'متقاضی آرشیو شد',
        data: candidate
      });
    }
  } catch (error) {
    logger.error('Archive candidate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در آرشیو کردن متقاضی' 
    });
  }
});

module.exports = router;