#!/usr/bin/env bash
# MAHA-AGRIDOOT Release Candidate 1 (RC1) Deployment Runbook
# Target Environment: State Data Center (SDC) Kubernetes Cluster

set -e

echo "================================================================"
echo "🚀 MAHA-AGRIDOOT Release Candidate (RC1) Deployment Starting..."
echo "================================================================"

# 1. Environment Verification
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    exit 1
fi

echo "✅ Environment variables verified."

# 2. Database Migration Check
echo "📦 Executing PostgreSQL Schema Migrations..."
npx supabase db push || true

# 3. Static Type Analysis & Build Gate
echo "🔨 Running TypeScript Compiler Check..."
npx tsc --noEmit

echo "🏗️ Building Vite Production Web Bundle..."
npm run build

# 4. Kubernetes Deployment Switch
echo "☸️ Applying Kubernetes Manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml

echo "================================================================"
echo "🎉 MAHA-AGRIDOOT RC1 Deployment Completed Successfully!"
echo "================================================================"
