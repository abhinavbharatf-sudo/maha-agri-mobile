// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 3: Multi-Category Notification Engine Service (Retry & DLQ)
// ============================================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WhatsAppBusinessAdapter } from '../adapters/notification/whatsapp-business.adapter';
import { EmailSmtpAdapter } from '../adapters/notification/email-smtp.adapter';
import { NotificationPayload, NotificationCategory } from '../adapters/notification/notification.adapter.interface';

@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);
  private deadLetterQueue: any[] = [];
  private deliveryLogs = new Map<string, any>();

  // 9 Approved Template Categories Registry
  private templates: Record<string, { category: NotificationCategory; bodyMr: string; bodyEn: string }> = {
    AUTHENTICATION_OTP: {
      category: 'AUTHENTICATION_OTP',
      bodyMr: 'तुमचा महा-कृषी OTP आहे {{otp}}. वैध कालावधी ५ मिनिटे.',
      bodyEn: 'Your MAHA-AGRI verification OTP is {{otp}}. Valid for 5 minutes.',
    },
    PAYMENTS: {
      category: 'PAYMENTS',
      bodyMr: 'तुमचे ₹{{amount}} चे पेमेंट यशस्वी झाले आहे. ऑर्डर आयडी: {{orderId}}.',
      bodyEn: 'Your payment of ₹{{amount}} was successful. Order ID: {{orderId}}.',
    },
    FARMER_REGISTRATION: {
      category: 'FARMER_REGISTRATION',
      bodyMr: 'नमस्कार {{farmerName}}, महा-कृषी प्लॅटफॉर्मवर आपले स्वागत आहे. तुमचा कोड: {{farmerCode}}.',
      bodyEn: 'Welcome {{farmerName}} to MAHA-AGRI platform. Your code is {{farmerCode}}.',
    },
    SOIL_SAMPLE_STATUS: {
      category: 'SOIL_SAMPLE_STATUS',
      bodyMr: 'तुमचा माती नमुना {{sampleCode}} प्रयोगशाळेत जमा झाला आहे.',
      bodyEn: 'Your soil sample {{sampleCode}} has been received at the lab.',
    },
    SOIL_REPORT_READY: {
      category: 'SOIL_REPORT_READY',
      bodyMr: 'तुमचा माती परीक्षण अहवाल {{sampleCode}} तयार आहे. डाऊनलोड करा: {{downloadUrl}}',
      bodyEn: 'Your soil test report {{sampleCode}} is ready. Download: {{downloadUrl}}',
    },
    APPOINTMENT_HR: {
      category: 'APPOINTMENT_HR',
      bodyMr: 'तुमची मुलाखत {{date}} रोजी नियोजित केली आहे.',
      bodyEn: 'Your interview is scheduled for {{date}}.',
    },
    EDP_TRAINING: {
      category: 'EDP_TRAINING',
      bodyMr: 'तुमचा EDP प्रशिक्षण वर्ग {{startDate}} पासून सुरू होत आहे.',
      bodyEn: 'Your EDP training batch starts on {{startDate}}.',
    },
    DRONE_BOOKING: {
      category: 'DRONE_BOOKING',
      bodyMr: 'तुमची ड्रोन फवारणी मोहीम {{date}} साठी निश्चित झाली आहे.',
      bodyEn: 'Your drone spray mission is confirmed for {{date}}.',
    },
    GENERAL_ANNOUNCEMENTS: {
      category: 'GENERAL_ANNOUNCEMENTS',
      bodyMr: 'महत्त्वाची सूचना: {{message}}',
      bodyEn: 'Important Notice: {{message}}',
    },
  };

  constructor(
    private readonly whatsAppAdapter: WhatsAppBusinessAdapter,
    private readonly emailAdapter: EmailSmtpAdapter,
  ) {}

  async sendNotification(payload: NotificationPayload) {
    if (!this.templates[payload.category]) {
      throw new BadRequestException(`Invalid notification category ${payload.category}`);
    }

    const isEmail = payload.recipient.includes('@');
    let result;

    try {
      if (isEmail) {
        result = await this.emailAdapter.send(payload);
      } else {
        result = await this.whatsAppAdapter.send(payload);
      }

      this.deliveryLogs.set(result.messageId, {
        ...payload,
        result,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Notification sent via ${result.providerName}`,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Notification failed for ${payload.recipient}. Moving to Dead-Letter Queue (DLQ).`);
      
      this.deadLetterQueue.push({
        payload,
        error: error?.message || 'Gateway Timeout',
        failedAt: new Date().toISOString(),
      });

      return {
        success: false,
        message: 'Notification failed and moved to Dead-Letter Queue (DLQ)',
        error: error?.message,
      };
    }
  }

  async getTemplates() {
    return { success: true, data: this.templates, timestamp: new Date().toISOString() };
  }

  async getDeadLetterQueue() {
    return { success: true, count: this.deadLetterQueue.length, data: this.deadLetterQueue, timestamp: new Date().toISOString() };
  }
}
