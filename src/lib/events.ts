/**
 * 班级内存事件总线 → 驱动 SSE 推送
 *
 * 当座位变化时，API 调用 emitClassEvent()；
 * SSE 路由 /api/classes/[id]/events 订阅后把最新 seatState 推给前端。
 * 注意：存在单进程内存中，Serverless 多实例时仅同实例连接能即时收到。
 */
type ClassEventType =
  | "seat_selected"
  | "seat_moved"
  | "selection_updated"
  | "layout_updated"
  | "selection_closed"
  | "selection_opened";

export interface ClassEvent {
  type: ClassEventType;
  classId: string;
  timestamp: number;
}

type Listener = (event: ClassEvent) => void;

class ClassEventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(classId: string, listener: Listener): () => void {
    if (!this.listeners.has(classId)) {
      this.listeners.set(classId, new Set());
    }
    this.listeners.get(classId)!.add(listener);
    return () => {
      this.listeners.get(classId)?.delete(listener);
    };
  }

  emit(event: ClassEvent) {
    const set = this.listeners.get(event.classId);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

export const classEventBus = new ClassEventBus();

export function emitClassEvent(
  classId: string,
  type: ClassEventType
): void {
  classEventBus.emit({ type, classId, timestamp: Date.now() });
}
