"use client";

import type { ApiConfig } from "../lib/api/types";
import { FinancesView, type FinanceTab } from "../features/finances/FinancesView";

export function FinanzasModule({ config, focusId, tab, onTabChange }: { config: ApiConfig; focusId?: string | null; tab: FinanceTab; onTabChange: (tab: FinanceTab) => void }) {
  return <FinancesView config={config} focusId={focusId} tab={tab} onTabChange={onTabChange} />;
}
