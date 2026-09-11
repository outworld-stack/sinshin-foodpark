import { Elysia, t } from "elysia";
import type { SseHub } from "../../realtime/sse-hub";

/**
 * SSE endpoint — proves the whole chain works end-to-end:
 *   browser → Caddy (flush_interval -1, TLS) → ReadableStream → SseHub
 *
 * Uses the web-standard ReadableStream (Bun-native, zero helpers):
 * works on every Elysia version and behind every proxy.
 *
 * When the orders module lands, the admin level-2 live panel consumes
 *   GET /api/realtime/stream?channel=orders:new   (auth-guarded)
 * and every mutation publishes through sseHub.publish("orders:new", …).
 */
const encoder = new TextEncoder();

const sseChunk = (event: string, data: unknown): Uint8Array =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export const realtimeModule = (hub: SseHub) =>
  new Elysia({ prefix: "/realtime", tags: ["Realtime"] })
    .get(
      "/stream",
      ({ set, query, request }) => {
        set.headers["content-type"] = "text/event-stream";
        set.headers["cache-control"] = "no-cache";
        set.headers["x-accel-buffering"] = "no"; // disable proxy buffering

        const channel = query.channel ?? "demo";
        let unsubscribe: (() => void) | null = null;
        let heartbeat: ReturnType<typeof setInterval> | null = null;

        const cleanup = () => {
          unsubscribe?.();
          unsubscribe = null;
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = null;
        };

        // client disconnected (tab closed, network drop) → free the slot
        request.signal.addEventListener("abort", cleanup);

        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              sseChunk("connected", {
                channel,
                at: new Date().toISOString(),
              }),
            );

            unsubscribe = hub.subscribe(channel, (payload) => {
              controller.enqueue(sseChunk(payload.event, payload.data));
            });

            // keepalive comment frame every 15s (proxies, LB idle timeouts)
            heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(": ping\n\n"));
              } catch {
                cleanup();
              }
            }, 15_000);
          },
          cancel() {
            cleanup();
          },
        });
      },
      {
        query: t.Object({
          channel: t.Optional(t.String()),
        }),
        detail: {
          summary: "SSE live feed (demo channel until orders module lands)",
          description:
            "Server-Sent Events stream. Subscribe with ?channel=demo, publish via POST /realtime/publish.",
        },
      },
    )
    .post(
      "/publish",
      ({ body, set }) => {
        // demo-only helper to test fan-out; removed when auth guards arrive
        if (!body.channel.startsWith("demo")) {
          set.status = 403;
          return { error: "only demo/* channels are publishable" };
        }
        hub.publish(body.channel, { event: body.event, data: body.data });
        return { ok: true, subscribers: hub.subscriberCount(body.channel) };
      },
      {
        body: t.Object({
          channel: t.String(),
          event: t.String(),
          data: t.Unknown(),
        }),
        detail: { summary: "Publish an SSE event (demo channels only)" },
      },
    );