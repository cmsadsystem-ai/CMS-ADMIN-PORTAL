#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=========================================="
echo "Step 1: Building Frontend (React + Vite)"
echo "=========================================="
cd cms-admission-Frontend
npm install
npm run build
cd ..

echo "=========================================="
echo "Step 2: Installing Backend Dependencies"
echo "=========================================="
cd cms-admission-backend/cms-admission-backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ../..

echo "=========================================="
echo "Build Completed Successfully!"
echo "=========================================="
