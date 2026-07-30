// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 5: Local In-Process Event Bus Adapter Implementation
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { IEventBus, DomainEventPayload, DomainEventType, EventHandler } from './eventbus.adapter.interface';

@Injectable()
export class LocalEventBus implements IEventBus {
  readonly providerName = 'LOCAL_IN_PROCESS_EVENTBUS';
  private readonly logger = new Logger(LocalEventBus.name);

  private handlers = new Map<DomainEventType, EventHandler[]>();
  private processedEvents = new Set<string>(); // Idempotency check set
  private deadLetterQueue: DomainEventPayload[] = [];
  private eventHistory: DomainEventPayload[] = [];

  subscribe<T = any>(eventType: DomainEventType, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
    this.logger.log(`[${this.providerName}] Subscribed handler to event ${eventType}`);
  }

  async publish<T = any>(event: DomainEventPayload<T>): Promise<void> {
    // 1. Idempotency Check
    if (event.idempotencyKey && this.processedEvents.has(event.idempotencyKey)) {
      this.logger.warn(`[${this.providerName}] Duplicate event ignored: ${event.idempotencyKey}`);
      return;
    }

    if (event.idempotencyKey) {
      this.processedEvents.add(event.idempotencyKey);
    }

    this.eventHistory.push(event);
    this.logger.log(`[${this.providerName}] Event Published: ${event.eventType} (Correlation ID: ${event.correlationId})`);

    const subscribers = this.handlers.get(event.eventType) || [];

    // Async Non-Blocking Execution with Retry Logic
    for (const handler of subscribers) {
      this.executeWithRetry(handler, event, 3);
    }
  }

  private async executeWithRetry(handler: EventHandler, event: DomainEventPayload, maxRetries: number) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        attempts++;
        await handler(event);
        return;
      } catch (error: any) {
        this.logger.error(`Handler execution failed for ${event.eventType} (Attempt ${attempts}/${maxRetries}): ${error?.message}`);
        if (attempts >= maxRetries) {
          this.logger.error(`Moving event ${event.eventId} to Dead-Letter Queue (DLQ).`);
          this.deadLetterQueue.push(event);
        } else {
          await new Promise(res => setTimeout(res, 500 * attempts)); // Exponential backoff
        }
      }
    }
  }

  async getDeadLetterQueue(): Promise<DomainEventPayload[]> {
    return this.deadLetterQueue;
  }

  getEventHistory(): DomainEventPayload[] {
    return this.eventHistory;
  }
}
