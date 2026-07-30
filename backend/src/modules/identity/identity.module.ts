// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 01: Identity Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
