// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 11: Notification Engine Implementation
// ============================================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private outbox = [
    {
      id: 'ntf-001',
      recipientMobile: '9822012345',
      channel: 'WHATSAPP',
      templateCode: 'SOIL_REPORT_DELIVERY',
      messageContent: 'नमस्कार रमेश पाटील, तुमचा माती परीक्षण अहवाल (MA-REQ-000155) तयार आहे.',
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
    },
  ];

  async sendNotification(payload: { channel: string; recipientMobile: string; templateCode: string; message: string }) {
    const notification = {
      id: `ntf-${Date.now()}`,
      recipientMobile: payload.recipientMobile,
      channel: payload.channel || 'SMS',
      templateCode: payload.templateCode,
      messageContent: payload.message,
      status: 'SENT',
      sentAt: new Date().toISOString(),
    };

    this.outbox.push(notification);
    return { success: true, message: 'Notification queued & dispatched.', data: notification, timestamp: new Date().toISOString() };
  }

  async getLogs() {
    return { success: true, data: this.outbox, timestamp: new Date().toISOString() };
  }
}
