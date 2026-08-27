"use client";

import type { ApiConfig } from "../lib/api/types";
import { NotesView } from "../features/notes/NotesView";

export function NotasModule({ config, focusId }: { config: ApiConfig; focusId?: string | null }) {
  return <NotesView config={config} focusId={focusId} />;
}
