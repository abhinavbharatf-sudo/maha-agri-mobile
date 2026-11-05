/**
 * MAHA-AGRI RMS Job Synchronization & Invalidation Channel
 *
 * Provides cross-tab (BroadcastChannel) and intra-window (CustomEvent)
 * synchronization so that HR/Admin job posting updates immediately
 * propagate to Public Careers Views (CareersHome, JobDetail) without
 * requiring manual browser refresh or full page reloads.
 */

import type { RmsJobPosting } from './types';

const SYNC_CHANNEL_NAME = 'maha_rms_jobs_sync';
const SYNC_EVENT_NAME = 'maha_job_updated';

export interface JobUpdateEventDetail {
  jobId: string;
  slug: string;
  timestamp: number;
  job?: Partial<RmsJobPosting> | null;
}

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

/**
 * Broadcasts a job update notification to all open tabs and components.
 */
export function broadcastJobUpdate(job: Partial<RmsJobPosting>): void {
  if (typeof window === 'undefined') return;

  const detail: JobUpdateEventDetail = {
    jobId: job.id || '',
    slug: job.slug || '',
    timestamp: Date.now(),
    job,
  };

  // 1. Same-window / same-tab notification
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail }));
  } catch {
    // Ignore dispatch errors in non-browser environments
  }

  // 2. Cross-tab notification
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage(detail);
    }
  } catch {
    // Ignore broadcast errors
  }
}

/**
 * Subscribes a component to job update events (both same-tab and cross-tab).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToJobUpdates(
  callback: (detail: JobUpdateEventDetail) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<JobUpdateEventDetail>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleBroadcastMessage = (e: MessageEvent<JobUpdateEventDetail>) => {
    if (e.data) {
      callback(e.data);
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

  const channel = getBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    if (channel) {
      channel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}
