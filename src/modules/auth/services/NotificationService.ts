/**
 * NotificationService
 * Business logic layer for sending OTPs and alerts across SMS, WhatsApp, and Email.
 */

import type { INotificationRepository } from '../repositories/NotificationRepository';
import { defaultNotificationProvider } from '../providers/MultiChannelNotificationProvider';

export class NotificationService {
  constructor(private provider: INotificationRepository = defaultNotificationProvider) {}

  async requestOtp(mobile: string, channel: 'SMS' | 'WHATSAPP' = 'WHATSAPP'): Promise<{ success: boolean; message?: string }> {
    return this.provider.sendOtp(mobile, channel);
  }

  async verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }> {
    return this.provider.verifyOtp(mobile, otp);
  }
}

export const notificationService = new NotificationService();
