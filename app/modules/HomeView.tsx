"use client";

import type { SectionKey } from "../config/sections";
import { DashboardView } from "../features/dashboard/DashboardView";

export function HomeView({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  return <DashboardView onNavigate={onNavigate} />;
}
