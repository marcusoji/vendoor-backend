# VenDoor Backend API (No ORM — Raw SQL + pg)

Production-ready REST API for the VenDoor food delivery platform.
**Node.js 20 · Express.js · pg (raw SQL) · Supabase Postgres · JWT · Vercel serverless.**

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Supabase and JWT values

# 3. Run database schema
# → Open Supabase Dashboard → SQL Editor → paste sql/schema.sql → Run

# 4. Start dev server
npm run dev
# API at http://localhost:5000/api/health
```

---

## Folder Structure

```
vendoor-backend/
├── api/index.js              ← Vercel serverless entry point
├── src/
│   ├── app.js                ← Express app (no server.listen)
│   ├── server.js             ← Local dev server
│   ├── db/pool.js            ← pg Pool singleton (query + getClient)
│   ├── config/supabase.js    ← Supabase Storage client
│   ├── controllers/          ← Business logic (7 files)
│   ├── middleware/           ← Auth, CORS, error, rate-limit, upload, validate
│   ├── routes/               ← Express routers (7 files)
│   └── utils/                ← jwt, response, slug, schemas (all Joi)
├── sql/schema.sql            ← Complete DB schema — run once in Supabase
├── .env.example
└── vercel.json
```

---

## Database Setup (Supabase)

### 1. Create project
Go to [supabase.com](https://supabase.com) → New Project → choose a region.

### 2. Run the schema
**Supabase Dashboard → SQL Editor → New Query**
Paste the entire contents of `sql/schema.sql` and click **Run**.

This creates:
- `users`, `vendors`, `products`, `orders`, `order_items`, `reviews` tables
- All indexes and foreign keys
- `updated_at` auto-trigger on vendors, products, orders
- Seed admin user (`admin@vendoor.ng` / `Admin@1234`)
- Sample vendor (Mama's Kitchen, Abraka)

### 3. Get your connection string
**Project Settings → Database → Connection String → Transaction pooler (port 6543)**

```
postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```
Use this as `DATABASE_URL` in your `.env`.

### 4. Create Storage bucket
**Storage → New Bucket → Name: `vendoor-uploads` → Public: ON**

---

## Environment Variables

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Transaction pooler URL |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `ALLOWED_ORIGINS` | e.g. `http://localhost:5173,https://vendoor.vercel.app` |

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel link

# Add each env variable
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ALLOWED_ORIGINS
vercel env add NODE_ENV   # set value: production

# Deploy to production
vercel --prod
```

Your API: `https://vendoor-backend-xxxx.vercel.app/api/health`

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Service health check |
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | 🔒 | Current user |
| GET | `/api/users` | 🔒 ADMIN | List all users |
| GET | `/api/users/:id` | 🔒 | Get user (own or admin) |
| PATCH | `/api/users/:id` | 🔒 | Update profile |
| DELETE | `/api/users/:id` | 🔒 ADMIN | Delete user |
| GET | `/api/vendors` | — | List vendors (filters: state, city, category, search) |
| GET | `/api/vendors/:idOrSlug` | — | Vendor detail + products |
| POST | `/api/vendors` | 🔒 | Register vendor |
| PUT | `/api/vendors/:id` | 🔒 VENDOR/ADMIN | Update vendor |
| DELETE | `/api/vendors/:id` | 🔒 ADMIN | Soft-delete vendor |
| PATCH | `/api/vendors/:id/verify` | 🔒 ADMIN | Verify vendor |
| GET | `/api/products` | — | List products (filters: vendorId, search, minPrice, maxPrice) |
| GET | `/api/products/:id` | — | Product detail + reviews |
| POST | `/api/products` | 🔒 VENDOR/ADMIN | Create product |
| PUT | `/api/products/:id` | 🔒 VENDOR/ADMIN | Update product |
| DELETE | `/api/products/:id` | 🔒 VENDOR/ADMIN | Delete product |
| POST | `/api/orders` | 🔒 | Place order |
| GET | `/api/orders` | 🔒 | My orders (admin sees all) |
| GET | `/api/orders/:id` | 🔒 | Order detail |
| PATCH | `/api/orders/:id/status` | 🔒 VENDOR/ADMIN | Update status |
| PATCH | `/api/orders/:id/cancel` | 🔒 | Cancel pending order |
| GET | `/api/reviews?productId=` | — | Product reviews |
| POST | `/api/reviews` | 🔒 | Submit review (must have delivered order) |
| DELETE | `/api/reviews/:id` | 🔒 | Delete review |
| POST | `/api/upload/image?folder=` | 🔒 | Upload image to Supabase Storage |
| DELETE | `/api/upload/image` | 🔒 | Delete image from storage |

---

## Connecting to VenDoor Frontend

In your frontend `.env.local`:
```
VITE_API_URL=http://localhost:5000
```

After backend deploys to Vercel:
```
VITE_API_URL=https://your-backend.vercel.app
```
