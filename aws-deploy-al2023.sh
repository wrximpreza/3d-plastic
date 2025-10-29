#!/bin/bash

# AWS EC2 Deployment Script for Plastic Configurator (Amazon Linux 2023)
# This script sets up the application on Amazon Linux 2023

set -e

echo "=========================================="
echo "Plastic Configurator - AWS EC2 Deployment"
echo "Amazon Linux 2023"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install Docker
echo "Installing Docker..."
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "Installing Git..."
sudo dnf install -y git

# Install Nginx
echo "Installing Nginx..."
sudo dnf install -y nginx
sudo systemctl enable nginx

# Clone repository
echo "Cloning repository..."
cd /home/ec2-user
if [ -d "3d-plastic" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd 3d-plastic
    git pull
else
    git clone https://github.com/wrximpreza/3d-plastic.git
    cd 3d-plastic
fi

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create environment file for backend
echo "Creating backend environment file..."
cat > backend/.env << EOF
HOST=0.0.0.0
PORT=8000
DEBUG=False
CORS_ORIGINS=http://${PUBLIC_IP},https://${PUBLIC_IP}
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/cad_files
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd
EOF

# Create environment file for frontend
echo "Creating frontend environment file..."
cat > frontend/.env << EOF
VITE_API_URL=http://${PUBLIC_IP}:8000
EOF

# Build and start Docker containers
echo "Building and starting Docker containers..."
echo "This may take 10-15 minutes for the first build..."
sudo docker-compose up -d --build

# Configure Nginx as reverse proxy
echo "Configuring Nginx..."
sudo tee /etc/nginx/conf.d/plastic-configurator.conf > /dev/null << 'NGINX_EOF'
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
NGINX_EOF

# Test and start Nginx
sudo nginx -t
sudo systemctl start nginx

# Enable services to start on boot
sudo systemctl enable nginx
sudo systemctl enable docker

# Fix permissions for ec2-user
sudo chown -R ec2-user:ec2-user /home/ec2-user/3d-plastic

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is now running at:"
echo "http://${PUBLIC_IP}"
echo ""
echo "Backend API: http://${PUBLIC_IP}/api/docs"
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
echo "Note: You may need to log out and back in for Docker group permissions to take effect."
echo "If docker commands fail, run: newgrp docker"
echo ""
echo "=========================================="

