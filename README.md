# PrintEzz — Self-Service QR Print Shop Web Application

A responsive mobile-first web application enabling customers to scan a counter QR code, upload documents from their phone browser, customize print settings (B&W/Color, copies, duplex, page ranges), pay instantly via UPI (Razorpay/Cashfree), and track real-time print status in the queue.

---

## ⚡ Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack, React 19)
- **Styling**: Tailwind CSS v4 (CSS-first `@import "tailwindcss";` config, safe-area-inset utilities for mobile viewports)
- **Database & Realtime**: Supabase Postgres + Supabase Realtime subscriptions
- **File Storage**: Supabase Storage (`print-files` bucket) with signed upload & download URLs
- **Payments**: UPI Checkout via Razorpay / Cashfree with idempotent webhook processing + Instant Demo Test Mode
- **Hosting**: Vercel (Customer + Shopkeeper Web App)

---

## 📱 User Flows

### 1. Customer Flow (`/shop/[shop_id]`)
1. **QR Landing & Heartbeat Check**: Scans QR code. Displays shop status (Online/Offline) derived from agent heartbeat (`shops.last_seen`). If offline, displays friendly blocking message.
2. **Document Upload**:
   - Tap/drag file zone (`<input type="file">`).
   - Camera capture button (`capture="environment"`).
   - Server process (`/api/upload/process`): counts PDF pages using `pdf-lib` and auto-converts JPG/PNG images to PDF.
   - Direct Supabase Storage Signed Upload (`/api/upload/presign`).
3. **Print Settings**:
   - Copies stepper (+/-), Color/B&W toggle, Paper size, Duplex toggle, Page range.
   - Live price calculation updating in real time.
4. **UPI Checkout & Status**:
   - Razorpay / UPI trigger + built-in Instant Payment Simulator.
   - Live status stepper using Supabase Realtime (`Queued` → `Printing` → `Ready for pickup` / `Failed`).

### 2. Shopkeeper Dashboard (`/shop/[shop_id]/admin`)
- **Agent Heartbeat Indicator**: Visual online/offline status badge.
- **Metrics Overview**: Today's total revenue, B&W vs Color page counts, active queue length.
- **QR Code Poster Generator**: Display/download shop printable poster for counter display.
- **Realtime Job Queue**: Live table with status filters (`Queued`, `Printing`, `Done`, `Failed`).
- **Job Controls**: "Reprint" for failed jobs, "Keep file (24h+)" retention extension toggle, manual status overrides.

---

## 🗄️ Supabase Schema & Storage Setup

Execute the SQL script located in `supabase/schema.sql` inside your Supabase SQL Editor.

```sql
-- Creates 'shops' and 'print_jobs' tables
-- Creates 'print-files' bucket in Supabase Storage with storage RLS policies
-- Enables RLS policies for public customer job inserts and shopkeeper admin access
-- Adds publication for Supabase Realtime on 'print_jobs'
```

### 🧹 Cleanup Job (Supabase Edge Function + pg_cron)
1. Deploy `supabase/functions/cleanup-jobs/index.ts` to Supabase Edge Functions.
2. Configure `pg_cron` or Vercel Cron to invoke `cleanup-jobs` every 30 minutes:
   - Deletes files from Supabase Storage `print-files` bucket where `delete_at < now()` and `retention_extended = false`.
   - Clears `file_url` in the database.

---

## 🖥️ Print Agent Architecture Note (Local Terminal PC)

> **Note**: This web app repository powers the customer and shopkeeper web interfaces. In production, a companion **Local Windows/Electron Agent** runs on the shopkeeper's desktop PC:
> 1. Polls/subscribes to `queued` jobs for its `shop_id` via Supabase Realtime or `/api/shop/heartbeat`.
> 2. Sends a heartbeat request to `/api/shop/heartbeat` every 30s to update `shops.last_seen`.
> 3. Downloads print documents from Supabase Storage signed URLs.
> 4. Triggers physical printing via **SumatraPDF** (`SumatraPDF.exe -print-to "Printer Name" document.pdf`) or CUPS (`lp`).
> 5. Calls `/api/shop/agent-jobs` to update job status to `printing` → `done` (or `failed` with failure reason).

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set environment keys (or run in Demo mode without external keys):
   ```bash
   cp .env.example .env.local
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Open in browser:
   - **Customer Flow**: `http://localhost:3000/shop/demo-shop`
   - **Shopkeeper Admin**: `http://localhost:3000/shop/demo-shop/admin`

---

## 📦 Deployment to Vercel

1. Push code to GitHub.
2. Import project in Vercel.
3. Configure environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
4. Deploy! Next.js 16 will compile with Turbopack and automatically handle Node.js vs Edge API routes.
