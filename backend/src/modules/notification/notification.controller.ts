// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 11: Notification Engine Controller (/api/v1/notifications)
// ============================================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('logs')
  async getLogs() {
    return this.notificationService.getLogs();
  }

  @Post('send')
  async sendNotification(@Body() body: any) {
    return this.notificationService.sendNotification(body);
  }
}
