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
