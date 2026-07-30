// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 11: Notification Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
