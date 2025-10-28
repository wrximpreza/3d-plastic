# Multi-stage Dockerfile for Python backend with FreeCAD

# Stage 1: Base image with FreeCAD
FROM ubuntu:22.04 as base

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and FreeCAD
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    freecad-python3 \
    freecad \
    libfreecad-python3-0.20 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Stage 2: Application
FROM base

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create storage directory
RUN mkdir -p /app/storage/cad_files

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FREECAD_PATH=/usr/lib/freecad-python3/lib
ENV FREECAD_PYTHON=/usr/bin/freecadcmd

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:8000/api/health')"

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

