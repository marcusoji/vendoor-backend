# VenDoor Backend API

Production-ready REST API for the **VenDoor** food delivery platform (Nigeria).  
Built with **Node.js 20 · Express.js · Prisma ORM · Supabase Postgres · JWT Auth**.  
Fully compatible with **Vercel Serverless Functions**.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Folder Structure](#2-folder-structure)
3. [Environment Variables](#3-environment-variables)
4. [Supabase Setup](#4-supabase-setup)
5. [Local Development](#5-local-development)
6. [Vercel Deployment](#6-vercel-deployment)
7. [API Documentation](#7-api-documentation)

---

## 1. Architecture

```
Request → Express Router → Middleware → Controller → Prisma → Supabase Postgres
```

| Layer | Responsibility |
|---|---|
| `routes/` | Map HTTP methods + paths to controllers |
| `middleware/` | Auth, validation, rate limiting, error handling, uploads |
| `controllers/` | Request handling, response formatting |
| `services/` | Joi validation schemas |
| `utils/` | JWT helpers, response helpers, slug generator |
| `config/` | Prisma client singleton, Supabase admin client |
| `prisma/` | Schema, SQL migration |
| `api/index.js` | Vercel serverless entry point |
| `src/server.js` | Local dev server (uses `app.listen`) |

**Key decisions:**
- **Prisma** over raw SQL — type-safe queries, easy migrations, Supabase-compatible.
- **Supabase Storage** for file uploads — returns permanent public URLs.
- **Vercel-compatible** — `api/index.js` exports the Express app; no `server.listen()` at module level.
- **pgBouncer** — `DATABASE_URL` uses connection pooling (port 6543) for serverless; `DIRECT_URL` bypasses it for migrations.
- **Server-side price validation** — order totals are calculated from DB prices, never trusted from client.
- **Soft deletes** on vendors — deactivates rather than hard-deletes to preserve order history.

---

## 2. Folder Structure

```
vendoor-backend/
├── api/
│   └── index.js              # Vercel serverless entry point
├── prisma/
│   ├── schema.prisma         # Prisma data model
│   └── setup.sql             # Raw SQL for manual Supabase setup
├── src/
│   ├── app.js                # Express app bootstrap
│   ├── server.js             # Local dev server
│   ├── config/
│   │   ├── prisma.js         # Prisma client singleton
│   │   └── supabase.js       # Supabase admin client
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── vendor.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   ├── review.controller.js
│   │   └── upload.controller.js
│   ├── middleware/
│   │   ├── authenticate.js   # JWT Bearer token guard
│   │   ├── authorize.js      # Role-based access control
│   │   ├── errorHandler.js   # Global error + 404 handler
│   │   ├── rateLimiter.js    # express-rate-limit (100/15min, auth: 20/15min)
│   │   ├── upload.js         # Multer memory storage
│   │   └── validate.js       # Joi validation middleware factory
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── vendor.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   ├── review.routes.js
│   │   └── upload.routes.js
│   ├── services/
│   │   ├── auth.schema.js
│   │   ├── vendor.schema.js
│   │   ├── product.schema.js
│   │   ├── order.schema.js
│   │   └── review.schema.js
│   └── utils/
│       ├── jwt.js
│       ├── response.js
│       └── slug.js
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in all values.

```env
# Supabase connection pooler (pgBouncer) — used at runtime
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection — used by prisma migrate only
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Supabase API
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App
NODE_ENV="development"
PORT=5000

# CORS — comma-separated allowed origins
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

---

## 4. Supabase Setup

### 4a. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `vendoor`), set a strong DB password, pick a region close to Nigeria (e.g. `eu-west-2` London or `us-east-1`).

### 4b. Get Connection Strings
1. Go to **Project Settings → Database**
2. Copy **Connection Pooling** string (port 6543) → `DATABASE_URL`
3. Copy **Direct connection** string (port 5432) → `DIRECT_URL`
4. Replace `[YOUR-PASSWORD]` in both strings.

### 4c. Get API Keys
1. Go to **Project Settings → API**
2. Copy **Project URL** → `SUPABASE_URL`
3. Copy **service_role** key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 4d. Run Database Migration

**Option A — Prisma (recommended):**
```bash
npx prisma db push
```

**Option B — Raw SQL:**
1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. Paste the contents of `prisma/setup.sql`
3. Click **Run**

### 4e. Create Storage Bucket
1. Go to **Storage → New Bucket**
2. Name: `vendoor-uploads`
3. Set **Public** to `true` (so uploaded images have public URLs)
4. Click **Save**

---

## 5. Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Steps

```bash
# 1. Clone and install dependencies
cd vendoor-backend
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in all values in .env

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to Supabase (first time, or after schema changes)
npx prisma db push

# 5. Start the dev server with hot reload
npm run dev
```

API now running at: `http://localhost:5000`

Health check: `GET http://localhost:5000/api/health`

### Useful dev commands

```bash
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:push      # Push schema changes to Supabase
npm run db:generate  # Regenerate Prisma client after schema edit
```

---

## 6. Vercel Deployment

### Prerequisites
- Vercel account at [https://vercel.com](https://vercel.com)
- Vercel CLI: `npm i -g vercel`

### Steps

```bash
# 1. Login to Vercel
vercel login

# 2. From the project root, deploy
vercel

# 3. Follow prompts:
#    - Link to existing project or create new
#    - Framework: Other
#    - Root directory: ./  (the backend folder)
#    - Build command: npm run db:generate
#    - Output directory: (leave blank)
```

### Add Environment Variables on Vercel

Either via CLI:
```bash
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ALLOWED_ORIGINS
vercel env add NODE_ENV
```

Or via **Vercel Dashboard → Project → Settings → Environment Variables**.

Set `ALLOWED_ORIGINS` to your deployed frontend URL, e.g.:
```
https://vendoor.vercel.app,https://yourdomain.com
```

### Deploy to Production

```bash
vercel --prod
```

Your API will be live at: `https://your-project-name.vercel.app/api/health`

### How it works on Vercel
- `vercel.json` routes all requests to `api/index.js`
- `api/index.js` exports the Express `app` — no `app.listen()` required
- Vercel handles the serverless invocation automatically
- `postinstall` in `package.json` runs `prisma generate` on every build

---

## 7. API Documentation

### Base URL
- Local: `http://localhost:5000`
- Production: `https://your-project.vercel.app`

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

### Health

#### `GET /api/health`
Public. Returns API status.

**Response 200:**
```json
{
  "status": "ok",
  "service": "VenDoor API",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "production"
}
```

---

### Auth

#### `POST /api/auth/register`
Register a new user account. Rate limited: 20 req/15min.

**Body:**
```json
{
  "fullName": "Marcus Efe",
  "email": "marcus@example.com",
  "password": "SecurePass123",
  "role": "USER"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "Marcus Efe",
      "email": "marcus@example.com",
      "role": "USER",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive a JWT. Rate limited: 20 req/15min.

**Body:**
```json
{
  "email": "marcus@example.com",
  "password": "SecurePass123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": "uuid", "fullName": "Marcus Efe", "email": "marcus@example.com", "role": "USER", "createdAt": "..." },
    "token": "eyJ..."
  }
}
```

---

#### `GET /api/auth/me`
🔒 Protected. Returns current authenticated user.

**Response 200:**
```json
{
  "success": true,
  "message": "Success",
  "data": { "user": { "id": "uuid", "fullName": "Marcus Efe", "email": "marcus@example.com", "role": "USER", "createdAt": "..." } }
}
```

---

### Users

#### `GET /api/users`
🔒 Admin only. List all users.

**Query params:** `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "users": [ { "id": "...", "fullName": "...", "email": "...", "role": "USER", "createdAt": "..." } ],
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
  }
}
```

---

#### `GET /api/users/:id`
🔒 Admin or self.

#### `PATCH /api/users/:id`
🔒 Admin or self. Update profile fields.

**Body (any subset):**
```json
{
  "fullName": "Marcus Updated",
  "email": "new@example.com",
  "password": "NewPass456"
}
```

#### `DELETE /api/users/:id`
🔒 Admin only.

---

### Vendors

#### `GET /api/vendors`
Public. List active vendors.

**Query params:** `page`, `limit`, `state`, `city`, `category`, `search`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "businessName": "Mama's Kitchen",
        "slug": "mamas-kitchen",
        "categories": ["Restaurant"],
        "city": "Abraka",
        "state": "Delta",
        "isVerified": true,
        "prepTime": "20 mins"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
  }
}
```

---

#### `GET /api/vendors/:idOrSlug`
Public. Get a vendor by ID or slug, with their products.

---

#### `POST /api/vendors`
🔒 Authenticated. Register a new vendor.

**Body:**
```json
{
  "businessName": "Mama's Kitchen",
  "categories": ["Restaurant", "Fast Food"],
  "description": "Authentic Nigerian cuisine served fresh daily.",
  "address": "12 University Road, Abraka",
  "phone": "08012345678",
  "email": "mamaskitchen@example.com",
  "state": "Delta",
  "city": "Abraka",
  "operatingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "openTime": "08:00",
  "closeTime": "20:00",
  "deliveryRadius": 5,
  "prepTime": "20 mins",
  "offersPickup": true,
  "offersScheduled": false,
  "bizRegNo": "RC123456",
  "bankName": "GTBank",
  "accountName": "Mama Kitchen Ltd",
  "accountNumber": "0123456789"
}
```

---

#### `PUT /api/vendors/:id`
🔒 Vendor or Admin. Update vendor profile.

#### `DELETE /api/vendors/:id`
🔒 Admin only. Soft-deactivates the vendor.

#### `PATCH /api/vendors/:id/verify`
🔒 Admin only. Marks vendor as verified.

---

### Products

#### `GET /api/products`
Public. List available products.

**Query params:** `page`, `limit`, `vendorId`, `search`, `minPrice`, `maxPrice`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Jollof Rice & Chicken",
        "price": 3500,
        "averageRating": 4.5,
        "reviewCount": 12,
        "vendor": { "businessName": "Mama's Kitchen", "city": "Abraka" }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

---

#### `GET /api/products/:id`
Public. Get product with vendor info and all reviews.

#### `POST /api/products`
🔒 Vendor or Admin.

**Body:**
```json
{
  "name": "Jollof Rice & Chicken",
  "description": "Smoky party jollof with grilled chicken and coleslaw.",
  "price": 3500,
  "vendorId": "vendor-uuid",
  "isAvailable": true
}
```

#### `PUT /api/products/:id`
🔒 Vendor or Admin. Update any product field.

#### `DELETE /api/products/:id`
🔒 Vendor or Admin.

---

### Orders

#### `POST /api/orders`
🔒 Authenticated. Place a new order.

**Body:**
```json
{
  "vendorId": "vendor-uuid",
  "deliveryAddress": "Room 4, Block B, Delta State University, Abraka",
  "notes": "Extra pepper please",
  "items": [
    { "productId": "product-uuid-1", "quantity": 2 },
    { "productId": "product-uuid-2", "quantity": 1 }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Order placed successfully.",
  "data": {
    "order": {
      "id": "uuid",
      "status": "PENDING",
      "totalAmount": 8000,
      "deliveryFee": 500,
      "deliveryAddress": "...",
      "items": [ ... ],
      "vendor": { "businessName": "Mama's Kitchen", "prepTime": "20 mins" }
    }
  }
}
```

> **Note:** Delivery fee is ₦500 for orders under ₦5,000. Free delivery for orders ₦5,000+. Prices are validated server-side.

---

#### `GET /api/orders`
🔒 Authenticated. Users see own orders; Admins see all.

**Query params:** `page`, `limit`, `status`

#### `GET /api/orders/:id`
🔒 Order owner or Admin.

#### `PATCH /api/orders/:id/status`
🔒 Vendor or Admin.

**Body:**
```json
{ "status": "CONFIRMED" }
```

Valid transitions: `PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`  
Or any status → `CANCELLED`.

#### `PATCH /api/orders/:id/cancel`
🔒 Authenticated. Only the order owner can cancel; only `PENDING` orders.

---

### Reviews

#### `GET /api/reviews?productId=<uuid>`
Public. Get all reviews for a product with average rating.

#### `POST /api/reviews`
🔒 Authenticated. Submit a review. User must have a **delivered** order containing the product. One review per user per product.

**Body:**
```json
{
  "productId": "product-uuid",
  "rating": 5,
  "comment": "Best jollof rice in Abraka! 🔥"
}
```

#### `DELETE /api/reviews/:id`
🔒 Review owner or Admin.

---

### File Upload

#### `POST /api/upload/image?folder=logos`
🔒 Authenticated. Upload an image to Supabase Storage.

**Request:** `multipart/form-data`, field name: `image`  
**Supported types:** JPEG, PNG, WEBP, GIF  
**Max size:** 5MB  
**Query param `folder`:** `logos` | `products` | `documents` | `general`

**Response 201:**
```json
{
  "success": true,
  "message": "Image uploaded successfully.",
  "data": {
    "url": "https://[ref].supabase.co/storage/v1/object/public/vendoor-uploads/logos/uuid.jpg",
    "path": "logos/uuid.jpg"
  }
}
```

#### `DELETE /api/upload/image`
🔒 Authenticated. Delete an image by path.

**Body:**
```json
{ "path": "logos/uuid.jpg" }
```

---

### Error Codes

| HTTP | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, existing review) |
| 413 | File too large |
| 422 | Unprocessable (Joi validation failed) |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |

---

## License

MIT — built for VenDoor, Nigeria's fastest growing food delivery platform.
