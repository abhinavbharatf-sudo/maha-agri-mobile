/**
 * Universal Profile Platform (UPP) Business Engine Service (Enhanced Enterprise)
 * Location: /src/modules/upp/services/UPPEngineService.ts
 * Manages Permanent Universal IDs (UPP-000000123), Person Role Lifecycle Transitions,
 * Profile Merge Engine, Sticky Notes, Contacts, Identity Docs, and Event Bus.
 */

import { UPPProfile, UPPRole, UPPLifecycleStage, DuplicateCheckResult, ProfileRoleTransition, ProfileMergeResult } from '../types/upp.types';
import { PlatformEventBus } from '../../../core/events/EventBus';

export class UPPEngineService {
  private static uppIdCounter = 127;

  /**
   * Generates Immutable Permanent Universal ID (UPP-000000123)
   */
  public static generatePermanentUppId(): string {
    const seq = (this.uppIdCounter++).toString().padStart(9, '0');
    return `UPP-${seq}`;
  }

  /**
   * Calculates Profile Health Score (0-100%)
   */
  public static calculateHealthScore(profile: Partial<UPPProfile>): number {
    let score = 20; // Base score for registration

    if (profile.fullName && profile.mobile) score += 20;
    if (profile.district && profile.taluka) score += 15;
    if (profile.isVerified) score += 15;
    if (profile.contacts && profile.contacts.length > 1) score += 15;
    if (profile.identityDocuments && profile.identityDocuments.length > 0) score += 15;

    return Math.min(100, score);
  }

  /**
   * Merges a duplicate profile into a primary profile
   */
  public static mergeProfiles(
    sourceProfile: UPPProfile,
    targetProfile: UPPProfile,
    reason: string
  ): { targetProfile: UPPProfile; sourceProfile: UPPProfile; mergeResult: ProfileMergeResult } {
    const updatedSource: UPPProfile = {
      ...sourceProfile,
      status: 'MERGED',
      mergedIntoUppId: targetProfile.permanentUppId,
      updatedAt: new Date().toISOString(),
    };

    const updatedTarget: UPPProfile = {
      ...targetProfile,
      stickyNote: `[MERGED FROM ${sourceProfile.permanentUppId}]: ${reason}\n` + (targetProfile.stickyNote || ''),
      updatedAt: new Date().toISOString(),
    };

    const mergeResult: ProfileMergeResult = {
      sourceUppId: sourceProfile.permanentUppId,
      targetUppId: targetProfile.permanentUppId,
      status: 'MERGED',
      mergedAt: new Date().toISOString(),
    };

    // Emit event
    PlatformEventBus.getInstance().publish({
      eventType: 'core.profile_merged',
      entityType: 'CANDIDATE',
      entityId: targetProfile.id,
      payload: mergeResult,
    }).catch((err) => console.error('[UPPEngineService] Event error:', err));

    return { targetProfile: updatedTarget, sourceProfile: updatedSource, mergeResult };
  }

  /**
   * Real-time Duplicate Detection Engine
   */
  public static checkDuplicates(
    mobile: string,
    existingProfiles: UPPProfile[]
  ): DuplicateCheckResult {
    const match = existingProfiles.find((p) => p.mobile === mobile && p.status === 'ACTIVE');
    if (match) {
      return {
        isDuplicate: true,
        matchedFields: ['mobile'],
        existingProfileId: match.id,
        existingUppId: match.permanentUppId,
      };
    }
    return { isDuplicate: false, matchedFields: [] };
  }

  /**
   * Executes Person Role Lifecycle Transition
   */
  public static transitionRole(
    profile: UPPProfile,
    newRole: UPPRole,
    newLifecycleStage: UPPLifecycleStage,
    reason: string
  ): { updatedProfile: UPPProfile; transitionLog: ProfileRoleTransition } {
    const transitionLog: ProfileRoleTransition = {
      id: `TR-${Date.now()}`,
      profileId: profile.id,
      fromRole: profile.currentPrimaryRole,
      toRole: newRole,
      fromLifecycleStage: profile.lifecycleStage,
      toLifecycleStage: newLifecycleStage,
      reason,
      transitionedAt: new Date().toISOString(),
    };

    const updatedProfile: UPPProfile = {
      ...profile,
      currentPrimaryRole: newRole,
      lifecycleStage: newLifecycleStage,
      updatedAt: new Date().toISOString(),
    };

    PlatformEventBus.getInstance().publish({
      eventType: 'core.role_transitioned',
      entityType: 'CANDIDATE',
      entityId: profile.id,
      payload: {
        permanentUppId: profile.permanentUppId,
        fromRole: profile.currentPrimaryRole,
        toRole: newRole,
        newStage: newLifecycleStage,
      },
    }).catch((err) => console.error('[UPPEngineService] Event error:', err));

    return { updatedProfile, transitionLog };
  }
}
