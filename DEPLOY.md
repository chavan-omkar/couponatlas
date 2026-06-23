# Free Deployment Guide — Zero Cost, Zero API Keys

## Architecture

```
GitHub Actions (free) → scrapes coupons → Neon DB (free Postgres)
                                                ↑
Vercel (free) ← Next.js frontend    Render (free) ← Node.js API
```

---

## Step 1 — Neon (Free Postgres Database)

1. Go to https://neon.tech → Sign up free (GitHub login works)
2. Click **New Project** → give it any name (e.g. `coupon-site`)
3. Select region closest to you
4. Once created, click **Connection string** → copy the URL  
   It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
5. **Save this URL** — you'll need it in Steps 2, 3, and 4

---

## Step 2 — Push Code to GitHub

```bash
cd coupon-site
git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/coupon-site.git
git push -u origin main
```

---

## Step 3 — Add GitHub Secret (for scraper)

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `DATABASE_URL`  
   Value: *(paste the Neon connection string from Step 1)*
4. Click **Add secret**

Now run the scraper manually to populate your DB:
- Go to **Actions** tab in your repo
- Click **Scrape Coupons** → **Run workflow** → **Run workflow**
- Watch it run (~5-10 min). First run will create all tables and scrape coupons.

---

## Step 4 — Render (Free Node.js API)

1. Go to https://render.com → Sign up free (GitHub login works)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Render will auto-detect `render.yaml`. If not, set manually:
   - **Build command:** `npm install && npx prisma generate`
   - **Start command:** `npm start`
   - **Plan:** Free
6. Add environment variables:
   - `DATABASE_URL` → *(Neon URL from Step 1)*
   - `NODE_ENV` → `production`
   - `ADMIN_API_KEY` → *(any random string, e.g. `mysecretkey123`)*
   - `FRONTEND_URL` → *(leave blank for now, add after Step 5)*
7. Click **Create Web Service**
8. Wait ~2 min for deploy. You'll get a URL like `https://coupon-api-xxxx.onrender.com`

> ⚠️ Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30 sec.
> This is fine for a coupon site — just not ideal for real-time APIs.

---

## Step 5 — Vercel (Free Next.js Frontend)

1. Go to https://vercel.com → Sign up free (GitHub login works)
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Set **Root Directory** to `frontend`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` → *(Render URL from Step 4, e.g. `https://coupon-api-xxxx.onrender.com`)*
6. Click **Deploy**
7. You'll get a URL like `https://coupon-site-xxx.vercel.app`

**After Vercel deploys**, go back to Render and add:
- `FRONTEND_URL` → *(your Vercel URL)*  
Then click **Manual Deploy** in Render to apply it.

---

## Step 6 — Test Everything

```bash
# Check API is up
curl https://coupon-api-xxxx.onrender.com/health

# Check coupons exist
curl https://coupon-api-xxxx.onrender.com/api/coupons?limit=3

# Check admin stats
curl -H "x-admin-key: mysecretkey123" \
  https://coupon-api-xxxx.onrender.com/api/admin/stats
```

Visit your Vercel URL — you should see coupons listed.

---

## Scraping Schedule

GitHub Actions runs the scraper **every 6 hours** automatically (free, no setup needed).

To run it manually anytime:
- GitHub repo → **Actions** → **Scrape Coupons** → **Run workflow**

To change the schedule, edit `.github/workflows/scrape.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'   # every 6h
  # - cron: '0 */12 * * *' # every 12h
  # - cron: '0 2 * * *'    # daily at 2am
```

---

## Adding Ads (Later, When You Have Traffic)

1. Apply for Google AdSense at https://adsense.google.com (free, needs a live site with content)
2. Once approved, add to Vercel environment variables:
   ```
   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXXX
   NEXT_PUBLIC_AD_SLOT_LEADERBOARD=XXXXXXXXXX
   NEXT_PUBLIC_AD_SLOT_SIDEBAR=XXXXXXXXXX
   NEXT_PUBLIC_AD_SLOT_INFEED=XXXXXXXXXX
   NEXT_PUBLIC_AD_SLOT_FOOTER=XXXXXXXXXX
   ```
3. Redeploy on Vercel — ads go live automatically, no code changes needed.

---

## Cost Summary

| Service        | What it does       | Free tier limit                  |
|----------------|--------------------|----------------------------------|
| Neon           | Postgres database  | 500 MB storage, 1 project        |
| Render         | Node.js API        | 750 hrs/month, sleeps when idle  |
| Vercel         | Next.js frontend   | 100 GB bandwidth/month           |
| GitHub Actions | Scraper (cron)     | 2000 min/month (public repo: unlimited) |

**Total cost: $0**
