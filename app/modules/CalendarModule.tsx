"use client";

import type { ApiConfig } from "../lib/api/types";
import { CalendarView } from "../features/calendar/CalendarView";

export function CalendarModule({ config, focusId }: { config: ApiConfig; focusId?: string | null }) {
  return <CalendarView config={config} focusId={focusId} />;
}
