# CourierSaaS — Multi-Tenant Courier Tracking Platform

A full-featured SaaS platform for courier companies to manage shipments, and for customers to track packages in real-time.

## Tech Stack
- **Backend:** Node.js + Express, Prisma ORM, PostgreSQL (Neon.tech)
- **Frontend:** React + Vite, Tailwind CSS, Zustand, React Router v6
- **Advanced Features:** QR Code generation/scanning + Mobile-first PWA

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or a Neon.tech account)
- Cloudinary account (for proof-of-delivery uploads)

### 1. Clone and install
```bash
git clone https://github.com/Chirag1522/TrackFlow.git
cd courier-saas
npm install
```

### 2. Configure backend environment
```bash
cp apps/api/.env.example apps/api/.env
```
Edit `apps/api/.env`:
```
DATABASE_URL="postgresql://user:pass@host/dbname"
JWT_SECRET="change-this-secret-min-16-chars"
JWT_REFRESH_SECRET="change-this-refresh-secret"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
EMAIL_FROM="noreply@yourdomain.com"
FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV=development
```

### 3. Configure frontend environment
```bash
cp apps/web/.env.example apps/web/.env
```
Edit `apps/web/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### 4. Run database migrations
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Seed demo data
```bash
node prisma/seed.js
```

### 6. Start development servers
```bash
# Terminal 1 - Backend
cd apps/api && npm run dev

# Terminal 2 - Frontend
cd apps/web && npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

---

## Demo Login Credentials

| Role        | Email                      | Password       |
|-------------|---------------------------|----------------|
| Admin       | admin@democourier.com     | admin123       |
| Agent       | agent@democourier.com     | agent123       |

---

## Environment Variables

| Variable                | Required | Description                        |
|-------------------------|----------|------------------------------------|
| `DATABASE_URL`          | ✅       | PostgreSQL connection string        |
| `JWT_SECRET`            | ✅       | Access token secret (min 16 chars) |
| `JWT_REFRESH_SECRET`    | ✅       | Refresh token secret               |
| `JWT_EXPIRES_IN`        | ✅       | Access token TTL (default: 15m)    |
| `JWT_REFRESH_EXPIRES_IN`| ✅       | Refresh token TTL (default: 7d)    |
| `CLOUDINARY_CLOUD_NAME` | ✅       | Cloudinary cloud name              |
| `CLOUDINARY_API_KEY`    | ✅       | Cloudinary API key                 |
| `CLOUDINARY_API_SECRET` | ✅       | Cloudinary API secret              |
| `EMAIL_FROM`            | ✅       | Sender email address               |
| `FRONTEND_URL`          | ✅       | Frontend URL (for CORS + emails)   |
| `PORT`                  | ❌       | API port (default: 5000)           |
| `DISABLE_RATE_LIMIT`    | ❌       | Set `true` only for local debugging |

---

## Deployment

### Database — Neon.tech
1. Create project at https://neon.tech
2. Copy connection string to `DATABASE_URL`
3. Run `npx prisma migrate deploy`

### Backend — Render
1. Connect GitHub repo to Render
2. Set root directory: `apps/api`
3. Add all env vars from above
4. Set start command: `npm start`
5. Add release command: `npx prisma migrate deploy`

### Frontend — Vercel
1. Connect GitHub repo to Vercel
2. Set root directory: `apps/web`
3. Set `VITE_API_URL` to `https://trackflow-lxk9.onrender.com/api`
4. Deploy

### Live Deployment
- Frontend: https://track-flow-web.vercel.app/
- Backend API: https://trackflow-lxk9.onrender.com

---

## API Documentation

See `ARCHITECTURE.md` for full API reference.
Postman collection: `docs/postman/CourierSaaS.postman_collection.json`

### Key endpoints:
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/track/:tracking_id` — Public shipment tracking (no auth)
- `POST /api/shipments` — Create shipment (admin)
- `POST /api/shipments/:id/status` — Update status (agent/admin)
- `POST /api/shipments/:id/assign-agent` — Assign delivery agent (admin)
- `GET /api/analytics/summary` — Dashboard stats (admin)

---

## Advanced Features Implemented

### 1. QR Code Generation & Scanning
- Every shipment gets a unique QR code on creation
- Admin can view QR code in shipment modal
- Agent scan page uses device camera via `html5-qrcode`
- Scanning auto-navigates to tracking page

### 2. Mobile-First PWA Agent Interface
- All agent pages are fully responsive (mobile-first Tailwind)
- PWA manifest configured with icons and `display: standalone`
- Service worker via `vite-plugin-pwa` with offline caching
- Camera access for QR scanning and proof-of-delivery photos
- "Add to home screen" supported on iOS and Android

---

## Submission Checklist

- Git repository link: `https://github.com/Chirag1522/TrackFlow`
- Setup instructions: included in this `README.md`
- Architecture overview: `ARCHITECTURE.md`
- API documentation (Postman): `docs/postman/CourierSaaS.postman_collection.json`
- Advanced enhancements implemented:
	- QR code generation and scanning
	- Mobile-first PWA delivery agent interface
- Deployed frontend link: `https://track-flow-web.vercel.app/`
- Deployed backend/API link: `https://trackflow-lxk9.onrender.com`
