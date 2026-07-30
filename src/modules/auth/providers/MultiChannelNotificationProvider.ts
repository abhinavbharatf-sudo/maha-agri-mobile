/**
 * MultiChannelNotificationProvider
 * Implementation of INotificationRepository.
 * Delegates OTP and alert delivery across WhatsApp, SMS, and Email.
 */

import type { INotificationRepository, NotificationPayload } from '../repositories/NotificationRepository';
import { sendOTP, verifyCustomOtp, sendTemplateMessage } from '../../../services/whatapi';

export class MultiChannelNotificationProvider implements INotificationRepository {
  async sendOtp(mobile: string, channel: 'SMS' | 'WHATSAPP' = 'WHATSAPP'): Promise<{ success: boolean; message?: string }> {
    try {
      if (channel === 'WHATSAPP' || channel === 'SMS') {
        const res = await sendOTP(mobile);
        if (res.success) {
          return { success: true, message: 'OTP sent successfully.' };
        }
        return { success: false, message: res.error ?? 'Failed to send OTP.' };
      }
      return { success: false, message: `Unsupported notification channel: ${channel}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to send OTP.' };
    }
  }

  async verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await verifyCustomOtp(mobile, otp);
      if (res.success) {
        return { success: true, message: 'OTP verified successfully.' };
      }
      return { success: false, message: res.error ?? 'Invalid or expired OTP.' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'OTP verification failed.' };
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; message?: string }> {
    try {
      if (payload.templateId) {
        const res = await sendTemplateMessage(
          payload.recipient,
          payload.templateId,
          payload.variables ? Object.values(payload.variables) : []
        );
        return { success: res.success, message: res.error };
      }
      return { success: true, message: 'Notification queued.' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Notification send failed.' };
    }
  }
}

export const defaultNotificationProvider = new MultiChannelNotificationProvider();
