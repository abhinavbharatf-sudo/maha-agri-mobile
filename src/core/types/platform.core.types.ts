/**
 * Platform Core Engine Types
 * Domain-Agnostic Core Types for MAHA-AGRI Platform Backbone (/src/core/)
 */

export interface IPlatformEntity {
  id: string;
  entityCode: string;
  entityName: string;
  codePrefix: string;
  description?: string;
  isActive: boolean;
}

export interface IUniversalIdentity {
  id: string;
  entityCode: string;
  code: string;
  createdAt: string;
  ownerId?: string;
}

export interface ITimelineEvent {
  id: string;
  entityCode: string;
  entityId: string;
  eventType: string;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface IActivityLog {
  id: string;
  entityCode: string;
  entityId: string;
  action: string;
  previousState?: string;
  newState?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type AttachmentType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'PDF' | 'DOCUMENT' | 'OTHER';

export interface IAttachment {
  id: string;
  entityCode: string;
  entityId: string;
  attachmentType: AttachmentType;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType?: string;
  geoLat?: number;
  geoLng?: number;
  uploadedBy?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface IComment {
  id: string;
  entityCode: string;
  entityId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  mentions: string[];
  createdAt: string;
}

export interface IEntityAssignment {
  id: string;
  entityCode: string;
  entityId: string;
  assignedToUserId?: string;
  assignedToRole?: string;
  districtId?: string;
  talukaId?: string;
  assignedBy: string;
  assignmentStatus: 'ACTIVE' | 'TRANSFERRED' | 'ESCALATED' | 'COMPLETED';
  assignmentNotes?: string;
  createdAt: string;
}

export interface IApprovalWorkflow {
  id: string;
  entityCode: string;
  entityId: string;
  currentStageOrder: number;
  stageName: string;
  assignedRole: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'FORWARDED' | 'ESCALATED';
  decisionBy?: string;
  decisionNotes?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface IEntityRelation {
  id: string;
  fromEntityCode: string;
  fromEntityId: string;
  toEntityCode: string;
  toEntityId: string;
  relationType: 'BECAME' | 'HAS' | 'CREATED_BY' | 'BELONGS_TO' | 'DEPENDS_ON';
  createdBy?: string;
  createdAt: string;
}

export interface ITag {
  id: string;
  tagName: string;
  colorCode: string;
  isActive: boolean;
}

export interface IEntityTag {
  id: string;
  entityCode: string;
  entityId: string;
  tagId: string;
  tagName?: string;
  colorCode?: string;
  taggedBy?: string;
  createdAt: string;
}

export interface IWorkflowTemplate {
  id: string;
  workflowCode: string;
  workflowName: string;
  entityCode: string;
  isActive: boolean;
}

export interface IWorkflowStep {
  id: string;
  templateId: string;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  allowedRoles: string[];
  isTerminal: boolean;
}

export interface IWorkflowInstance {
  id: string;
  templateId: string;
  entityCode: string;
  entityId: string;
  currentStepCode: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedBy?: string;
  completedAt?: string;
  createdAt: string;
}

export interface PlatformEvent<T = any> {
  eventId: string;
  eventType: string;
  entityCode: string;
  entityId: string;
  payload: T;
  timestamp: string;
}
