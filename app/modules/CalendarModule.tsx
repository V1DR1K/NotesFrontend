"use client";

import type { ApiConfig } from "../lib/api/types";
import { CalendarView } from "../features/calendar/CalendarView";

export function CalendarModule({ config, onOpenTask, focusId, focusDate }: { config: ApiConfig; onOpenTask?: (taskId: string) => void; focusId?: string | null; focusDate?: string | null }) {
  return <CalendarView config={config} onOpenTask={onOpenTask} focusId={focusId} focusDate={focusDate} />;
}
