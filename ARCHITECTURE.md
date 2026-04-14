# Architecture Overview

## System Overview

TrackFlow is a multi-tenant courier SaaS platform. Each tenant has isolated users, hubs, shipments, and events. Public users can track shipments by tracking ID.

```
┌───────────────────────────────────────────────────────────┐
│ React + Vite Web App                                      │
│ Public Tracking | Admin Console | Agent Workflows | PWA   │
└──────────────────────────────┬────────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────▼────────────────────────────┐
│ Express API                                               │
│ Auth | Tenants | Users | Hubs | Shipments | Tracking      │
│ Analytics | Plans | Security Middleware | RBAC            │
└───────────────────────┬───────────────────────────────────┘
                        │ Prisma ORM
┌───────────────────────▼───────────────────────────────────┐
│ PostgreSQL (Neon)                                         │
│ tenants, users, hubs, shipments, shipment_events, plans   │
└───────────────────────┬───────────────────────────────────┘
                        │
          ┌─────────────▼─────────────┐
          │ Redis + BullMQ            │
          │ cache + async email queue │
          └───────────────────────────┘
```

## Deployment Targets

- Frontend: https://track-flow-web.vercel.app/
- Backend: https://trackflow-lxk9.onrender.com
- API base URL: https://trackflow-lxk9.onrender.com/api

## Repository Structure

```
courier-saas/
├── apps/
│   ├── api/
│   │   ├── index.js
│   │   ├── prisma/
│   │   └── src/
│   │       ├── config/
│   │       ├── middleware/
│   │       ├── modules/
│   │       ├── queues/
│   │       ├── jobs/
│   │       └── utils/
│   └── web/
│       └── src/
│           ├── api/
│           ├── routes/
│           ├── pages/
│           ├── layouts/
│           ├── guards/
│           └── components/
└── docs/postman/
```

## Data Model Snapshot

Primary entities in Prisma schema:

- `subscription_plans`
- `tenants`
- `users`
- `hubs`
- `shipments`
- `shipment_events`
- `notifications`
- `audit_logs`

Multi-tenancy is enforced by tenant-scoped relations and tenant-aware query filters.

## Authentication and Authorization

- JWT access and refresh tokens.
- Role-based middleware using `allow(...)`.
- Tenant middleware for tenant-scoped modules.
- Rate limiters:
  - Default API limiter
  - Auth limiter
  - Public tracking limiter

## Shipment Lifecycle

```
Created -> Picked_Up -> At_Sorting_Facility -> In_Transit -> Out_for_Delivery
                                                                  |
                                                        +---------+---------+
                                                        |                   |
                                                    Delivered             Failed
                                                                           |
                                                           +---------------+---------------+
                                                           |                               |
                                                         Retry                          Returned
                                                           |
                                                       Picked_Up
```

## Full API Reference

Mounted route prefixes are defined in `apps/api/index.js`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check with timestamp |

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login with email/password and optional `tenant_slug` |
| POST | `/api/auth/refresh` | None | Refresh JWT token pair |
| POST | `/api/auth/logout` | None | Logout handler |

### Tenants (`/api/tenants`) - Super Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/tenants` | super_admin | List tenants |
| GET | `/api/tenants/:id` | super_admin | Tenant detail |
| POST | `/api/tenants` | super_admin | Create tenant with initial admin (`admin_name`, `admin_email`, `admin_password`) |
| PATCH | `/api/tenants/:id` | super_admin | Update tenant fields |
| DELETE | `/api/tenants/:id` | super_admin | Delete tenant |
| POST | `/api/tenants/:id/admins` | super_admin | Create additional tenant admin |

### Users (`/api/users`) - Tenant Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | admin | List users in tenant |
| POST | `/api/users` | admin | Create admin/agent/customer user |
| PATCH | `/api/users/:id` | admin | Update user |
| DELETE | `/api/users/:id` | admin | Delete/deactivate user |

### Hubs (`/api/hubs`) - Tenant Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/hubs` | admin | List hubs |
| POST | `/api/hubs` | admin | Create hub |
| PATCH | `/api/hubs/:id` | admin | Update hub |
| DELETE | `/api/hubs/:id` | admin | Delete hub |

### Shipments (`/api/shipments`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/shipments/workitems` | agent | Agent work items |
| GET | `/api/shipments` | admin, agent | Shipment list |
| GET | `/api/shipments/:id` | admin, agent | Shipment detail |
| GET | `/api/shipments/:id/available-agents` | admin | Available agents for assignment |
| POST | `/api/shipments` | admin | Create shipment |
| PATCH | `/api/shipments/:id/assign-agent` | admin | Assign agent |
| POST | `/api/shipments/:id/assign-agent` | admin | Assign agent (POST alias) |
| PATCH | `/api/shipments/:id/status` | admin, agent | Update status |
| POST | `/api/shipments/:id/status` | admin, agent | Update status (POST alias) |
| PATCH | `/api/shipments/:id/transition-stage` | admin | Automated stage transition |
| GET | `/api/shipments/:id/qr` | admin, agent | Get QR for shipment |
| POST | `/api/shipments/:id/proof` | admin, agent | Upload delivery proof image |

### Tracking (`/api/track`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/track/:tracking_id` | None | Public shipment tracking (tracking limiter applied) |
| PATCH | `/api/track/:tracking_id/request-return` | customer, admin, super_admin | Request return for eligible shipment |

### Analytics (`/api/analytics`) - Tenant Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/summary` | admin | Shipment summary stats |
| GET | `/api/analytics/shipments-by-status` | admin | Status breakdown |
| GET | `/api/analytics/agent-performance` | admin | Agent performance metrics |

### Plans (`/api/plans`) - Super Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/plans` | super_admin | List subscription plans |
| POST | `/api/plans` | super_admin | Create subscription plan |
| PATCH | `/api/plans/:id` | super_admin | Update subscription plan |

### GPS Module Note

There is a GPS routes module in `apps/api/src/modules/gps/gps.routes.js`, but it is not currently mounted in `apps/api/index.js`.

## Redis and Queue Usage

Yes, this codebase uses Redis and a BullMQ queue.

### Redis

- Client setup: `apps/api/src/config/redis.js` (ioredis)
- Cache helpers: `apps/api/src/utils/cache.js`
- Cache invalidation: `apps/api/src/utils/cacheInvalidation.js`
- Cache-backed services include shipments and analytics service reads.

Redis is controlled by environment variables such as:

- `REDIS_ENABLED`
- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`
- `CACHE_ENABLED`

### Queue (BullMQ)

- Queue and worker: `apps/api/src/queues/emailQueue.js`
- Job wrapper functions: `apps/api/src/jobs/emailJobs.js`
- Startup wiring: `initializeEmailQueue()` in `apps/api/index.js`

Queue operation is controlled by:

- `QUEUES_ENABLED`
- `EMAIL_QUEUE_CONCURRENCY`

If queue is disabled or unavailable, email sending falls back to inline async execution.

## Security Controls

- Helmet and CORS controls
- Request rate limiting (default, auth, tracking)
- NoSQL injection guard
- Suspicious input/header detection
- CSRF prevention for non-bearer write requests
- Brute force tracking on auth flows
- Audit logging middleware and helpers

## Web Application Architecture

- Router structure in `apps/web/src/routes/AppRouter.jsx`
- Auth state in Zustand store
- Axios client with refresh-token interceptor
- Public tracking page supports QR scan and live poll refresh
- PWA plugin configured via `vite-plugin-pwa`

## API Testing

Primary Postman collection:

- `docs/postman/CourierSaaS.postman_collection.json`

Base URL is configured for deployed backend in that collection.
