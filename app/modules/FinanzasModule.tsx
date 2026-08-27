"use client";

import type { ApiConfig } from "../lib/api/types";
import { FinancesView } from "../features/finances/FinancesView";

export function FinanzasModule({ config, focusId }: { config: ApiConfig; focusId?: string | null }) {
  return <FinancesView config={config} focusId={focusId} />;
}
