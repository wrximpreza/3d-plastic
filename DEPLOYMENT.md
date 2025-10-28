# Deployment Guide

This application can be deployed using Docker on various free platforms.

## 🐳 Local Docker Deployment

### Prerequisites
- Docker and Docker Compose installed

### Run the full stack locally:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Note:** Local deployment uses SQLite database (no PostgreSQL needed).

### Stop the services:
```bash
docker-compose down

# Remove volumes (storage and database data)
docker-compose down -v
```

---

## 🚀 Free Deployment Options

### Option 1: Render (Recommended)

**Features:**
- ✅ Free tier with Docker support
- ✅ PostgreSQL included
- ✅ Auto-deploy from Git
- ⚠️ Spins down after 15 min inactivity

**Steps:**

1. **Push code to GitHub**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin master
   ```

2. **Deploy on Render**
   - Go to https://render.com
   - Sign up/Login with GitHub
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will auto-detect `render.yaml`
   - Click "Apply"

3. **Update Frontend API URL**
   - After backend deploys, copy the backend URL
   - Update `frontend/src/services/api.ts` with the backend URL
   - Push changes to trigger redeployment

**Manual Deployment:**
- Create PostgreSQL database
- Create Web Service for backend (Docker)
- Create Static Site for frontend
- Set environment variables as shown in `render.yaml`

---

### Option 2: Railway

**Features:**
- ✅ $5 free credit monthly
- ✅ Docker support
- ✅ No cold starts
- ✅ PostgreSQL included

**Steps:**

1. **Push code to GitHub**

2. **Deploy on Railway**
   - Go to https://railway.app
   - Sign up/Login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Dockerfile

3. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will auto-create DATABASE_URL

4. **Set Environment Variables**
   ```
   CORS_ORIGINS=<your-frontend-url>
   STORAGE_TYPE=local
   FREECAD_PATH=/usr/lib/freecad-python3/lib
   FREECAD_PYTHON=/usr/bin/freecadcmd
   ```

5. **Deploy Frontend**
   - Create new service from same repo
   - Set root directory to `frontend`
   - Build command: `npm install && npm run build`
   - Start command: `npx serve -s dist -l $PORT`

---

### Option 3: Fly.io

**Features:**
- ✅ Free tier: 3 VMs
- ✅ Excellent Docker support
- ✅ PostgreSQL included

**Steps:**

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Initialize**
   ```bash
   fly auth login
   cd backend
   fly launch --no-deploy
   ```

3. **Create PostgreSQL**
   ```bash
   fly postgres create
   fly postgres attach <postgres-app-name>
   ```

4. **Deploy Backend**
   ```bash
   fly deploy
   ```

5. **Deploy Frontend**
   ```bash
   cd ../frontend
   fly launch --no-deploy
   fly deploy
   ```

---

### Option 4: Google Cloud Run

**Features:**
- ✅ Free tier: 2M requests/month
- ✅ Excellent Docker support
- ⚠️ Cold starts on free tier

**Steps:**

1. **Install Google Cloud CLI**
   - Download from https://cloud.google.com/sdk/docs/install

2. **Build and Push Backend**
   ```bash
   gcloud auth login
   gcloud config set project <your-project-id>
   
   cd backend
   gcloud builds submit --tag gcr.io/<project-id>/plastic-backend
   gcloud run deploy plastic-backend \
     --image gcr.io/<project-id>/plastic-backend \
     --platform managed \
     --region europe-west1 \
     --allow-unauthenticated
   ```

3. **Build and Push Frontend**
   ```bash
   cd ../frontend
   gcloud builds submit --tag gcr.io/<project-id>/plastic-frontend
   gcloud run deploy plastic-frontend \
     --image gcr.io/<project-id>/plastic-frontend \
     --platform managed \
     --region europe-west1 \
     --allow-unauthenticated
   ```

---

## 🔧 Environment Variables

### Backend (Local - SQLite)
```env
HOST=0.0.0.0
PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:80
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/cad_files
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd
```

### Backend (Production - PostgreSQL)
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
HOST=0.0.0.0
PORT=8000
DEBUG=False
CORS_ORIGINS=https://your-frontend-url.com
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/cad_files
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd
```

### Frontend
```env
VITE_API_URL=https://your-backend-url.com
```

---

## 📝 Notes

- **FreeCAD Support**: All Docker deployments include FreeCAD binary for CAD generation
- **Database**:
  - Local development uses SQLite (no setup needed)
  - Production deployments use PostgreSQL (included in all platforms)
- **Storage**: Local storage is used for CAD files (consider S3 for production)
- **Cold Starts**: Free tiers may have cold starts (15-30 seconds on first request)

---

## 🐛 Troubleshooting

### Backend won't start
- Check logs: `docker-compose logs backend`
- Verify FreeCAD installation: `docker exec -it plastic_configurator_backend freecadcmd --version`

### Frontend can't connect to backend
- Check CORS_ORIGINS includes frontend URL
- Verify API URL in frontend environment variables

### Database connection issues
- Ensure DATABASE_URL is correct
- Check database is healthy: `docker-compose ps`

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Fly.io Documentation](https://fly.io/docs)
- [Docker Documentation](https://docs.docker.com)

