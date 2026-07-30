// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 06: Entrepreneur ERP Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { EntrepreneurController } from './entrepreneur.controller';
import { EntrepreneurService } from './entrepreneur.service';

@Module({
  controllers: [EntrepreneurController],
  providers: [EntrepreneurService],
  exports: [EntrepreneurService],
})
export class EntrepreneurModule {}
