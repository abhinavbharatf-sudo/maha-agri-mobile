// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 5: Event Bus Controller (/api/v1/integration/events)
// ============================================================================

import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DomainEventService } from '../services/domain-event.service';
import { DomainEventType } from '../adapters/eventbus/eventbus.adapter.interface';

export class PublishEventDto {
  eventType!: DomainEventType;
  publisherModule!: string;
  data!: any;
  correlationId?: string;
}

@Controller('api/v1/integration/events')
export class EventBusIntegrationController {
  constructor(private readonly domainEventService: DomainEventService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publishEvent(@Body() body: PublishEventDto) {
    return this.domainEventService.publishDomainEvent(
      body.eventType,
      body.publisherModule,
      body.data,
      body.correlationId,
    );
  }

  @Get('history')
  async getEventHistory() {
    return this.domainEventService.getEventHistory();
  }

  @Get('dlq')
  async getDeadLetterQueue() {
    return this.domainEventService.getDeadLetterQueue();
  }
}
