# 🚀 Vercel Frontend Deployment Guide

This guide will help you deploy the ResumeRAG frontend to Vercel.

---

## Prerequisites

- GitHub account with your code pushed
- Vercel account (free tier works fine)
- Backend deployed on Render (get the URL first)

---

## Step-by-Step Deployment

### 1. Sign Up / Login to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** or **"Login"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub repositories

### 2. Import Your Project

1. On the Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find and select your repository: **`madhire34/ResumeRag-hackathon`**
3. Click **"Import"**

### 3. Configure Project Settings

#### Root Directory
- Set **Root Directory** to: `frontend`
- Click **"Edit"** next to Root Directory and type `frontend`

#### Framework Preset
- Vercel should auto-detect **"Create React App"**
- If not, select it manually from the dropdown

#### Build Settings (Auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### 4. Add Environment Variables

Click **"Environment Variables"** and add:

| Name | Value | Notes |
|------|-------|-------|
| `REACT_APP_API_URL` | `https://your-backend.onrender.com/api` | Replace with your Render backend URL |
| `REACT_APP_APP_NAME` | `ResumeRAG` | App name |
| `REACT_APP_VERSION` | `1.0.0` | Version |
| `GENERATE_SOURCEMAP` | `false` | Disable source maps for production |

**Important:** Replace `your-backend.onrender.com` with your actual Render backend URL!

### 5. Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. You'll see a success screen with your live URL!

---

## Post-Deployment Steps

### 1. Get Your Frontend URL

After deployment, Vercel will give you a URL like:
```
https://resume-rag-hackathon.vercel.app
```

### 2. Update Backend CORS

Your backend needs to allow requests from your Vercel frontend:

1. Go to your Render dashboard
2. Open your backend service
3. Go to **"Environment"** tab
4. Update the `FRONTEND_URL` variable to your Vercel URL:
   ```
   FRONTEND_URL=https://resume-rag-hackathon.vercel.app
   ```
5. Click **"Save Changes"**
6. Your backend will automatically redeploy

### 3. Test Your Deployment

Visit your Vercel URL and test:
- ✅ Login page loads
- ✅ Can login with test credentials
- ✅ Can upload resumes
- ✅ Can search candidates
- ✅ API calls work

---

## Custom Domain (Optional)

### Add Your Own Domain

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (5-30 minutes)

---

## Troubleshooting

### Build Fails

**Error: `npm install` failed**
- Check `package.json` is valid
- Ensure all dependencies are listed

**Error: `npm run build` failed**
- Check for TypeScript errors locally first
- Run `npm run build` locally to test

### API Connection Issues

**Error: Network Error / CORS**
- Verify `REACT_APP_API_URL` is correct
- Check backend `FRONTEND_URL` includes your Vercel domain
- Ensure backend is running on Render

**Error: 401 Unauthorized**
- Clear browser localStorage
- Try logging in again
- Check backend JWT_SECRET is set

### Environment Variables Not Working

- Environment variables must start with `REACT_APP_`
- Redeploy after changing environment variables
- Check the "Deployments" tab to see which variables were used

---

## Redeployment

### Automatic Redeployment

Vercel automatically redeploys when you push to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

### Manual Redeployment

1. Go to Vercel dashboard
2. Click on your project
3. Go to **"Deployments"** tab
4. Click **"..."** on latest deployment
5. Click **"Redeploy"**

---

## Vercel CLI (Advanced)

### Install Vercel CLI

```bash
npm install -g vercel
```

### Deploy from Command Line

```bash
cd frontend
vercel
```

### Deploy to Production

```bash
vercel --prod
```

---

## Performance Optimization

### Enable Caching

Already configured in `vercel.json`:
- Static assets cached for 1 year
- HTML files not cached (for updates)

### Enable Compression

Vercel automatically enables:
- Gzip compression
- Brotli compression

### Monitor Performance

1. Go to Vercel dashboard
2. Click **"Analytics"** tab
3. View performance metrics

---

## Cost

**Free Tier Includes:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments

**Upgrade if you need:**
- More bandwidth
- Team collaboration
- Advanced analytics

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Discord**: https://vercel.com/discord
- **GitHub Issues**: Create an issue in your repo

---

## Quick Reference

### Your URLs

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://your-app.vercel.app |
| **Backend (Render)** | https://your-backend.onrender.com |
| **Database (MongoDB)** | mongodb+srv://... |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@resumerag.com | admin123 |
| Recruiter | recruiter@resumerag.com | test123 |
| Candidate | candidate@resumerag.com | test123 |

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Update backend CORS settings
3. ✅ Test the live application
4. ✅ Share the URL with your team/judges
5. ✅ Monitor for errors in Vercel dashboard

**Your app is now live! 🎉**
