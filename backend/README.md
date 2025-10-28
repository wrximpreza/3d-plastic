# Plastic Parts Configurator - Backend API

Python FastAPI backend with FreeCAD integration for generating CAD files and managing orders.

## 🚀 Features

- **CAD Generation**: Generate STEP and DXF files using FreeCAD
- **Order Management**: Create and track orders with database persistence
- **Visma Integration**: Send orders to Visma order management system
- **File Storage**: Support for local filesystem and AWS S3
- **RESTful API**: Well-documented API with OpenAPI/Swagger
- **Docker Support**: Containerized deployment with Docker Compose

## 📋 Requirements

- Python 3.10+
- FreeCAD (for production CAD generation)
- PostgreSQL (for production) or SQLite (for development)
- Docker & Docker Compose (optional)

## 🛠️ Installation

### Option 1: Local Development (without FreeCAD)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the server
python main.py
```

The API will be available at http://localhost:8000

### Option 2: Docker (with FreeCAD)

```bash
cd backend

# Build and start services
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

The API will be available at http://localhost:8000

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 🔌 API Endpoints

### Health Check
```http
GET /api/health
```

### Generate CAD Files
```http
POST /api/cad/generate
Content-Type: application/json

{
  "config": {
    "width": 440,
    "height": 600,
    "thickness": 5,
    "material": "PE 500",
    "holes": [
      {"id": "1", "x": 20, "y": 20, "diameter": 8}
    ]
  },
  "format": "both"
}
```

**Response:**
```json
{
  "step_file_url": "/files/cad/part_abc123.step",
  "dxf_file_url": "/files/cad/part_abc123.dxf",
  "metadata": {
    "width": 440,
    "height": 600,
    "thickness": 5,
    "material": "PE 500",
    "holes_count": 1,
    "area_mm2": 264000,
    "volume_mm3": 1320000,
    "generated_at": "2025-10-28T12:00:00"
  }
}
```

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "config": {
    "width": 440,
    "height": 600,
    "thickness": 5,
    "material": "PE 500",
    "holes": [
      {"id": "1", "x": 20, "y": 20, "diameter": 8}
    ]
  },
  "quantity": 2,
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "notes": "Rush order"
}
```

**Response:**
```json
{
  "id": 1,
  "order_number": "ORD-20251028-A1B2C3",
  "config": { ... },
  "quantity": 2,
  "price": 125.50,
  "status": "pending",
  "step_file_url": "/files/orders/ORD-20251028-A1B2C3/order_ORD-20251028-A1B2C3.step",
  "dxf_file_url": "/files/orders/ORD-20251028-A1B2C3/order_ORD-20251028-A1B2C3.dxf",
  "created_at": "2025-10-28T12:00:00"
}
```

### Get Order
```http
GET /api/orders/{order_id}
```

### List Orders
```http
GET /api/orders?page=1&page_size=20&status_filter=pending
```

## ⚙️ Configuration

Edit `.env` file:

```bash
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:4173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/plastic_configurator

# FreeCAD
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd

# Storage
STORAGE_TYPE=local  # or 's3'
STORAGE_PATH=./storage/cad_files

# AWS S3 (if using S3 storage)
AWS_BUCKET_NAME=plastic-parts-cad-files
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Visma Integration
VISMA_API_URL=https://api.visma.com/v1
VISMA_API_KEY=your-api-key
```

## 🗄️ Database

### SQLite (Development)
```bash
# Default - no setup needed
DATABASE_URL=sqlite:///./plastic_configurator.db
```

### PostgreSQL (Production)
```bash
# Using Docker Compose
docker-compose up db

# Or install PostgreSQL and create database
createdb plastic_configurator

# Update .env
DATABASE_URL=postgresql://user:password@localhost:5432/plastic_configurator
```

## 🐳 Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend

# Run migrations (if needed)
docker-compose exec backend alembic upgrade head

# Access backend shell
docker-compose exec backend bash
```

## 📦 Project Structure

```
backend/
├── main.py                 # FastAPI application
├── config.py               # Configuration settings
├── database.py             # Database setup
├── models.py               # SQLAlchemy models
├── schemas.py              # Pydantic schemas
├── services/
│   ├── cad_service.py      # FreeCAD CAD generation
│   ├── storage_service.py  # File storage (local/S3)
│   └── visma_service.py    # Visma integration
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker image
├── docker-compose.yml      # Docker Compose config
├── .env.example            # Environment template
└── README.md               # This file
```

## 🔧 FreeCAD Integration

### With FreeCAD Installed

The service will use FreeCAD Python API to generate production-quality CAD files.

**Install FreeCAD:**

```bash
# Ubuntu/Debian
sudo apt-get install freecad-python3

# macOS
brew install freecad

# Windows
# Download from https://www.freecad.org/downloads.php
```

### Without FreeCAD (Fallback Mode)

The service will generate simplified STEP/DXF files that are valid but not production-quality. This is useful for development and testing.

## 🧪 Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html
```

## 🔐 Security

- Use strong `SECRET_KEY` in production
- Enable HTTPS/TLS
- Restrict CORS origins
- Use environment variables for secrets
- Implement authentication if needed
- Validate all user inputs
- Sanitize file uploads

## 📈 Performance

- Uses async/await for I/O operations
- Background tasks for long-running operations
- Database connection pooling
- File storage optimization
- Caching (can be added with Redis)

## 🚀 Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Use PostgreSQL database
- [ ] Configure proper CORS origins
- [ ] Set strong `SECRET_KEY`
- [ ] Use S3 for file storage
- [ ] Set up SSL/TLS certificates
- [ ] Configure Visma API credentials
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Deploy to Cloud

**AWS:**
```bash
# Use ECS with Docker image
docker build -t plastic-backend .
docker tag plastic-backend:latest <aws-account>.dkr.ecr.region.amazonaws.com/plastic-backend
docker push <aws-account>.dkr.ecr.region.amazonaws.com/plastic-backend
```

**Azure:**
```bash
# Use Azure Container Instances
az container create --resource-group myResourceGroup \
  --name plastic-backend \
  --image plastic-backend:latest \
  --ports 8000
```

**Google Cloud:**
```bash
# Use Cloud Run
gcloud run deploy plastic-backend \
  --image gcr.io/project-id/plastic-backend \
  --platform managed
```

## 🐛 Troubleshooting

### FreeCAD not found
```bash
# Check FreeCAD installation
which freecadcmd

# Update FREECAD_PATH in .env
FREECAD_PATH=/usr/lib/freecad-python3/lib
```

### Database connection error
```bash
# Check PostgreSQL is running
docker-compose ps

# Check DATABASE_URL is correct
echo $DATABASE_URL
```

### CORS errors
```bash
# Add frontend URL to CORS_ORIGINS
CORS_ORIGINS=http://localhost:3000,http://localhost:4173,https://yourdomain.com
```

## 📞 Support

For issues or questions:
1. Check API documentation at `/api/docs`
2. Review logs: `docker-compose logs -f backend`
3. Check environment variables
4. Verify FreeCAD installation

## 📄 License

Proprietary - All rights reserved

---

**Built with FastAPI + FreeCAD for custom plastic parts manufacturing**

