"use client";

import type { ApiConfig } from "../lib/api/types";
import { DayView } from "../features/day/DayView";

export function MiDiaModule({ config }: { config: ApiConfig }) {
  return <DayView config={config} />;
}
