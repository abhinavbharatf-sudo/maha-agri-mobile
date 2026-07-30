/**
 * Module 03: Universal Profile Platform (UPP) TypeScript Types (Enhanced Enterprise)
 * Location: /src/modules/upp/types/upp.types.ts
 */

export type UPPRole =
  | 'CANDIDATE'
  | 'FARMER'
  | 'ENTREPRENEUR'
  | 'MAHA_AGRIDOOT'
  | 'STAFF'
  | 'VOLUNTEER'
  | 'COORDINATOR'
  | 'DRONE_CUSTOMER';

export type UPPLifecycleStage =
  | 'REGISTERED'
  | 'IN_TRAINING'
  | 'SELECTED'
  | 'ENTREPRENEUR'
  | 'ACTIVE_FARMER'
  | 'DRONE_CUSTOMER'
  | 'REPEAT_CUSTOMER';

export type UPPStatus = 'ACTIVE' | 'INACTIVE' | 'MERGED' | 'ARCHIVED';

export type ContactType = 'PRIMARY_MOBILE' | 'WHATSAPP' | 'ALTERNATE_MOBILE' | 'EMAIL' | 'WORK_EMAIL';
export type DocumentType = 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'RATION_CARD' | 'LAND_RECORD_712';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ConsentType = 'PRIVACY_POLICY' | 'WHATSAPP_COMMUNICATION' | 'SMS_ALERTS' | 'DATA_PROCESSING';

export interface UPPContact {
  id: string;
  type: ContactType;
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface UPPIdentityDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  documentFileUrl?: string;
  verificationStatus: VerificationStatus;
}

export interface UPPConsent {
  id: string;
  consentType: ConsentType;
  isGranted: boolean;
  grantedAt: string;
}

export interface UPPProfile {
  id: string;
  permanentUppId: string; // Permanent Universal ID (UPP-000000123)
  primaryBusinessCode: string; // Business Role Code (CAN-000456 / FAR-000123)

  fullName: string;
  mobile: string;
  email?: string;
  gender: string;
  dateOfBirth?: string;
  avatarUrl?: string;

  currentPrimaryRole: UPPRole;
  lifecycleStage: UPPLifecycleStage;
  status: UPPStatus;
  mergedIntoUppId?: string;

  healthScore: number; // 0 to 100%
  isVerified: boolean;
  isFlaggedDuplicate: boolean;

  district: string;
  taluka: string;
  village?: string;
  pincode?: string;

  stickyNote?: string; // Persistent Sticky Note
  contacts?: UPPContact[];
  identityDocuments?: UPPIdentityDocument[];
  consents?: UPPConsent[];

  assignedCoordinatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRoleTransition {
  id: string;
  profileId: string;
  fromRole: UPPRole;
  toRole: UPPRole;
  fromLifecycleStage: UPPLifecycleStage;
  toLifecycleStage: UPPLifecycleStage;
  reason: string;
  transitionedAt: string;
}

export interface ProfileMergeResult {
  sourceUppId: string;
  targetUppId: string;
  status: 'MERGED';
  mergedAt: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedFields: ('mobile' | 'aadhaar' | 'name_district')[];
  existingProfileId?: string;
  existingUppId?: string;
}

export interface ProfileFilterQuery {
  searchQuery?: string;
  role?: UPPRole;
  district?: string;
  status?: UPPStatus;
  minHealthScore?: number;
  isVerified?: boolean;
}
