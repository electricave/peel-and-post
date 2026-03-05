# Peel & Post Studio — Client Portal
## Setup Guide: From Zero to Live in ~30 Minutes

---

## Step 1: Create Your Accounts (10 min)

### GitHub
1. Go to https://github.com and click **Sign up**
2. Verify your email

### Supabase (your database + auth)
1. Go to https://supabase.com and click **Start your project**
2. Sign in with GitHub
3. Click **New project**
4. Name it `peel-and-post`, pick a region close to you, set a strong database password
5. Wait ~2 minutes for it to provision

### Vercel (your hosting)
1. Go to https://vercel.com and click **Sign Up**
2. Sign in with GitHub

---

## Step 2: Set Up the Database (5 min)

1. In Supabase, go to your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase/migrations/001_initial_schema.sql` from this project
5. Paste the entire contents into the editor
6. Click **Run** (green button)
7. You should see "Success. No rows returned"

---

## Step 3: Get Your API Keys (2 min)

1. In Supabase, go to **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4: Configure Auth (3 min)

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to `http://localhost:3000` (update to your Vercel URL later)
3. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`

### Enable Email Auth
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it is by default)

---

## Step 5: Run Locally (5 min)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Fill in your keys from Step 3
# Open .env.local in any text editor and paste your Supabase URL and keys

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 — you should see the login page.

---

## Step 6: Create Your First Accounts (5 min)

### Studio account (you, the business owner)
1. Go to http://localhost:3000/auth/login
2. Click **Create Account**
3. Sign up with your email
4. In Supabase SQL Editor, run this to make yourself the studio:
   ```sql
   update profiles set role = 'studio' where email = 'your@email.com';
   ```

### Test customer account
1. Open an incognito window
2. Go to http://localhost:3000/auth/login
3. Create a second account with a different email
4. This is what your customers will see

---

## Step 7: Deploy to Vercel (5 min)

```bash
# Push your code to GitHub first
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/peel-and-post.git
git push -u origin main
```

Then:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables (copy from your .env.local)
4. Click **Deploy**
5. Copy your Vercel URL (e.g. `https://peel-and-post.vercel.app`)
6. Update Supabase Auth → URL Configuration with your new Vercel URL

---

## Project Structure

```
peel-and-post/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   ← Run this in Supabase first
├── src/
│   ├── app/
│   │   ├── auth/login/page.tsx      ← Login & signup
│   │   ├── dashboard/page.tsx       ← Main dashboard
│   │   ├── orders/page.tsx          ← Orders with tabs
│   │   ├── messages/page.tsx        ← Realtime messaging
│   │   └── api/                     ← Backend API routes
│   │       ├── orders/route.ts
│   │       ├── messages/route.ts
│   │       └── proofs/route.ts
│   ├── components/                  ← Reusable UI components
│   ├── hooks/
│   │   └── useRealtime.ts           ← Live message updates
│   ├── lib/
│   │   ├── queries.ts               ← All database queries
│   │   └── supabase/                ← Supabase clients
│   └── types/index.ts               ← TypeScript types
├── .env.example                     ← Copy to .env.local
└── SETUP.md                         ← This file
```

---

## What's Included

| Feature | Status |
|---|---|
| Customer login / signup | ✅ |
| Place new orders | ✅ |
| View current & past orders | ✅ |
| Collapsible order cards | ✅ |
| Proof review (approve/revise) | ✅ |
| Realtime messaging | ✅ |
| File uploads (artwork) | ✅ |
| Notifications | ✅ |
| Studio vs customer roles | ✅ |
| Row-level security | ✅ |

## Coming Next

- Studio dashboard (admin view of all orders)
- Email notifications via Resend
- File upload UI with drag & drop
- Shipment tracking integration
- Order PDF receipts
