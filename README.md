# داشبورد استخدام - نسخه لایو

یک سیستم جامع مدیریت فرآیند استخدام با پایگاه داده سرور و قابلیت دسترسی از کل شبکه.

## ✨ ویژگی‌های جدید نسخه 2.0

- 🌐 **معماری Client-Server**: دیتابیس متمرکز روی سرور با MongoDB
- 🔄 **Real-time Updates**: به‌روزرسانی لحظه‌ای با WebSocket
- 👥 **Multi-user Support**: پشتیبانی از چندین کاربر همزمان
- 🔒 **احراز هویت JWT**: سیستم امنیتی پیشرفته
- 📊 **Performance Optimizations**: بهینه‌سازی‌های عملکرد
- 🐳 **Docker Support**: آماده برای deployment با Docker
- 📱 **PWA Support**: قابلیت نصب به عنوان اپلیکیشن

## 🚀 راه‌اندازی سریع

### پیش‌نیازها

- Node.js v18+ 
- MongoDB v6+
- npm یا yarn

### نصب و اجرا - روش استاندارد

1. **کلون کردن پروژه**
```bash
git clone <repository-url>
cd recruitment-dashboard
```

2. **نصب وابستگی‌ها**
```bash
npm run install:all
```

3. **تنظیمات محیطی Backend**
```bash
cd backend
cp .env.example .env
# ویرایش فایل .env و تنظیم مقادیر
```

4. **اجرای MongoDB**
```bash
# اگر MongoDB نصب است:
mongod

# یا با Docker:
docker run -d -p 27017:27017 --name mongodb mongo:7
```

5. **اجرای برنامه در حالت توسعه**
```bash
npm start
```

برنامه در آدرس‌های زیر در دسترس خواهد بود:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

### نصب و اجرا - با Docker

1. **تنظیم environment variables**
```bash
cp .env.example .env
# ویرایش .env
```

2. **اجرا با Docker Compose**
```bash
docker-compose up -d
```

برنامه در آدرس http://localhost در دسترس خواهد بود.

## 📁 ساختار پروژه

```
recruitment-dashboard/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── services/          # API services
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utility functions
├── backend/               # Backend Node.js server
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── utils/             # Server utilities
│   └── server.js          # Main server file
├── docker-compose.yml     # Docker orchestration
├── Dockerfile            # Frontend Docker config
├── nginx.conf            # Nginx configuration
└── vite.config.ts        # Vite configuration
```

## 🔧 تنظیمات محیطی

### Backend Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/recruitment_dashboard

# Security
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d

# CORS
CLIENT_URL=http://localhost:3000

# AI Integration
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

## 🛠️ دستورات مفید

```bash
# Development
npm start              # اجرای همزمان frontend و backend
npm run dev           # اجرای frontend
npm run backend       # اجرای backend

# Production
npm run build         # build کردن frontend
npm run preview       # preview production build
npm run start:prod    # اجرای production

# Testing
npm test              # اجرای تست‌ها
npm run test:coverage # تست با coverage

# Docker
docker-compose up     # اجرای با Docker
docker-compose down   # متوقف کردن
docker-compose logs   # مشاهده logs
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - ثبت نام سازمان جدید
- `POST /api/auth/login` - ورود کاربر
- `GET /api/auth/me` - دریافت اطلاعات کاربر فعلی
- `PUT /api/auth/change-password` - تغییر رمز عبور

### Candidates
- `GET /api/candidates` - لیست متقاضیان
- `GET /api/candidates/:id` - اطلاعات یک متقاضی
- `POST /api/candidates` - ایجاد متقاضی جدید
- `PUT /api/candidates/:id` - ویرایش متقاضی
- `DELETE /api/candidates/:id` - حذف متقاضی
- `PUT /api/candidates/:id/stage` - تغییر مرحله
- `POST /api/candidates/:id/comments` - افزودن یادداشت

### Settings
- `GET /api/settings` - دریافت تنظیمات
- `PUT /api/settings` - به‌روزرسانی تنظیمات
- `POST /api/settings/stages` - افزودن مرحله جدید
- `PUT /api/settings/stages/:id` - ویرایش مرحله
- `DELETE /api/settings/stages/:id` - حذف مرحله

### AI Features
- `POST /api/ai/parse-resume` - تحلیل رزومه با AI
- `POST /api/ai/summarize-test` - خلاصه‌سازی نتیجه آزمون
- `POST /api/ai/generate-template` - تولید قالب پیام
- `POST /api/ai/insights` - دریافت تحلیل‌های AI

## 🔒 امنیت

- احراز هویت با JWT tokens
- Password hashing با bcrypt
- Rate limiting برای جلوگیری از حملات
- Input validation و sanitization
- CORS configuration
- Helmet.js برای security headers
- HTTPS support در production

## 🚀 Deployment

### Deploy با Docker

1. Build images:
```bash
docker-compose build
```

2. Run containers:
```bash
docker-compose up -d
```

### Deploy روی VPS

1. Clone repository روی سرور
2. Install dependencies
3. Setup MongoDB
4. Configure Nginx as reverse proxy
5. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start backend/server.js --name api
pm2 startup
pm2 save
```

### Deploy روی Cloud Platforms

- **Heroku**: Use Heroku buildpacks
- **AWS**: Use Elastic Beanstalk or ECS
- **Google Cloud**: Use App Engine or Cloud Run
- **Azure**: Use App Service

## 📈 Performance Optimizations

- ✅ Code splitting و lazy loading
- ✅ React Query برای caching
- ✅ Virtual scrolling برای لیست‌های بزرگ
- ✅ Image optimization با Sharp
- ✅ Compression middleware
- ✅ Database indexing
- ✅ Redis caching (optional)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## 📝 مستندات API

API documentation در آدرس `/api-docs` در دسترس است (در حالت development).

## 🤝 مشارکت

Pull requests are welcome! برای تغییرات بزرگ، لطفاً ابتدا issue باز کنید.

## 📄 لایسنس

MIT

## 👥 تیم توسعه

- توسعه Backend: Express.js, MongoDB, Socket.io
- توسعه Frontend: React 18, TypeScript, Vite
- DevOps: Docker, Nginx, CI/CD

## 🆘 پشتیبانی

برای گزارش باگ یا درخواست ویژگی جدید، لطفاً issue باز کنید.