/**
 * Universal Timeline & Activity Stream UI Component
 * Location: /src/core/components/UniversalTimelineUI.tsx
 * Reusable UI component rendering timeline events, comments, attachments, and tags for any system entity.
 */

import React, { useState, useEffect } from 'react';
import { PlatformCoreEngine } from '../PlatformCoreEngine';
import { ITimelineEvent, IComment, IAttachment, IEntityTag } from '../types/platform.core.types';
import { MessageSquare, Paperclip, Clock, Tag, Plus, Send, FileText, CheckCircle2 } from 'lucide-react';

interface UniversalTimelineUIProps {
  entityCode: string;
  entityId: string;
  entityName: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const UniversalTimelineUI: React.FC<UniversalTimelineUIProps> = ({
  entityCode,
  entityId,
  entityName,
  currentUserId = 'user-01',
  currentUserName = 'Ramesh Patil',
}) => {
  const [activeTab, setActiveTab] = useState<'Timeline' | 'Comments' | 'Attachments' | 'Tags'>('Timeline');
  const [timelineEvents, setTimelineEvents] = useState<ITimelineEvent[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [tags, setTags] = useState<IEntityTag[]>([]);

  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  useEffect(() => {
    // Seed initial mock timeline event if empty
    const existingTimeline = PlatformCoreEngine.getTimeline(entityCode, entityId);
    if (existingTimeline.length === 0) {
      PlatformCoreEngine.recordTimelineEvent({
        entityCode,
        entityId,
        eventType: 'CREATION',
        title: `${entityCode} Entity Created`,
        description: `Registered initial record code: ${PlatformCoreEngine.generateCode(entityCode)}`,
        actorName: currentUserName,
      });
      PlatformCoreEngine.tagEntity(entityCode, entityId, 'High Priority', '#ef4444');
    }

    refreshData();
  }, [entityCode, entityId]);

  const refreshData = () => {
    setTimelineEvents(PlatformCoreEngine.getTimeline(entityCode, entityId));
    setComments(PlatformCoreEngine.getComments(entityCode, entityId));
    setAttachments(PlatformCoreEngine.getAttachments(entityCode, entityId));
    setTags(PlatformCoreEngine.getTags(entityCode, entityId));
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    await PlatformCoreEngine.addComment({
      entityCode,
      entityId,
      authorId: currentUserId,
      authorName: currentUserName,
      content: newComment,
      isInternal: isInternalNote,
      mentions: [],
    });

    await PlatformCoreEngine.recordTimelineEvent({
      entityCode,
      entityId,
      eventType: 'COMMENT',
      title: 'New Comment Posted',
      description: newComment,
      actorName: currentUserName,
    });

    setNewComment('');
    refreshData();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-4 shadow-xl">
      {/* Entity Header & Tag Badges */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">Universal Platform Core UI</span>
          <h3 className="text-sm font-extrabold text-white">{entityName} Activity Ledger</h3>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5">
          {tags.map((t, idx) => (
            <span
              key={idx}
              className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-sm"
              style={{ backgroundColor: t.colorCode }}
            >
              {t.tagName}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['Timeline', 'Comments', 'Attachments', 'Tags'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === tab ? 'bg-blue-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Timeline' && (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {timelineEvents.map((evt, idx) => (
            <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {evt.title}
                </span>
                <span className="text-slate-500 font-mono">{evt.createdAt.substring(11, 16)}</span>
              </div>
              <p className="text-slate-400 text-[11px]">{evt.description}</p>
              <div className="text-[10px] text-slate-500">By: {evt.actorName || 'System'}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Comments' && (
        <div className="space-y-3">
          {/* Post Comment Input */}
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <textarea
              rows={2}
              placeholder="Write a comment or internal note..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-600"
                />
                <span>Internal Note Only</span>
              </label>

              <button
                onClick={handlePostComment}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg flex items-center gap-1 shadow"
              >
                <Send className="w-3 h-3" />
                <span>Post Comment</span>
              </button>
            </div>
          </div>

          {/* Comments Feed */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((cmt, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  cmt.isInternal ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>{cmt.authorName} {cmt.isInternal && '(Internal Note)'}</span>
                  <span className="text-slate-500 text-[10px]">{cmt.createdAt.substring(11, 16)}</span>
                </div>
                <p>{cmt.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Attachments' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Uploaded Entity Attachments</span>
            <button
              onClick={async () => {
                await PlatformCoreEngine.addAttachment(
                  entityCode,
                  entityId,
                  new Blob(['sample content']),
                  'DOCUMENT',
                  'verification_doc.pdf'
                );
                refreshData();
              }}
              className="px-2.5 py-1 bg-blue-700 text-white font-bold text-[11px] rounded-lg"
            >
              + Add Sample Attachment
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {attachments.map((att, idx) => (
              <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-slate-200">{att.fileName}</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">
                  {att.verificationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Tags' && (
        <div className="space-y-3">
          <span className="text-slate-400 font-bold">Add Entity Tags</span>
          <div className="flex flex-wrap gap-2">
            {['Urgent', 'VIP', 'Organic', 'Drone', 'Verified'].map((tagStr, i) => (
              <button
                key={i}
                onClick={async () => {
                  await PlatformCoreEngine.tagEntity(entityCode, entityId, tagStr, '#059669');
                  refreshData();
                }}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold"
              >
                + Tag: {tagStr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
