"use client";

import type { ApiConfig } from "../lib/api/types";
import { DayView } from "../features/day/DayView";

export function MiDiaModule({ config, focusId }: { config: ApiConfig; focusId?: string | null }) {
  return <DayView config={config} focusId={focusId} />;
}
