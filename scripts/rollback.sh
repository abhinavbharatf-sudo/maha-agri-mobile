#!/bin/bash
# ============================================================================
# MAHA-AGRI Government Digital Operations Platform
# Instant Automated Production Rollback Script
# ============================================================================

set -e

NAMESPACE="maha-agri-prod"

echo "============================================================================"
echo "EMERGENCY ROLLBACK INITIATED FOR MAHA-AGRI PLATFORM"
echo "============================================================================"

# 1. Rollback Backend Deployment
echo "[STEP 1/2] Rolling back Backend Deployment to Previous Revision..."
kubectl rollout undo deployment/maha-agri-backend -n ${NAMESPACE}
kubectl rollout status deployment/maha-agri-backend -n ${NAMESPACE}

# 2. Rollback Frontend Deployment
echo "[STEP 2/2] Rolling back Frontend Deployment to Previous Revision..."
kubectl rollout undo deployment/maha-agri-frontend -n ${NAMESPACE}
kubectl rollout status deployment/maha-agri-frontend -n ${NAMESPACE}

echo "============================================================================"
echo "MAHA-AGRI EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY"
echo "============================================================================"
