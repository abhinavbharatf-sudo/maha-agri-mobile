#!/usr/bin/env bash
# MAHA-AGRIDOOT Database Backup & S3 Archive Script
# Automated Daily Backup Strategy for RC1 Release

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/maha_agri"
BACKUP_FILE="${BACKUP_DIR}/maha_agri_db_${TIMESTAMP}.sql.gz"

mkdir -p ${BACKUP_DIR}

echo "================================================================"
echo "📦 Starting PostgreSQL Backup: ${BACKUP_FILE}"
echo "================================================================"

pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"

echo "✅ Backup Completed Successfully. Size: $(du -sh ${BACKUP_FILE} | cut -f1)"

# Sync to S3 Glacier Storage if configured
if [ -n "$S3_BACKUP_BUCKET" ]; then
    echo "☁️ Syncing Backup to S3 Cold Storage..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/db-backups/"
    echo "✅ S3 Upload Completed."
fi
