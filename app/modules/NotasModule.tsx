"use client";

import type { ApiConfig } from "../lib/api/types";
import { NotesView } from "../features/notes/NotesView";

export function NotasModule({ config }: { config: ApiConfig }) {
  return <NotesView config={config} />;
}
