/**
 * SSE hub — in-memory fan-out per channel + Redis pub/sub bridge.
 *
 * Today (single api container): publish() fans out locally.
 * Tomorrow (LB, N replicas): publish() ALSO goes through Redis pub/sub,
 * and every replica delivers to ITS own connected admin clients.
 * The SSE route shape never changes.
 *
 * Channels (planned):
 *   orders:new            → admin level-2 live orders panel
 *   orders:$orderId       → status tracking (kitchen/courier/customer)
 */
import type { RedisService } from "../cache/redis";

export interface SsePayload {
  event: string;
  data: unknown;
}

export type SseSubscriber = (payload: SsePayload) => void;

export class SseHub {
  private readonly channels = new Map<string, Set<SseSubscriber>>();

  constructor(private readonly redis: RedisService) {}

  /** Returns an unsubscribe function. */
  subscribe(channel: string, subscriber: SseSubscriber): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(subscriber);
    return () => {
      set?.delete(subscriber);
      if (set && set.size === 0) this.channels.delete(channel);
    };
  }

  publish(channel: string, payload: SsePayload): void {
    // local fan-out
    const set = this.channels.get(channel);
    if (set) {
      for (const subscriber of set) {
        try {
          subscriber(payload);
        } catch (err) {
          console.error("[sse] subscriber threw:", err);
        }
      }
    }
    // cross-replica fan-out (no-op with one replica; ready for the LB day)
    this.redis
      .publish(`sse:${channel}`, JSON.stringify(payload))
      .catch((err) => console.error("[sse] redis publish failed:", err));
  }

  subscriberCount(channel: string): number {
    return this.channels.get(channel)?.size ?? 0;
  }
}