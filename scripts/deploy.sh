#!/bin/bash
# ============================================================================
# MAHA-AGRI Government Digital Operations Platform
# Zero-Downtime Rolling Production Deployment Script
# ============================================================================

set -e

NAMESPACE="maha-agri-prod"
VERSION="${1:-v1.0.0}"

echo "============================================================================"
echo "MAHA-AGRI PRODUCTION DEPLOYMENT STARTING (Target Version: ${VERSION})"
echo "============================================================================"

# 1. Apply Kubernetes Configurations & Secrets
echo "[STEP 1/5] Applying ConfigMaps and Secrets..."
kubectl apply -f kubernetes/configmap.yaml -n ${NAMESPACE}
kubectl apply -f kubernetes/secret.yaml -n ${NAMESPACE}

# 2. Database Migrations (Zero-Downtime Compatible)
echo "[STEP 2/5] Running PostgreSQL Database Migrations..."
kubectl exec -n ${NAMESPACE} deployment/maha-agri-backend -- npx prisma migrate deploy

# 3. Apply Services & Ingress Routes
echo "[STEP 3/5] Applying Kubernetes Services and Ingress TLS..."
kubectl apply -f kubernetes/service.yaml -n ${NAMESPACE}
kubectl apply -f kubernetes/ingress.yaml -n ${NAMESPACE}

# 4. Trigger Rolling Update Deployment
echo "[STEP 4/5] Updating Container Deployment Images..."
kubectl set image deployment/maha-agri-backend backend=registry.mahaagri.gov.in/maha-agri/backend:${VERSION} -n ${NAMESPACE}
kubectl set image deployment/maha-agri-frontend frontend=registry.mahaagri.gov.in/maha-agri/frontend:${VERSION} -n ${NAMESPACE}

# 5. Monitor Rolling Update Rollout Status
echo "[STEP 5/5] Monitoring Rolling Update Rollout..."
kubectl rollout status deployment/maha-agri-backend -n ${NAMESPACE}
kubectl rollout status deployment/maha-agri-frontend -n ${NAMESPACE}

echo "============================================================================"
echo "MAHA-AGRI PRODUCTION DEPLOYMENT SUCCESSFUL (Version: ${VERSION})"
echo "============================================================================"
