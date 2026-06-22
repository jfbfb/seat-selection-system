/**
 * GET /api/classes/[id]/events — SSE 端点
 * 浏览器用 EventSource 连接；座位变化时推送最新 seatState JSON
 */
import { classEventBus } from "@/lib/events";
import { getClassSeatState } from "@/lib/class-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        if (closed) return;
        const state = await getClassSeatState(id);
        if (!state) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "not_found" })}\n\n`)
          );
          return;
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(state)}\n\n`)
        );
      };

      void send();

      // 订阅内存事件总线：有人选座/换座时重新查询 DB 并推送
      unsubscribe = classEventBus.subscribe(id, () => {
        void send();
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      const cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
      };

      (controller as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      closed = true;
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
