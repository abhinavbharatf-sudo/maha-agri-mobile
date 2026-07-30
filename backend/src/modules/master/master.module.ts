// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 02: Master Data Hub Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { MasterDataController } from './master.controller';
import { MasterDataService } from './master.service';

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
