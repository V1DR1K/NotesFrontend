"use client";

import type { ApiConfig } from "../lib/api/types";
import { CalendarView } from "../features/calendar/CalendarView";

export function CalendarModule({ config, onOpenTask }: { config: ApiConfig; onOpenTask?: (taskId: string) => void }) {
  return <CalendarView config={config} onOpenTask={onOpenTask} />;
}
