import { GoogleGenAI, Type } from "@google/genai";
import { Candidate } from "../types";

// As requested for debugging, logging the API key passed during the build process.
// Note: Using process.env.API_KEY as defined in your build.js script.
console.log("API_KEY from build environment:", process.env.API_KEY);

// Helper to convert a File object to the format Google AI API expects
const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { mimeType: string, data: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('Failed to read file as data URL.'));
      }
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      });
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};

// Helper function to check API key availability safely across the app
export const isApiKeySet = (): boolean => {
    try {
        // The build process replaces process.env.API_KEY.
        // If it's not replaced or is an empty string, the key is not set.
        return !!process.env.API_KEY;
    } catch (e) {
        // process.env is not defined in environments without a build step
        return false;
    }
}

const getAiInstance = () => {
    if (!isApiKeySet()) {
        throw new Error('کلید API برای Gemini تنظیم نشده است. لطفا از طریق تنظیمات برنامه، آن را بررسی کنید.');
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const aiService = {
  async parseResume(file: File): Promise<{name: string, email: string, phone: string}> {
    if (file.type !== 'application/pdf') {
        throw new Error('فقط فایل‌های PDF برای تحلیل رزومه پشتیبانی می‌شوند.');
    }
    
    try {
        const filePart = await fileToGenerativePart(file);
        const ai = getAiInstance();
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    filePart,
                    { text: 'نام کامل، آدرس ایمیل و شماره تلفن را از این رزومه استخراج کن. خروجی را در قالب JSON ارائه بده.' }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "نام کامل متقاضی" },
                        email: { type: Type.STRING, description: "آدرس ایمیل متقاضی" },
                        phone: { type: Type.STRING, description: "شماره تلفن متقاضی" },
                    }
                }
            }
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);

    } catch(error) {
        console.error("Error parsing resume with AI:", error);
        throw new Error('خطا در تحلیل رزومه با هوش مصنوعی. لطفاً از اتصال اینترنت و معتبر بودن کلید API اطمینان حاصل کنید.');
    }
  },

  async summarizeTestResult(file: File): Promise<string> {
    if (file.type !== 'application/pdf') {
        throw new Error('فقط فایل‌های PDF برای خلاصه‌سازی پشتیبانی می‌شوند.');
    }

    try {
        const filePart = await fileToGenerativePart(file);
        const ai = getAiInstance();
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    filePart,
                    { text: 'این یک فایل نتیجه آزمون روانشناسی یا مهارتی است. یافته‌های کلیدی، ویژگی‌های شخصیتی، و نمرات مهم را در چند مورد کوتاه و مختصر به زبان فارسی خلاصه کن.' }
                ]
            }
        });
        
        const text = response.text;
        if (!text) {
          throw new Error('پاسخ معتبری از سرویس هوش مصنوعی دریافت نشد.');
        }
        return text;

    } catch(error) {
        console.error("Error summarizing test result with AI:", error);
        throw new Error('خطا در خلاصه‌سازی نتیجه آزمون. لطفاً اتصال اینترنت و کلید API خود را بررسی کنید.');
    }
  },

  async summarizeTestLink(testName: string, testUrl: string): Promise<string> {
    try {
        const ai = getAiInstance();
        
        const prompt = `Based on the name and URL of the following psychological or skills test, provide a brief summary in Persian of what this test measures and its general purpose.
        IMPORTANT: Do not attempt to access the URL. Use your general knowledge. Start the response by acknowledging that you are analyzing the link's title, not its live content.
        Test Name: "${testName}"
        URL: "${testUrl}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        if (!text) {
          throw new Error('پاسخ معتبری از سرویس هوش مصنوعی دریافت نشد.');
        }
        return text;

    } catch(error) {
        console.error("Error summarizing test link with AI:", error);
        throw new Error('خطا در تحلیل لینک آزمون. لطفاً اتصال اینترنت و کلید API خود را بررسی کنید.');
    }
  },

  async getInsightsStream(candidates: Candidate[], question: string) {
    const simplifiedCandidates = candidates.map(c => ({
        id: c.id,
        position: c.position,
        stage: c.stage,
        rating: c.rating,
        source: c.source,
    }));
    
    const prompt = `بر اساس لیست متقاضیان شغلی زیر (در فرمت JSON)، لطفاً به سوال کاربر پاسخ دهید.
    داده‌های متقاضیان: ${JSON.stringify(simplifiedCandidates, null, 2)}
    
    سوال کاربر: "${question}"
    
    تحلیل خود را به زبان فارسی ارائه دهید.`;
    
    try {
        const ai = getAiInstance();
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: 'شما یک تحلیلگر ارشد منابع انسانی هستید. وظیفه شما تحلیل داده‌های متقاضیان و ارائه پاسخ‌های هوشمندانه و داده‌محور به سوالات مربوط به فرآیند استخدام است.'
            }
        });
        
        return responseStream;

    } catch(error) {
        console.error("Error getting insights with AI:", error);
        throw new Error('خطا در دریافت تحلیل از هوش مصنوعی. لطفاً اتصال اینترنت و کلید API خود را بررسی کنید.');
    }
  },

  async generateTemplateContent(prompt: string): Promise<string> {
    try {
      const ai = getAiInstance();
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an expert HR assistant. Your task is to generate professional and friendly communication templates (emails or WhatsApp messages) for a recruitment process. The language must be Persian. Keep the tone appropriate for communicating with candidates. Use placeholders like {{candidateName}}, {{position}}, {{interviewDate}}, {{interviewTime}}, {{companyName}}, {{companyAddress}}, {{companyWebsite}}, {{stageName}} where appropriate.',
        }
      });
      
      const text = response.text;
      if (!text) {
          throw new Error('پاسخی از سرویس هوش مصنوعی دریافت نشد.');
      }

      return text;

    } catch (error) {
      console.error("Error generating content with AI:", error);
      // Provide a user-friendly error message
      if (error instanceof Error) {
        throw new Error(`خطا در ارتباط با سرویس هوش مصنوعی: ${error.message}`);
      }
      throw new Error('خطا در ارتباط با سرویس هوش مصنوعی. لطفاً از فعال بودن کلید API و اتصال اینترنت اطمینان حاصل کنید.');
    }
  },
};