# 🚀 AWS EC2 Deployment Guide

Complete guide to deploy the Plastic Configurator on AWS EC2.

---

## 📋 Prerequisites

- AWS Account
- AWS CLI installed (optional, can use AWS Console)
- SSH key pair for EC2 access

---

## 🎯 Step 1: Create EC2 Instance

### Option A: Using AWS Console (Easiest)

1. **Go to EC2 Dashboard**: https://console.aws.amazon.com/ec2/

2. **Click "Launch Instance"**

3. **Configure Instance**:
   - **Name**: `plastic-configurator`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: `t2.small` (Free tier eligible)
     - t2.small: 1 vCPU, 2 GB RAM (Free for 750 hours/month for 12 months)
     - Note: FreeCAD may be slow, but it will work
   - **Key pair**: Create new or select existing
     - Download the `.pem` file and keep it safe!
   - **Network Settings**:
     - ✅ Allow SSH traffic from: Your IP
     - ✅ Allow HTTP traffic from: Anywhere
     - ✅ Allow HTTPS traffic from: Anywhere
   - **Storage**: 30 GB gp3 (Free tier: up to 30 GB)

4. **Click "Launch Instance"**

5. **Wait for instance to start** (Status: Running)

6. **Note the Public IP address**

### Option B: Using AWS CLI

```bash
# Create security group
aws ec2 create-security-group \
    --group-name plastic-configurator-sg \
    --description "Security group for Plastic Configurator"

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-name plastic-configurator-sg \
    --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name plastic-configurator-sg \
    --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name plastic-configurator-sg \
    --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t2.small \
    --key-name your-key-pair \
    --security-groups plastic-configurator-sg \
    --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=30}
```

---

## 🔐 Step 2: Connect to EC2 Instance

### On Windows (PowerShell):

```powershell
# Set permissions on key file
icacls "your-key.pem" /inheritance:r
icacls "your-key.pem" /grant:r "$($env:USERNAME):(R)"

# Connect via SSH
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### On Mac/Linux:

```bash
# Set permissions on key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 📦 Step 3: Deploy Application

**Note**: t2.small has 2GB RAM. FreeCAD will work but may be slower for complex CAD generation. For better performance, consider upgrading to t2.medium after testing.

### Automated Deployment (Recommended):

Once connected to EC2:

```bash
# Download deployment script
curl -o deploy.sh https://raw.githubusercontent.com/wrximpreza/3d-plastic/main/aws-deploy.sh

# Make it executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- ✅ Install Docker & Docker Compose
- ✅ Install Nginx
- ✅ Clone your repository
- ✅ Build and start containers
- ✅ Configure reverse proxy
- ✅ Set up auto-start on boot

### Manual Deployment:

If you prefer manual setup, follow these steps:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt-get install -y git

# Clone repository
git clone https://github.com/wrximpreza/3d-plastic.git
cd 3d-plastic

# Get your public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create backend .env
cat > backend/.env << EOF
HOST=0.0.0.0
PORT=8000
DEBUG=False
CORS_ORIGINS=http://$PUBLIC_IP,https://$PUBLIC_IP
STORAGE_TYPE=local
STORAGE_PATH=/app/storage/cad_files
FREECAD_PATH=/usr/lib/freecad-python3/lib
FREECAD_PYTHON=/usr/bin/freecadcmd
EOF

# Create frontend .env
cat > frontend/.env << EOF
VITE_API_URL=http://$PUBLIC_IP:8000
EOF

# Build and start
sudo docker-compose up -d --build

# Install and configure Nginx
sudo apt-get install -y nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/plastic-configurator > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/plastic-configurator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🌐 Step 4: Access Your Application

Your application is now live at:

```
http://YOUR_EC2_PUBLIC_IP
```

Backend API docs:
```
http://YOUR_EC2_PUBLIC_IP/api/docs
```

---

## 🔒 Step 5: Set Up HTTPS (Optional but Recommended)

### Using Let's Encrypt (Free SSL):

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
```

---

## 💰 Cost Estimate

### Free Tier (First 12 Months):
- **EC2 Instance (t2.small)**: FREE (750 hours/month)
- **Storage (30 GB gp3)**: FREE (up to 30 GB)
- **Data Transfer**: FREE (first 100 GB/month)

**Total Cost**: $0/month for first 12 months! ✅

### After Free Tier Expires:
- **EC2 Instance (t2.small)**: ~$16.80/month (24/7)
- **Storage (30 GB)**: ~$2.40/month
- **Data Transfer**: FREE (first 100 GB/month)

**Total Estimate**: ~$19-20/month for 24/7 operation

### Cost Optimization:
- **Stop instance when not in use** (pay only for storage ~$2.40/month)
- **Use Spot Instances** for development (~70% cheaper)
- **Upgrade to t2.medium** if you need better performance (~$33/month)

---

## 🛠️ Management Commands

### Check Status:
```bash
sudo docker-compose ps
```

### View Logs:
```bash
# All services
sudo docker-compose logs -f

# Backend only
sudo docker-compose logs -f backend

# Frontend only
sudo docker-compose logs -f frontend
```

### Restart Services:
```bash
sudo docker-compose restart
```

### Update Application:
```bash
cd /home/ubuntu/3d-plastic
git pull
sudo docker-compose up -d --build
```

### Stop Application:
```bash
sudo docker-compose down
```

---

## 🐛 Troubleshooting

### Check if Docker is running:
```bash
sudo systemctl status docker
```

### Check Nginx status:
```bash
sudo systemctl status nginx
```

### Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Rebuild containers:
```bash
sudo docker-compose down
sudo docker-compose up -d --build
```

### Check disk space:
```bash
df -h
```

### Clean up Docker:
```bash
sudo docker system prune -a
```

---

## 🔄 Auto-Start on Reboot

The deployment script sets this up automatically, but if needed:

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Docker Compose services will auto-start with Docker
```

---

## 📊 Monitoring

### Install monitoring tools:
```bash
# Install htop for resource monitoring
sudo apt-get install -y htop

# Run htop
htop
```

### Check resource usage:
```bash
# CPU and memory
free -h
top

# Disk usage
df -h
du -sh /home/ubuntu/3d-plastic
```

---

## 🎉 You're Done!

Your application is now running on AWS EC2 with:
- ✅ Docker containers
- ✅ Nginx reverse proxy
- ✅ FreeCAD support
- ✅ SQLite database
- ✅ Auto-start on reboot
- ✅ Production-ready setup

---

## 📞 Need Help?

- Check logs: `sudo docker-compose logs -f`
- Check Nginx: `sudo nginx -t`
- Restart everything: `sudo reboot`

