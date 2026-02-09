#!/bin/bash
docker run -d \
  --name recipes-app \
  -p 8003:8003 \
  -v ./:/app/recipes-data \
  -e NODE_ENV=production \
  -e PORT=8003 \
  home.shotton.us:5443/recipes:latest