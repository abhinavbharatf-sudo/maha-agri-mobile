// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 5: Event Bus Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { LocalEventBus } from './adapters/eventbus/local-eventbus.adapter';
import { DomainEventService } from './services/domain-event.service';
import { EventBusIntegrationController } from './controllers/eventbus-integration.controller';

@Module({
  controllers: [EventBusIntegrationController],
  providers: [LocalEventBus, DomainEventService],
  exports: [DomainEventService, LocalEventBus],
})
export class EventBusIntegrationModule {}
