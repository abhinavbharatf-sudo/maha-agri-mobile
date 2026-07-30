// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 5: Domain Event Orchestration & Background Job Service
// ============================================================================

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { LocalEventBus } from '../adapters/eventbus/local-eventbus.adapter';
import { DomainEventType, DomainEventPayload } from '../adapters/eventbus/eventbus.adapter.interface';

@Injectable()
export class DomainEventService implements OnModuleInit {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(private readonly eventBus: LocalEventBus) {}

  onModuleInit() {
    this.registerSubscribers();
  }

  private registerSubscribers() {
    // 1. FarmerRegistered -> Trigger Welcome WhatsApp Notification
    this.eventBus.subscribe('FarmerRegistered', async (event) => {
      this.logger.log(`[ASYNC JOB] Sending Welcome WhatsApp to Farmer Code: ${event.data.farmerCode}`);
    });

    // 2. SoilReportGenerated -> Trigger PDF & Verification QR Seal
    this.eventBus.subscribe('SoilReportGenerated', async (event) => {
      this.logger.log(`[ASYNC JOB] Generating Signed PDF & QR for Soil Sample: ${event.data.sampleCode}`);
    });

    // 3. PaymentCaptured -> Trigger Double-Entry Ledger Posting
    this.eventBus.subscribe('PaymentCaptured', async (event) => {
      this.logger.log(`[ASYNC JOB] Posting Payment ${event.data.paymentId} to Double-Entry Ledger`);
    });

    // 4. DroneMissionCompleted -> Trigger Completion PDF & Merchant Payout
    this.eventBus.subscribe('DroneMissionCompleted', async (event) => {
      this.logger.log(`[ASYNC JOB] Processing Payout for Mission: ${event.data.missionCode}`);
    });
  }

  async publishDomainEvent(eventType: DomainEventType, publisherModule: string, data: any, correlationId?: string) {
    const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const finalCorrelationId = correlationId || `corr-${Date.now()}`;
    const idempotencyKey = `idempotent-${eventType}-${data?.id || data?.code || Date.now()}`;

    const eventPayload: DomainEventPayload = {
      eventId,
      eventType,
      publisherModule,
      correlationId: finalCorrelationId,
      idempotencyKey,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.eventBus.publish(eventPayload);

    return {
      success: true,
      message: `Domain Event ${eventType} published successfully`,
      data: {
        eventId,
        eventType,
        correlationId: finalCorrelationId,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDeadLetterQueue() {
    const dlq = await this.eventBus.getDeadLetterQueue();
    return {
      success: true,
      count: dlq.length,
      data: dlq,
      timestamp: new Date().toISOString(),
    };
  }

  getEventHistory() {
    const history = this.eventBus.getEventHistory();
    return {
      success: true,
      count: history.length,
      data: history,
      timestamp: new Date().toISOString(),
    };
  }
}
