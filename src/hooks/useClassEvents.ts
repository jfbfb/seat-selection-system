/**
 * 前端 SSE 订阅 Hook
 *
 * 1. 先 GET /api/classes/{id}/state 拉一次完整状态
 * 2. 再连 EventSource 收推送；断线 3 秒后自动重连
 * 用于：学生选座页、学生查看页、老师班级详情页
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ClassSeatState } from "@/lib/types";

export function useClassEvents(
  classId: string | null,
  onUpdate: (state: ClassSeatState) => void
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const fetchState = useCallback(async (id: string) => {
    const res = await fetch(`/api/classes/${id}/state`);
    if (res.ok) {
      const data = await res.json();
      onUpdateRef.current(data.seatState);
    }
  }, []);

  useEffect(() => {
    if (!classId) return;

    const id = classId;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource(`/api/classes/${id}/events`);

      es.onmessage = (event) => {
        try {
          const state = JSON.parse(event.data) as ClassSeatState;
          onUpdateRef.current(state);
        } catch {
          void fetchState(id);
        }
      };

      es.onerror = () => {
        es?.close();
        retryTimer = setTimeout(connect, 3000);
      };
    }

    void fetchState(id);
    connect();

    return () => {
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [classId, fetchState]);
}
