#!/bin/bash

# AWS EC2 Deployment Script for Plastic Configurator
# This script sets up the application on a fresh Ubuntu EC2 instance

set -e

echo "=========================================="
echo "Plastic Configurator - AWS EC2 Deployment"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "Installing Git..."
sudo apt-get install -y git

# Install Nginx (as reverse proxy)
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Clone repository
echo "Cloning repository..."
cd /home/ubuntu
if [ -d "3d-plastic" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd 3d-plastic
    git pull
else
    git clone https://github.com/wrximpreza/3d-plastic.git
    cd 3d-plastic
fi

# Create environment file for backend
echo "Creating backend environment file..."
cat > backend/.env << EOF
HOST=0.0.0.0
PORT=8000
DEBUG=False
CORS_ORIGINS=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4),https://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/cad_files
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd
EOF

# Create environment file for frontend
echo "Creating frontend environment file..."
cat > frontend/.env << EOF
VITE_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
EOF

# Build and start Docker containers
echo "Building and starting Docker containers..."
sudo docker-compose up -d --build

# Configure Nginx as reverse proxy
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/plastic-configurator > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/plastic-configurator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx

# Enable services to start on boot
sudo systemctl enable nginx
sudo systemctl enable docker

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is now running at:"
echo "http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api/docs"
echo ""
echo "To check status:"
echo "  sudo docker-compose ps"
echo ""
echo "To view logs:"
echo "  sudo docker-compose logs -f"
echo ""
echo "To restart services:"
echo "  sudo docker-compose restart"
echo ""
echo "=========================================="

