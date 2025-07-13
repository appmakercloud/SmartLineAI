#!/bin/bash

# Build and push Docker image for Coolify

echo "Building Docker image..."
docker build -t smartline-api .

echo "Tagging image..."
docker tag smartline-api registry.yourdomain.com/smartline-api:latest

echo "Pushing to registry..."
docker push registry.yourdomain.com/smartline-api:latest

echo "Done! Now deploy in Coolify using the Docker image option"