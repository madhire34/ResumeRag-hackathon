# 🚀 Deployment Guide - ResumeRAG

## Quick Deploy Options

### Option 1: Vercel (Frontend) + Render (Backend) - RECOMMENDED ✅

**Best for:** Quick deployment, free tier available

#### Step 1: Deploy Backend to Render

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `madhire34/ResumeRag-hackathon`
4. Configure:
   - **Name:** resumerag-backend
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_secure_secret_key
   OPENAI_API_KEY=your_openai_key (or leave empty if using Ollama)
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

6. Click "Create Web Service"
7. Note your backend URL: `https://resumerag-backend.onrender.com`

#### Step 2: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

5. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://resumerag-backend.onrender.com
   ```

6. Click "Deploy"
7. Your app will be live at: `https://resumerag.vercel.app`

---

### Option 2: Railway (Full Stack) - EASIEST 🎯

**Best for:** Simplest deployment, both frontend & backend together

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect both services

**For Backend:**
- Add environment variables (same as above)
- Railway will auto-assign a URL

**For Frontend:**
- Add `REACT_APP_API_URL` pointing to backend URL
- Railway will build and deploy

---

### Option 3: Heroku (Traditional) 

**Best for:** Established platform, easy scaling

#### Backend Deployment:

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Run commands:
   ```bash
   cd backend
   heroku login
   heroku create resumerag-backend
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your_mongodb_uri
   heroku config:set JWT_SECRET=your_secret
   heroku config:set OPENAI_API_KEY=your_key
   
   git push heroku main
   ```

#### Frontend Deployment:

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to Vercel or Netlify (easier for React apps)

---

### Option 4: DigitalOcean App Platform

**Best for:** More control, affordable

1. Go to https://cloud.digitalocean.com
2. Create new App
3. Connect GitHub repository
4. Configure both services (backend & frontend)
5. Add environment variables
6. Deploy

---

## Pre-Deployment Checklist ✅

### 1. Update Frontend API URL

Edit `frontend/src/lib/api.ts`:
```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

### 2. Update Backend CORS

Edit `backend/src/server.js` - ensure CORS allows your frontend URL:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
};
```

### 3. MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com
2. Create a cluster (free tier available)
3. Get connection string
4. Add to environment variables

### 4. Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/resumerag
JWT_SECRET=your-super-secret-key-change-this
OPENAI_API_KEY=sk-... (optional)
FRONTEND_URL=https://your-frontend-url.com
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://your-backend-url.com
```

---

## Quick Deploy Commands

### For Render (Backend):

Create `render.yaml` in root:
```yaml
services:
  - type: web
    name: resumerag-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: OPENAI_API_KEY
        sync: false
```

### For Vercel (Frontend):

Create `vercel.json` in frontend folder:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "devCommand": "npm start",
  "installCommand": "npm install"
}
```

---

## Post-Deployment Steps

### 1. Create Admin User

SSH into your backend or use the MongoDB shell:
```javascript
// Run this in MongoDB Atlas Data Explorer
db.users.insertOne({
  name: "Admin User",
  email: "admin@mail.com",
  password: "$2a$12$hashed_password_here", // Use bcrypt to hash
  role: "admin",
  company: "ResumeRAG",
  emailVerified: true,
  isActive: true,
  createdAt: new Date()
});
```

Or create a seed script and run it once.

### 2. Test the Deployment

1. Visit your frontend URL
2. Try to login with admin@mail.com
3. Upload a test resume
4. Try AI search

### 3. Monitor Logs

- **Render:** Check logs in dashboard
- **Vercel:** Check deployment logs
- **Railway:** Real-time logs available

---

## Troubleshooting

### Issue: CORS Errors
**Fix:** Update `FRONTEND_URL` in backend environment variables

### Issue: API Not Connecting
**Fix:** Check `REACT_APP_API_URL` in frontend environment variables

### Issue: MongoDB Connection Failed
**Fix:** 
- Whitelist IP address in MongoDB Atlas (use 0.0.0.0/0 for all IPs)
- Check connection string format

### Issue: Build Fails
**Fix:**
- Check Node version (use Node 18+)
- Clear cache and rebuild
- Check all dependencies are in package.json

---

## Cost Estimates

### Free Tier (Recommended for Hackathon):
- **MongoDB Atlas:** Free (512MB)
- **Render:** Free (750 hours/month)
- **Vercel:** Free (unlimited deployments)
- **Total:** $0/month ✅

### Paid Tier (Production):
- **MongoDB Atlas:** $9/month (2GB)
- **Render:** $7/month (backend)
- **Vercel:** Free (frontend)
- **Total:** ~$16/month

---

## Recommended: Render + Vercel (Free)

**Why?**
- ✅ Completely free
- ✅ Auto-deploy on git push
- ✅ SSL certificates included
- ✅ Easy to set up
- ✅ Good performance

**Deployment Time:** ~15 minutes

---

## Need Help?

1. Check deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check MongoDB connection

Your app will be live and ready for the hackathon! 🎉
