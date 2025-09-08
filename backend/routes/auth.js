const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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

// @route   POST /api/auth/register
// @desc    Register organization and admin user
// @access  Public
router.post('/register', [
  body('organizationName').notEmpty().withMessage('نام سازمان الزامی است'),
  body('name').notEmpty().withMessage('نام و نام خانوادگی الزامی است'),
  body('username').isLength({ min: 3 }).withMessage('نام کاربری باید حداقل 3 کاراکتر باشد'),
  body('email').isEmail().withMessage('ایمیل معتبر وارد کنید'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { organizationName, name, username, email, password, website, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username: username.toLowerCase() }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'کاربری با این ایمیل یا نام کاربری قبلاً ثبت شده است' 
      });
    }

    // Create organization
    const organization = new Organization({
      name: organizationName,
      website,
      address,
      email,
      owner: null // Will be updated after user creation
    });

    await organization.save();

    // Create admin user
    const user = new User({
      username: username.toLowerCase(),
      name,
      email,
      password,
      role: 'admin',
      isAdmin: true,
      organization: organization._id
    });

    await user.save();

    // Update organization owner
    organization.owner = user._id;
    await organization.save();

    // Generate token
    const token = user.generateAuthToken();

    logger.info(`New organization registered: ${organizationName} by ${email}`);

    res.status(201).json({
      success: true,
      message: 'ثبت نام با موفقیت انجام شد',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.isAdmin
        },
        organization: {
          id: organization._id,
          name: organization.name
        }
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در ثبت نام. لطفاً دوباره تلاش کنید.' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('نام کاربری الزامی است'),
  body('password').notEmpty().withMessage('رمز عبور الزامی است'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    }).select('+password').populate('organization', 'name');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'نام کاربری یا رمز عبور اشتباه است' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        success: false, 
        message: 'حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد قفل شده است. لطفاً بعداً تلاش کنید.' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'حساب کاربری شما غیرفعال است. با مدیر سیستم تماس بگیرید.' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ 
        success: false, 
        message: 'نام کاربری یا رمز عبور اشتباه است' 
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token
    const token = user.generateAuthToken();

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'ورود موفقیت‌آمیز',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.isAdmin
        },
        organization: {
          id: user.organization._id,
          name: user.organization.name
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در ورود. لطفاً دوباره تلاش کنید.' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('organization', 'name website settings');

    res.json({
      success: true,
      data: {
        user,
        organization: user.organization
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در دریافت اطلاعات کاربر' 
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('رمز عبور فعلی الزامی است'),
  body('newPassword').isLength({ min: 6 }).withMessage('رمز عبور جدید باید حداقل 6 کاراکتر باشد'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'رمز عبور فعلی اشتباه است' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در تغییر رمز عبور' 
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (mainly for logging purposes)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'با موفقیت خارج شدید'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'خطا در خروج' 
    });
  }
});

module.exports = router;