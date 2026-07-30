/**
 * NotificationRepository Interface Contract
 * Decouples OTP and Notifications from WhatsApp/SMS providers.
 */

export interface NotificationPayload {
  recipient: string; // Mobile or Email
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface INotificationRepository {
  sendOtp(mobile: string, channel?: 'SMS' | 'WHATSAPP'): Promise<{ success: boolean; message?: string }>;
  verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }>;
  sendNotification(payload: NotificationPayload): Promise<{ success: boolean; message?: string }>;
}
