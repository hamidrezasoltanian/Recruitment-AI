const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های PDF مجاز هستند'));
    }
  }
});

// Initialize Gemini AI
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('کلید API برای Gemini تنظیم نشده است');
  }
  return new GoogleGenAI({ apiKey });
};

// @route   POST /api/ai/parse-resume
// @desc    Parse resume using AI
// @access  Private
router.post('/parse-resume', [auth, upload.single('resume')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل رزومه الزامی است'
      });
    }

    const ai = getAI();
    
    // Convert file buffer to base64
    const base64Data = req.file.buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          { 
            text: 'Extract the full name, email address, and phone number from this resume. Return the output in JSON format with keys: name, email, phone. If any field is not found, use empty string.' 
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text.trim());
    
    logger.info('Resume parsed successfully');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Parse resume error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تحلیل رزومه'
    });
  }
});

// @route   POST /api/ai/summarize-test
// @desc    Summarize test result using AI
// @access  Private
router.post('/summarize-test', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل نتیجه آزمون الزامی است'
      });
    }

    const ai = getAI();
    
    // Convert file buffer to base64
    const base64Data = req.file.buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          { 
            text: 'این یک فایل نتیجه آزمون روانشناسی یا مهارتی است. یافته‌های کلیدی، ویژگی‌های شخصیتی، و نمرات مهم را در چند مورد کوتاه و مختصر به زبان فارسی خلاصه کن.' 
          }
        ]
      }
    });

    const summary = response.text;
    
    logger.info('Test result summarized successfully');

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    logger.error('Summarize test error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در خلاصه‌سازی نتیجه آزمون'
    });
  }
});

// @route   POST /api/ai/generate-template
// @desc    Generate email/message template using AI
// @access  Private
router.post('/generate-template', auth, async (req, res) => {
  try {
    const { prompt, type = 'email' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'درخواست برای تولید قالب الزامی است'
      });
    }

    const ai = getAI();
    
    const systemPrompt = `You are an expert HR assistant. Generate a professional ${type} template in Persian for recruitment communication. Use placeholders like {{candidateName}}, {{position}}, {{interviewDate}}, {{interviewTime}}, {{companyName}}, {{companyAddress}}, {{companyWebsite}}, {{stageName}} where appropriate. Keep the tone professional yet friendly.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const content = response.text;
    
    logger.info(`Template generated for type: ${type}`);

    res.json({
      success: true,
      data: { content, type }
    });
  } catch (error) {
    logger.error('Generate template error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تولید قالب'
    });
  }
});

// @route   POST /api/ai/insights
// @desc    Get AI insights about candidates
// @access  Private
router.post('/insights', auth, async (req, res) => {
  try {
    const { question, candidatesData } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'سوال الزامی است'
      });
    }

    const ai = getAI();
    
    const prompt = `بر اساس لیست متقاضیان شغلی زیر (در فرمت JSON)، لطفاً به سوال کاربر پاسخ دهید.
    داده‌های متقاضیان: ${JSON.stringify(candidatesData, null, 2)}
    
    سوال کاربر: "${question}"
    
    تحلیل خود را به زبان فارسی ارائه دهید.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'شما یک تحلیلگر ارشد منابع انسانی هستید. وظیفه شما تحلیل داده‌های متقاضیان و ارائه پاسخ‌های هوشمندانه و داده‌محور به سوالات مربوط به فرآیند استخدام است.'
      }
    });

    const insights = response.text;
    
    logger.info('AI insights generated');

    res.json({
      success: true,
      data: { insights }
    });
  } catch (error) {
    logger.error('Generate insights error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تولید تحلیل'
    });
  }
});

module.exports = router;