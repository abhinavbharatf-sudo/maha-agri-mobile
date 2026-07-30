/**
 * Module 10: Document Generation & Records Management System (DGRMS) TypeScript Types
 * Location: /src/modules/documents/types/document.types.ts
 */

export type DocumentCategory =
  | 'CERTIFICATE'
  | 'SANCTION_ORDER'
  | 'APPOINTMENT'
  | 'ID_CARD'
  | 'RECEIPT'
  | 'NOTICE'
  | 'INVOICE';

export type DocumentLifecycleStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'ISSUED' | 'ARCHIVED';

export type VerificationStatus = 'VALID' | 'SUSPENDED' | 'REVOKED';

export interface DocumentTemplate {
  id: string;
  templateCode: string; // TPL-SOIL-REPORT, TPL-SANCTION-ORDER
  version: string; // v1.0, v2.0
  title: string;
  category: DocumentCategory;
  contentTemplate: string;
  placeholders: string[];
  isActive: boolean;
}

export interface DigitalSealVerification {
  documentCode: string; // DOC-2026-00912
  uniqueDocumentId: string;
  qrCodeUrl: string;
  verificationUrl: string;
  integrityHash: string;
  issuingAuthority: string;
  issuedAt: string;
}

export interface DocumentRecord {
  id: string;
  documentCode: string; // DOC-2026-00912
  templateCode: string;
  documentVersion: string;
  ownerUppId: string;
  ownerName: string;
  originModule: 'REQUESTS' | 'MISSION' | 'WORKFLOW' | 'PAYMENTS' | 'FORMS';
  originEntityId: string;
  lifecycleStatus: DocumentLifecycleStatus;
  retentionYears: number;
  mergedPayload: Record<string, any>;
  seal: DigitalSealVerification;
  issuedByName: string;
  issuedAt: string;
}

export interface VerificationRegistryRecord {
  id: string;
  documentCode: string;
  integrityHash: string;
  verificationUrl: string;
  verificationStatus: VerificationStatus;
  revocationReason?: string;
  verifiedCount: number;
  issuedAt: string;
}

export interface BulkGenerationJob {
  id: string;
  queueCode: string; // QUEUE-2026-0081
  batchName: string;
  templateCode: string;
  totalDocuments: number;
  completedDocuments: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}
