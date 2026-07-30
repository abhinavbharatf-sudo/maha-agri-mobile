// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase B Module 4: User Feedback Management Service
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpsFeedbackService {
  private readonly logger = new Logger(OpsFeedbackService.name);
  private feedbacksMap = new Map<string, any>();

  async submitUserFeedback(params: { userRole: string; rating: number; comments: string; moduleName: string; districtId?: string }) {
    const feedbackId = `fb-${Date.now()}`;
    const feedbackCode = `FBD-${Date.now().toString().slice(-6)}`;

    const feedback = {
      id: feedbackId,
      feedbackCode,
      userRole: params.userRole,
      rating: params.rating,
      comments: params.comments,
      moduleName: params.moduleName,
      districtId: params.districtId,
      submittedAt: new Date().toISOString(),
    };

    this.feedbacksMap.set(feedbackId, feedback);
    this.logger.log(`[Phase B User Feedback] Recorded ${params.rating}-star feedback from ${params.userRole} for module ${params.moduleName}`);

    return { success: true, message: 'User feedback recorded successfully', data: feedback };
  }

  async getAllFeedbacks() {
    return { success: true, data: Array.from(this.feedbacksMap.values()) };
  }
}
