#!/bin/bash
echo "Installing packages..."
cd "$(dirname "$0")/backend"
npm install --ignore-scripts
echo ""
echo "Server starting at http://localhost:5000"
echo "Login: admin@royalcafe.com / admin123"
node server.js
