/**
 * Platform Core Engine Coordinator
 * Location: /src/core/PlatformCoreEngine.ts
 * Central Operating System Coordinator for the MAHA-AGRI Platform Backbone.
 * Domain-Agnostic: Zero business references (No Candidate, Farmer, Soil, EDP, Drone).
 */

import { PlatformEventBus } from './events/EventBus';
import { NumberingEngine } from './numbering/NumberingEngine';
import { CacheEngine } from './cache/CacheEngine';
import { WebLocalStorageProvider, IStorageProvider } from './storage/StorageProvider';
import {
  ITimelineEvent,
  IActivityLog,
  IAttachment,
  IComment,
  IEntityAssignment,
  IApprovalWorkflow,
  IEntityRelation,
  IEntityTag,
  AttachmentType,
} from './types/platform.core.types';

export class PlatformCoreEngine {
  private static eventBus = PlatformEventBus.getInstance();
  private static storageProvider: IStorageProvider = new WebLocalStorageProvider();

  // In-Memory Storage for Core Ledger Data (Will sync with PostgreSQL Core DDL)
  private static timelineStore: ITimelineEvent[] = [];
  private static activityStore: IActivityLog[] = [];
  private static attachmentStore: IAttachment[] = [];
  private static commentStore: IComment[] = [];
  private static assignmentStore: IEntityAssignment[] = [];
  private static approvalStore: IApprovalWorkflow[] = [];
  private static relationStore: IEntityRelation[] = [];
  private static tagStore: IEntityTag[] = [];

  /**
   * Set Storage Provider (Supabase, S3, R2, Local)
   */
  public static setStorageProvider(provider: IStorageProvider): void {
    this.storageProvider = provider;
  }

  /**
   * Universal Numbering Generator
   */
  public static generateCode(entityCode: string): string {
    return NumberingEngine.generateCode(entityCode);
  }

  /**
   * Universal Event Publisher
   */
  public static async emitEvent(eventType: string, entityCode: string, entityId: string, payload: any): Promise<void> {
    await this.eventBus.publish({
      eventType,
      entityCode,
      entityId,
      payload,
    });
  }

  /**
   * Timeline Engine
   */
  public static async recordTimelineEvent(event: Omit<ITimelineEvent, 'id' | 'createdAt'>): Promise<ITimelineEvent> {
    const record: ITimelineEvent = {
      ...event,
      id: 'tl-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    this.timelineStore.push(record);

    await this.emitEvent('core.timeline_created', event.entityCode, event.entityId, record);
    return record;
  }

  public static getTimeline(entityCode: string, entityId: string): ITimelineEvent[] {
    return this.timelineStore.filter((t) => t.entityCode === entityCode && t.entityId === entityId);
  }

  /**
   * Activity Engine
   */
  public static async logActivity(log: Omit<IActivityLog, 'id' | 'createdAt'>): Promise<IActivityLog> {
    const record: IActivityLog = {
      ...log,
      id: 'act-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    this.activityStore.push(record);

    await this.emitEvent('core.activity_logged', log.entityCode, log.entityId, record);
    return record;
  }

  /**
   * Attachment Engine
   */
  public static async addAttachment(
    entityCode: string,
    entityId: string,
    file: File | Blob,
    attachmentType: AttachmentType,
    fileName: string,
    geoLat?: number,
    geoLng?: number,
    uploadedBy?: string
  ): Promise<IAttachment> {
    const path = `${entityCode.toLowerCase()}/${entityId}/${Date.now()}_${fileName}`;
    const uploadRes = await this.storageProvider.uploadFile(file, path);

    const attachment: IAttachment = {
      id: 'att-' + Math.random().toString(36).substring(2, 11),
      entityCode,
      entityId,
      attachmentType,
      fileUrl: uploadRes.url,
      fileName,
      fileSizeBytes: uploadRes.sizeBytes,
      geoLat,
      geoLng,
      uploadedBy,
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.attachmentStore.push(attachment);

    await this.emitEvent('core.attachment_added', entityCode, entityId, attachment);
    return attachment;
  }

  public static getAttachments(entityCode: string, entityId: string): IAttachment[] {
    return this.attachmentStore.filter((a) => a.entityCode === entityCode && a.entityId === entityId);
  }

  /**
   * Comment Engine
   */
  public static async addComment(comment: Omit<IComment, 'id' | 'createdAt'>): Promise<IComment> {
    const record: IComment = {
      ...comment,
      id: 'cmt-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    this.commentStore.push(record);

    await this.emitEvent('core.comment_added', comment.entityCode, comment.entityId, record);
    return record;
  }

  public static getComments(entityCode: string, entityId: string): IComment[] {
    return this.commentStore.filter((c) => c.entityCode === entityCode && c.entityId === entityId);
  }

  /**
   * Relationship Graph Engine
   */
  public static async createRelation(
    fromEntityCode: string,
    fromEntityId: string,
    toEntityCode: string,
    toEntityId: string,
    relationType: IEntityRelation['relationType'],
    createdBy?: string
  ): Promise<IEntityRelation> {
    const relation: IEntityRelation = {
      id: 'rel-' + Math.random().toString(36).substring(2, 11),
      fromEntityCode,
      fromEntityId,
      toEntityCode,
      toEntityId,
      relationType,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.relationStore.push(relation);

    await this.emitEvent('core.relation_created', fromEntityCode, fromEntityId, relation);
    return relation;
  }

  public static getRelations(entityCode: string, entityId: string): IEntityRelation[] {
    return this.relationStore.filter(
      (r) => (r.fromEntityCode === entityCode && r.fromEntityId === entityId) || (r.toEntityCode === entityCode && r.toEntityId === entityId)
    );
  }

  /**
   * Tag Engine
   */
  public static async tagEntity(entityCode: string, entityId: string, tagName: string, colorCode: string = '#3b82f6'): Promise<IEntityTag> {
    const tag: IEntityTag = {
      id: 'tag-' + Math.random().toString(36).substring(2, 11),
      entityCode,
      entityId,
      tagId: 't-' + tagName.toLowerCase().replace(/\s+/g, '-'),
      tagName,
      colorCode,
      createdAt: new Date().toISOString(),
    };
    this.tagStore.push(tag);

    await this.emitEvent('core.tagged', entityCode, entityId, tag);
    return tag;
  }

  public static getTags(entityCode: string, entityId: string): IEntityTag[] {
    return this.tagStore.filter((t) => t.entityCode === entityCode && t.entityId === entityId);
  }
}
