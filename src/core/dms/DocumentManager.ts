/**
 * Phase 2 Foundation Service 3: Enterprise Document Management System (DMS)
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Centralized document repository, preview, versioning, verification status (PENDING, VERIFIED, REJECTED),
 * SLA expiry tracking, digital signatures, and audit trail for all business entities.
 */

import { AuditLogger } from '../audit/auditLogger';

export type DocumentCategory =
  | 'KYC_ID_PROOF'
  | 'LAND_RECORD_712'
  | 'SOIL_HEALTH_REPORT'
  | 'EDP_TRAINING_CERTIFICATE'
  | 'LOAN_AGREEMENT'
  | 'APPOINTMENT_LETTER'
  | 'OFFICE_FILE';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface EnterpriseDocument {
  documentId: string;
  entityType: 'USER' | 'FARMER' | 'EDP_ENTREPRENEUR' | 'EMPLOYEE' | 'SOIL_REPORT';
  entityId: string;
  category: DocumentCategory;
  title: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  version: string;
  status: VerificationStatus;
  uploadedByUserId: string;
  uploadedByUserName: string;
  uploadedAt: string;
  verifiedByUserId?: string;
  verifiedByUserName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  digitalSignatureHash?: string;
  expiryDate?: string;
  is_active: boolean;
}

export class DocumentManagerService {
  private documents: EnterpriseDocument[] = [];

  constructor() {
    this.seedDefaultDocuments();
  }

  private seedDefaultDocuments() {
    this.documents = [
      {
        documentId: 'doc-712-9901',
        entityType: 'FARMER',
        entityId: 'user-mha-27',
        category: 'LAND_RECORD_712',
        title: '7/12 Land Parcel Extract - Wardha Gut No 142',
        fileUrl: 'https://cdn.mahaagri.gov.in/docs/712_gut142.pdf',
        fileSizeBytes: 1024500,
        mimeType: 'application/pdf',
        version: 'v1.0',
        status: 'VERIFIED',
        uploadedByUserId: 'user-mha-27',
        uploadedByUserName: 'Rahul D. Patil',
        uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        verifiedByUserId: 'user-mha-23',
        verifiedByUserName: 'Rahul Patil (District Coordinator)',
        verifiedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        digitalSignatureHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        is_active: true,
      },
      {
        documentId: 'doc-edp-cert-04',
        entityType: 'EDP_ENTREPRENEUR',
        entityId: 'user-mha-28',
        category: 'EDP_TRAINING_CERTIFICATE',
        title: 'State Agri-Drone Entrepreneurship Certification',
        fileUrl: 'https://cdn.mahaagri.gov.in/docs/edp_cert_04.pdf',
        fileSizeBytes: 2048000,
        mimeType: 'application/pdf',
        version: 'v1.0',
        status: 'VERIFIED',
        uploadedByUserId: 'user-mha-28',
        uploadedByUserName: 'Vikas Shinde',
        uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        verifiedByUserId: 'user-mha-21',
        verifiedByUserName: 'Shri V. K. Patil (State Admin)',
        verifiedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
        digitalSignatureHash: 'sha256-8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        is_active: true,
      },
    ];
  }

  public uploadDocument(
    doc: Omit<EnterpriseDocument, 'documentId' | 'status' | 'uploadedAt' | 'is_active'>
  ): EnterpriseDocument {
    const newDoc: EnterpriseDocument = {
      ...doc,
      documentId: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
      is_active: true,
    };

    this.documents.unshift(newDoc);

    AuditLogger.logAction({
      userId: doc.uploadedByUserId,
      userName: doc.uploadedByUserName,
      roleKey: 'USER',
      platformSlug: 'dms',
      action: 'UPLOAD_DOCUMENT',
      entityType: doc.category,
      entityId: newDoc.documentId,
      details: `Uploaded document: ${doc.title} (${doc.category})`,
      ipAddress: '127.0.0.1',
      userAgent: 'DMS/v1.0',
    });

    return newDoc;
  }

  public verifyDocument(params: {
    documentId: string;
    status: 'VERIFIED' | 'REJECTED';
    verifiedByUserId: string;
    verifiedByUserName: string;
    rejectionReason?: string;
  }): boolean {
    const doc = this.documents.find((d) => d.documentId === params.documentId);
    if (!doc) return false;

    doc.status = params.status;
    doc.verifiedByUserId = params.verifiedByUserId;
    doc.verifiedByUserName = params.verifiedByUserName;
    doc.verifiedAt = new Date().toISOString();
    if (params.rejectionReason) doc.rejectionReason = params.rejectionReason;

    AuditLogger.logAction({
      userId: params.verifiedByUserId,
      userName: params.verifiedByUserName,
      roleKey: 'VERIFIER',
      platformSlug: 'dms',
      action: `DOCUMENT_${params.status}`,
      entityType: doc.category,
      entityId: doc.documentId,
      details: `Set verification status of ${doc.title} to ${params.status}`,
      ipAddress: '127.0.0.1',
      userAgent: 'DMS/v1.0',
    });

    return true;
  }

  public getDocumentsForEntity(entityType: string, entityId: string): EnterpriseDocument[] {
    return this.documents.filter((d) => d.is_active && d.entityType === entityType && d.entityId === entityId);
  }

  public getAllDocuments(): EnterpriseDocument[] {
    return this.documents.filter((d) => d.is_active);
  }
}

export const DocumentManager = new DocumentManagerService();
