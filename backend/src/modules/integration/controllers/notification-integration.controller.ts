// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 3: Notification Controller (/api/v1/integration/notifications)
// ============================================================================

import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationEngineService } from '../services/notification-engine.service';
import { NotificationCategory } from '../adapters/notification/notification.adapter.interface';

export class SendNotificationDto {
  recipient!: string;
  category!: NotificationCategory;
  templateCode!: string;
  variables!: Record<string, string>;
  language?: 'MR' | 'EN';
}

@Controller('api/v1/integration/notifications')
export class NotificationIntegrationController {
  constructor(private readonly notificationService: NotificationEngineService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() body: SendNotificationDto) {
    return this.notificationService.sendNotification(body);
  }

  @Get('templates')
  async getTemplates() {
    return this.notificationService.getTemplates();
  }

  @Get('dlq')
  async getDeadLetterQueue() {
    return this.notificationService.getDeadLetterQueue();
  }
}
