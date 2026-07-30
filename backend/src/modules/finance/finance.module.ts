// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 09: Finance ERP Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
