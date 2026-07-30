// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase B Module 3: Feature Request & Change Control Board (CCB) Service
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpsChangeControlService {
  private readonly logger = new Logger(OpsChangeControlService.name);
  private featureRequestsMap = new Map<string, any>();

  async submitFeatureRequest(params: { title: string; description: string; targetRelease?: string; requestedByUserId: string }) {
    const requestId = `req-${Date.now()}`;
    const requestCode = `CCB-${Date.now().toString().slice(-6)}`;

    const request = {
      id: requestId,
      requestCode,
      title: params.title,
      description: params.description,
      targetRelease: params.targetRelease || 'v1.1.0',
      status: 'UNDER_REVIEW',
      requestedByUserId: params.requestedByUserId,
      createdAt: new Date().toISOString(),
    };

    this.featureRequestsMap.set(requestId, request);
    this.logger.log(`[Phase B CCB] Submitted Feature Request ${requestCode} for target release ${request.targetRelease}`);

    return { success: true, message: 'Feature Request registered for CCB review', data: request };
  }

  async getCcbBacklog() {
    return { success: true, data: Array.from(this.featureRequestsMap.values()) };
  }
}
