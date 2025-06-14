#!/bin/bash

# Install Node.js dependencies
npm install

# Build React frontend
npm run build

# Move build files to Flask static directory
mkdir -p static
cp -r dist/* static/

echo "✅ Frontend built and ready for Flask serving"