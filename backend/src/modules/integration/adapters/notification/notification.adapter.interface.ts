// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 3: Notification Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export type NotificationCategory =
  | 'AUTHENTICATION_OTP'
  | 'PAYMENTS'
  | 'FARMER_REGISTRATION'
  | 'SOIL_SAMPLE_STATUS'
  | 'SOIL_REPORT_READY'
  | 'APPOINTMENT_HR'
  | 'EDP_TRAINING'
  | 'DRONE_BOOKING'
  | 'GENERAL_ANNOUNCEMENTS';

export interface NotificationPayload {
  recipient: string; // Mobile number for WhatsApp, Email address for Email
  category: NotificationCategory;
  templateCode: string;
  variables: Record<string, string>;
  language?: 'MR' | 'EN';
}

export interface NotificationSendResult {
  success: boolean;
  providerName: string;
  messageId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  errorDetails?: string;
}

export interface INotificationProvider {
  readonly providerName: string;

  send(payload: NotificationPayload): Promise<NotificationSendResult>;
  getDeliveryStatus(messageId: string): Promise<string>;
}
