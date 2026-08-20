"use client";

import type { ApiConfig } from "../lib/api/types";
import { FinancesView } from "../features/finances/FinancesView";

export function FinanzasModule({ config }: { config: ApiConfig }) {
  return <FinancesView config={config} />;
}
