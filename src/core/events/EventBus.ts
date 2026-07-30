/**
 * Platform Event Bus (Decoupled Pub/Sub Engine)
 * Location: /src/core/events/EventBus.ts
 * Communicates events across all core engines without tight coupling.
 */

import { PlatformEvent } from '../types/platform.core.types';

type EventCallback<T = any> = (event: PlatformEvent<T>) => void | Promise<void>;

export class PlatformEventBus {
  private static instance: PlatformEventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): PlatformEventBus {
    if (!PlatformEventBus.instance) {
      PlatformEventBus.instance = new PlatformEventBus();
    }
    return PlatformEventBus.instance;
  }

  /**
   * Subscribe to a platform event type
   */
  public subscribe<T = any>(eventType: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Publish a platform event across all subscribers asynchronously
   */
  public async publish<T = any>(event: Omit<PlatformEvent<T>, 'eventId' | 'timestamp'>): Promise<void> {
    const fullEvent: PlatformEvent<T> = {
      ...event,
      eventId: 'evt-' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };

    const callbacks = this.listeners.get(event.eventType);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          await callback(fullEvent);
        } catch (err) {
          console.error(`[PlatformEventBus] Error handling event ${event.eventType}:`, err);
        }
      }
    }
  }
}
