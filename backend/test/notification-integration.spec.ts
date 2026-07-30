// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 3 - Notification Engine Tests
// ============================================================================

import { WhatsAppBusinessAdapter } from '../src/modules/integration/adapters/notification/whatsapp-business.adapter';
import { EmailSmtpAdapter } from '../src/modules/integration/adapters/notification/email-smtp.adapter';
import { NotificationEngineService } from '../src/modules/integration/services/notification-engine.service';

describe('NotificationEngineService (Multi-Channel Test)', () => {
  let whatsAppAdapter: WhatsAppBusinessAdapter;
  let emailAdapter: EmailSmtpAdapter;
  let service: NotificationEngineService;

  beforeEach(() => {
    whatsAppAdapter = new WhatsAppBusinessAdapter();
    emailAdapter = new EmailSmtpAdapter();
    service = new NotificationEngineService(whatsAppAdapter, emailAdapter);
  });

  it('should dispatch WhatsApp notification for mobile recipient', async () => {
    const res = await service.sendNotification({
      recipient: '9876543210',
      category: 'SOIL_REPORT_READY',
      templateCode: 'SOIL_REPORT_READY',
      variables: { sampleCode: 'SMP-PUNE-001', downloadUrl: 'https://mahaagri.gov.in/report/123' },
    });

    expect(res.success).toBe(true);
    expect(res.data.providerName).toBe('WHATSAPP_BUSINESS_API');
  });

  it('should dispatch Email notification for email recipient', async () => {
    const res = await service.sendNotification({
      recipient: 'farmer@mahaagri.gov.in',
      category: 'PAYMENTS',
      templateCode: 'PAYMENTS',
      variables: { amount: '500', orderId: 'ORD-123' },
    });

    expect(res.success).toBe(true);
    expect(res.data.providerName).toBe('EMAIL_SMTP');
  });

  it('should return list of 9 template categories', async () => {
    const res = await service.getTemplates();
    expect(res.success).toBe(true);
    expect(Object.keys(res.data)).toHaveLength(9);
  });
});
