# TrackFlow Setup

## Project Overview

TrackFlow is a multi-tenant courier tracking SaaS:

- Backend: Express + Prisma + PostgreSQL
- Frontend: React + Vite
- Optional infra: Redis (cache + queues)

## Prerequisites

Install these first:

- Node.js 18+
- npm 9+
- PostgreSQL (local or hosted)
- Cloudinary account (required for proof image uploads)

Optional but recommended:

- Redis (for cache and BullMQ email queue)

## 1) Clone Repository

### macOS/Linux

```bash
git clone https://github.com/Chirag1522/TrackFlow.git
cd courier-saas
```

### Windows PowerShell

```powershell
git clone https://github.com/Chirag1522/TrackFlow.git
Set-Location courier-saas
```

## 2) Install Dependencies

From project root:

```bash
npm install
```

## 3) Configure Environment Files

Create env files from examples.

### macOS/Linux

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Windows PowerShell

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

## 4) Configure Backend Env

Edit apps/api/.env and set required values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/courier_saas"
JWT_SECRET="change-this-to-a-random-string-min-32-chars"
JWT_REFRESH_SECRET="change-this-refresh-secret-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

EMAIL_FROM="noreply@yourdomain.com"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV=development
```

Optional Redis/Performance settings:

```env
REDIS_ENABLED=true
REDIS_URL=""
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

CACHE_ENABLED=true
QUEUES_ENABLED=true
EMAIL_QUEUE_CONCURRENCY=4
```

If you do not have Redis locally, set:

```env
REDIS_ENABLED=false
CACHE_ENABLED=false
QUEUES_ENABLED=false
```

## 5) Configure Frontend Env

Edit apps/web/.env:

```env
VITE_API_URL=http://localhost:5000/api
```

## 6) Database Setup

Run Prisma migration, client generation, and seed data.

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
node prisma/seed.js
cd ../..
```

## 7) Run the Apps

Use two terminals.

### Terminal 1: Backend API

```bash
cd apps/api
npm run dev
```

Expected:

- API starts on http://localhost:5000
- Health endpoint: http://localhost:5000/health

### Terminal 2: Frontend Web

```bash
cd apps/web
npm run dev
```

Expected:

- Frontend starts on http://localhost:5173
- If 5173 is busy, Vite may pick 5174

## 8) Quick Login Credentials (Seed Data)

Use these after running seed:

- Admin: admin@democourier.com / admin123
- Agent: agent@democourier.com / agent123

## 9) Verify Everything Quickly

1. Open http://localhost:5000/health and confirm status ok.
2. Open frontend URL from Vite terminal output.
3. Login as admin and check dashboard loads.
4. Open public tracking page and test a tracking ID.

## 10) Useful Root Scripts

From project root:

```bash
npm run dev:api
npm run dev:web
npm run build:web
npm run migrate
```

## 11) Common Local Issues and Fixes

### Problem: API does not start

- Ensure apps/api/.env exists and has valid required values.
- Validate DATABASE_URL points to a reachable database.
- Run:

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

### Problem: Frontend shows network error

- Confirm API is running on port 5000.
- Confirm apps/web/.env has correct VITE_API_URL.
- Restart frontend after env changes.

### Problem: Prisma errors about schema/migrations

Run in apps/api:

```bash
npx prisma migrate dev
npx prisma generate
```

### Problem: Redis connection warnings

If Redis is not installed locally, disable Redis features in apps/api/.env:

```env
REDIS_ENABLED=false
CACHE_ENABLED=false
QUEUES_ENABLED=false
```

## 12) API Testing (Postman)

Use collection:

- docs/postman/CourierSaaS.postman_collection.json

Recommended order:

1. Login endpoint
2. Protected admin endpoints
3. Public tracking endpoint

## 13) Local URLs Summary

- API: http://localhost:5000
- API Health: http://localhost:5000/health
- Frontend: http://localhost:5173 (or 5174 if port in use)

---
