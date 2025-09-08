const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const auth = require('../middleware/auth');
const Candidate = require('../models/Candidate');
const logger = require('../utils/logger');

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads', req.organization.toString());
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    resume: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    test: ['application/pdf']
  };

  const fileType = req.baseUrl.includes('resume') ? 'resume' : 
                   req.baseUrl.includes('image') ? 'image' : 'test';

  if (allowedTypes[fileType].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`نوع فایل ${file.mimetype} مجاز نیست`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter
});

// @route   POST /api/files/resume/:candidateId
// @desc    Upload resume for candidate
// @access  Private
router.post('/resume/:candidateId', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل رزومه الزامی است'
      });
    }

    const candidate = await Candidate.findOne({
      _id: req.params.candidateId,
      organization: req.organization
    });

    if (!candidate) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'متقاضی یافت نشد'
      });
    }

    // Update candidate with resume URL
    const resumeUrl = `/uploads/${req.organization}/${req.file.filename}`;
    candidate.hasResume = true;
    candidate.resumeUrl = resumeUrl;
    await candidate.save();

    logger.info(`Resume uploaded for candidate: ${candidate.email}`);

    res.json({
      success: true,
      message: 'رزومه با موفقیت آپلود شد',
      data: { url: resumeUrl }
    });
  } catch (error) {
    logger.error('Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در آپلود رزومه'
    });
  }
});

// @route   GET /api/files/resume/:candidateId
// @desc    Download resume for candidate
// @access  Private
router.get('/resume/:candidateId', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      _id: req.params.candidateId,
      organization: req.organization
    });

    if (!candidate || !candidate.resumeUrl) {
      return res.status(404).json({
        success: false,
        message: 'رزومه یافت نشد'
      });
    }

    const filePath = path.join(__dirname, '..', candidate.resumeUrl);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'فایل رزومه یافت نشد'
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دانلود رزومه'
    });
  }
});

// @route   POST /api/files/test-result/:candidateId/:testId
// @desc    Upload test result file
// @access  Private
router.post('/test-result/:candidateId/:testId', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل نتیجه آزمون الزامی است'
      });
    }

    const candidate = await Candidate.findOne({
      _id: req.params.candidateId,
      organization: req.organization
    });

    if (!candidate) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'متقاضی یافت نشد'
      });
    }

    const fileUrl = `/uploads/${req.organization}/${req.file.filename}`;
    
    // Update test result with file info
    const testResult = candidate.testResults?.find(t => t.testId === req.params.testId);
    if (testResult) {
      testResult.file = {
        name: req.file.originalname,
        type: req.file.mimetype,
        url: fileUrl,
        uploadedAt: new Date()
      };
    } else {
      if (!candidate.testResults) candidate.testResults = [];
      candidate.testResults.push({
        testId: req.params.testId,
        status: 'review',
        file: {
          name: req.file.originalname,
          type: req.file.mimetype,
          url: fileUrl,
          uploadedAt: new Date()
        }
      });
    }

    await candidate.save();

    logger.info(`Test result uploaded for candidate: ${candidate.email}, test: ${req.params.testId}`);

    res.json({
      success: true,
      message: 'نتیجه آزمون با موفقیت آپلود شد',
      data: { url: fileUrl }
    });
  } catch (error) {
    logger.error('Upload test result error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در آپلود نتیجه آزمون'
    });
  }
});

// @route   POST /api/files/image
// @desc    Upload and optimize image (for logos, etc.)
// @access  Private (Admin only)
router.post('/image', [auth, require('../middleware/auth').isAdmin, upload.single('image')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل تصویر الزامی است'
      });
    }

    // Optimize image with sharp
    const optimizedFileName = `optimized-${req.file.filename}`;
    const optimizedPath = path.join(path.dirname(req.file.path), optimizedFileName);

    await sharp(req.file.path)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);

    // Delete original file
    await fs.unlink(req.file.path);

    const imageUrl = `/uploads/${req.organization}/${optimizedFileName}`;

    logger.info(`Image uploaded and optimized: ${imageUrl}`);

    res.json({
      success: true,
      message: 'تصویر با موفقیت آپلود شد',
      data: { url: imageUrl }
    });
  } catch (error) {
    logger.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در آپلود تصویر'
    });
  }
});

// @route   DELETE /api/files/:type/:candidateId
// @desc    Delete file
// @access  Private
router.delete('/:type/:candidateId', auth, async (req, res) => {
  try {
    const { type, candidateId } = req.params;
    
    const candidate = await Candidate.findOne({
      _id: candidateId,
      organization: req.organization
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'متقاضی یافت نشد'
      });
    }

    if (type === 'resume' && candidate.resumeUrl) {
      const filePath = path.join(__dirname, '..', candidate.resumeUrl);
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete file: ${filePath}`);
      }
      
      candidate.hasResume = false;
      candidate.resumeUrl = null;
      await candidate.save();
      
      logger.info(`Resume deleted for candidate: ${candidate.email}`);
    }

    res.json({
      success: true,
      message: 'فایل حذف شد'
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف فایل'
    });
  }
});

module.exports = router;