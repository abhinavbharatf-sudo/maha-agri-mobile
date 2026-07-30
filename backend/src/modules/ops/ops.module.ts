// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase B Operational Excellence Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { OpsIncidentService } from './services/ops-incident.service';
import { OpsChangeControlService } from './services/ops-change-control.service';
import { OpsFeedbackService } from './services/ops-feedback.service';
import { OpsExcellenceController } from './controllers/ops-excellence.controller';

@Module({
  controllers: [OpsExcellenceController],
  providers: [OpsIncidentService, OpsChangeControlService, OpsFeedbackService],
  exports: [OpsIncidentService, OpsChangeControlService, OpsFeedbackService],
})
export class OpsExcellenceModule {}
