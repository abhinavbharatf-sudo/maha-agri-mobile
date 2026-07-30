/**
 * Module 11: Notification & Communication Platform TypeScript Types
 * Location: /src/modules/notification/types/notification.types.ts
 */

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export type DeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING';

export interface NotificationTemplate {
  id: string;
  templateCode: string; // TPL-NOTIF-DBT, TPL-NOTIF-MISSION
  channel: NotificationChannel;
  title: string;
  bodyTemplate: string; // "Dear {{NAME}}, your DBT subsidy of ₹{{AMOUNT}} has been disbursed."
  language: 'MARATHI' | 'ENGLISH';
  isActive: boolean;
}

export interface NotificationMessage {
  id: string;
  messageCode: string; // MSG-2026-09012
  templateCode?: string;
  channel: NotificationChannel;
  recipientUppId: string;
  recipientContact: string; // Phone or Email
  recipientName: string;
  title: string;
  body: string;
  status: DeliveryStatus;
  providerName: string; // Twilio, CDAC Govt SMS, WhatsApp Business API
  failureReason?: string;
  retryCount: number;
  sentAt?: string;
  createdAt: string;
}
