# 🚀 Deploy to Render - Step by Step Guide

## Prerequisites

✅ GitHub account  
✅ Render account (free) - https://render.com  
✅ Your code ready to push  

---

## Step 1: Push Code to GitHub

### If you don't have a GitHub repository yet:

1. **Go to GitHub**: https://github.com
2. **Click "New Repository"**
3. **Repository settings**:
   - Name: `plastic-configurator` (or any name you prefer)
   - Visibility: Public or Private (both work with Render)
   - Don't initialize with README (we already have code)
4. **Copy the repository URL** (e.g., `https://github.com/yourusername/plastic-configurator.git`)

### Push your code:

```bash
# Add GitHub as remote
git remote add origin https://github.com/yourusername/plastic-configurator.git

# Push to GitHub
git branch -M master
git push -u origin master
```

---

## Step 2: Deploy on Render

### Option A: Automatic Deployment (Recommended - Uses render.yaml)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"Blueprint"**
3. **Connect GitHub**:
   - Click "Connect account" if not already connected
   - Authorize Render to access your repositories
4. **Select your repository**: `plastic-configurator`
5. **Render will detect `render.yaml`** automatically
6. **Click "Apply"**
7. **Wait for deployment** (5-10 minutes):
   - Backend will deploy first
   - Frontend will deploy after backend

### Option B: Manual Deployment

If automatic deployment doesn't work, deploy manually:

#### Deploy Backend:

1. **Click "New +"** → **"Web Service"**
2. **Connect repository**: Select `plastic-configurator`
3. **Configure**:
   - **Name**: `plastic-configurator-backend`
   - **Region**: Frankfurt (or closest to you)
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Plan**: Free
4. **Add Disk** (Important for SQLite):
   - Click "Add Disk"
   - **Name**: `backend-data`
   - **Mount Path**: `/app`
   - **Size**: 1 GB (free)
5. **Environment Variables**:
   ```
   HOST=0.0.0.0
   PORT=8000
   DEBUG=False
   CORS_ORIGINS=https://plastic-configurator-frontend.onrender.com
   STORAGE_TYPE=local
   STORAGE_PATH=/app/storage/cad_files
   FREECAD_PATH=/usr/lib/freecad-python3/lib
   FREECAD_PYTHON=/usr/bin/freecadcmd
   ```
6. **Click "Create Web Service"**
7. **Wait for deployment** (5-10 minutes)
8. **Copy the backend URL** (e.g., `https://plastic-configurator-backend.onrender.com`)

#### Deploy Frontend:

1. **Click "New +"** → **"Static Site"**
2. **Connect repository**: Select `plastic-configurator`
3. **Configure**:
   - **Name**: `plastic-configurator-frontend`
   - **Region**: Frankfurt
   - **Branch**: `master`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://plastic-configurator-backend.onrender.com
   ```
   (Use the backend URL you copied earlier)
5. **Click "Create Static Site"**
6. **Wait for deployment** (3-5 minutes)

---

## Step 3: Update CORS Settings

After frontend deploys, you need to update backend CORS to allow the frontend URL:

1. **Go to Backend Service** in Render dashboard
2. **Click "Environment"**
3. **Update `CORS_ORIGINS`**:
   ```
   CORS_ORIGINS=https://plastic-configurator-frontend.onrender.com
   ```
   (Replace with your actual frontend URL)
4. **Click "Save Changes"**
5. **Backend will redeploy automatically**

---

## Step 4: Test Your Deployment

1. **Open your frontend URL**: `https://plastic-configurator-frontend.onrender.com`
2. **Test the application**:
   - ✅ 3D viewer loads
   - ✅ Can change parameters
   - ✅ Can download CAD files
   - ✅ Can place orders

---

## 🎉 You're Live!

Your application is now deployed on Render with:
- ✅ Backend with FreeCAD support
- ✅ SQLite database (persistent)
- ✅ Frontend with React
- ✅ Free hosting
- ✅ HTTPS enabled
- ✅ Auto-deploy on git push

---

## 📝 Important Notes

### Free Tier Limitations:
- ⚠️ **Services spin down after 15 minutes of inactivity**
- ⚠️ **First request after spin-down takes 30-60 seconds** (cold start)
- ✅ **750 hours/month free** (enough for one service running 24/7)
- ✅ **100 GB bandwidth/month**

### Custom Domain (Optional):
1. Go to your service settings
2. Click "Custom Domain"
3. Add your domain
4. Update DNS records as instructed

### Monitoring:
- **Logs**: Click on service → "Logs" tab
- **Metrics**: Click on service → "Metrics" tab
- **Health**: Backend has `/api/health` endpoint

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check logs in Render dashboard
# Common issues:
# - FreeCAD installation failed → Check Dockerfile
# - Port binding issue → Ensure PORT=8000
# - Disk not mounted → Check disk configuration
```

### Frontend can't connect to backend:
```bash
# Check:
# 1. VITE_API_URL is correct in frontend env vars
# 2. CORS_ORIGINS includes frontend URL in backend
# 3. Backend is running (check status in dashboard)
```

### CAD generation fails:
```bash
# Check backend logs for FreeCAD errors
# Verify FreeCAD is installed:
# - Go to backend service
# - Click "Shell" tab
# - Run: freecadcmd --version
```

### Database issues:
```bash
# Ensure disk is mounted at /app
# Check disk usage in Render dashboard
# SQLite file should be at /app/plastic_configurator.db
```

---

## 🔄 Updating Your Deployment

To deploy updates:

```bash
# Make changes to your code
git add .
git commit -m "your changes"
git push

# Render will automatically deploy the changes
```

---

## 💰 Cost Estimate

**Free Tier (Current Setup):**
- Backend Web Service: $0/month (free tier)
- Frontend Static Site: $0/month (free tier)
- Disk (1GB): $0/month (free tier)
- **Total: $0/month** ✅

**If you need to upgrade:**
- Backend (no sleep): $7/month
- More disk space: $0.25/GB/month
- Custom domain: Free

---

## 📞 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Check backend logs** in Render dashboard
- **Check frontend build logs** in Render dashboard

---

Good luck with your deployment! 🚀

