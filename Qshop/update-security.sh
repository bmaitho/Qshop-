#!/bin/bash

# Security Update Script for Qshop
# Fixes all known vulnerabilities by updating dependencies

set -e

echo "🔒 Starting Security Update Process..."
echo "======================================"

# Update frontend dependencies
echo ""
echo "📦 Updating frontend dependencies..."
cd "$(dirname "$0")"
npm install
npm audit fix --force || true

# Update backend dependencies
echo ""
echo "📦 Updating backend dependencies..."
cd backend
npm install
npm audit fix --force || true

# Run security audits
echo ""
echo "🔍 Running security audits..."
cd ..
echo ""
echo "Frontend Audit:"
npm audit || true

echo ""
echo "Backend Audit:"
cd backend
npm audit || true

cd ..

echo ""
echo "======================================"
echo "✅ Security update complete!"
echo ""
echo "Please review the audit results above."
echo "If vulnerabilities remain, they may require manual fixes."
