# 🚀 دليل النشر على سيرفر استضافة

## الخيار الأفضل: VPS واحد (DigitalOcean / Hetzner / Contabo / AWS Lightsail)

### المتطلبات
- VPS بـ Ubuntu 22.04+ (1 vCPU، 1GB RAM يكفي)
- نطاق (دومين) موجّه إلى IP السيرفر
- مفتاح Groq API

---

## 1️⃣ إعداد السيرفر (مرة واحدة)

```bash
# الاتصال بالسيرفر
ssh root@YOUR_SERVER_IP

# تحديث النظام
apt update && apt upgrade -y

# تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential nginx certbot python3-certbot-nginx

# تثبيت PM2 (مدير العملية)
npm install -g pm2
```

---

## 2️⃣ رفع المشروع

```bash
# انسخ مجلد KeyOne-v1.0 إلى السيرفر (عن طريق scp أو git)
# مثال:
scp -r ./KeyOne-v1.0 root@YOUR_SERVER_IP:/opt/keyone

# اتصل بالسيرفر
ssh root@YOUR_SERVER_IP
cd /opt/keyone
```

---

## 3️⃣ ضبط متغيرات البيئة

### Backend
```bash
cd /opt/keyone/backend
cp .env.example .env
nano .env
```

عدّل القيم:
```env
PORT=4000
NODE_ENV=production
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING_HERE   # ← غيّرها!
CORS_ORIGIN=https://app.yourdomain.com         # ← دومينك

DB_PATH=./data/keyone.db
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxx           # ← مفتاحك

ADMIN_WHATSAPP=201XXXXXXXXX                    # ← رقمك بدون +
```

### Frontend
```bash
cd /opt/keyone/frontend
cp .env.local.example .env.local
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 4️⃣ تثبيت + بناء

```bash
# Backend
cd /opt/keyone/backend
npm install --omit=dev

# Frontend
cd /opt/keyone/frontend
npm install
npm run build
```

---

## 5️⃣ تشغيل بـ PM2

```bash
cd /opt/keyone
pm2 start backend/src/index.js --name keyone-api
pm2 start "npm start" --name keyone-web --cwd ./frontend
pm2 save
pm2 startup     # نفّذ الأمر الذي يطبعه (يضمن التشغيل بعد إعادة التشغيل)
```

أوامر مفيدة:
```bash
pm2 status          # فحص الحالة
pm2 logs keyone-api # عرض السجلات
pm2 restart all     # إعادة تشغيل
pm2 stop all        # إيقاف
```

---

## 6️⃣ Nginx (Reverse Proxy + SSL)

أنشئ ملف الإعدادات:
```bash
nano /etc/nginx/sites-available/keyone
```

ألصق:
```nginx
# الفرونت
server {
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}

# الباك إند (مع دعم WebSocket)
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    listen 80;
}
```

فعّله:
```bash
ln -s /etc/nginx/sites-available/keyone /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

أضف SSL مجانياً (Let's Encrypt):
```bash
certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

✅ **انتهى!** افتح `https://app.yourdomain.com` وادخل بـ `admin@keyone.local` / `admin1234`.

---

## 🐳 الخيار البديل: Docker

```bash
# في الـ root للمشروع، أنشئ docker-compose.yml كما في README الأصلي
docker compose up -d
```

---

## 🔧 صيانة دورية

| المهمة | الأمر |
|---|---|
| نسخ احتياطي للـ DB | `cp /opt/keyone/backend/data/keyone.db ~/backup-$(date +%F).db` |
| تحديث النظام | استبدل ملفات `src/` ثم `pm2 restart all` |
| فحص المساحة | `du -sh /opt/keyone` |
| سجلات الأخطاء | `pm2 logs --err` |

---

## 🔥 نصائح حماية رقم واتساب من الحظر

1. **سخّن الرقم** قبل تفعيل الأتمتة (أرسل/استقبل يدوياً 50+ رسالة على مدار أسبوع)
2. **لا ترسل رسائل جماعية** غير مطلوبة
3. **اضبط حد الرسائل** على أقل من 12/دقيقة في الإعدادات
4. **فعّل ساعات العمل** (9 صباحاً - 11 مساءً مثلاً)
5. **استخدم اسم وصورة بزنس** حقيقي

---

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| QR لا يظهر | امسح `backend/data/wa-auth/` وأعد تشغيل `keyone-api` |
| الفرونت لا يتصل | تأكد من `NEXT_PUBLIC_API_URL` في `.env.local` ثم أعد البناء |
| WebSocket مقطوع | تأكد من إعدادات Nginx — قسم `socket.io/` |
| AI لا يرد | تأكد من المفتاح في الإعدادات — شغّل `pm2 logs keyone-api` |

---

**نصيحة احترافية**: احتفظ بنسخة احتياطية يومية من `backend/data/keyone.db` (يحوي كل العملاء + المحادثات + الإعدادات).
