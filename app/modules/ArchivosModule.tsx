"use client";

import { FilesView } from "../features/files/FilesView";
import type { ApiConfig } from "../lib/api/types";

export function ArchivosModule({ config, focusId }: { config: ApiConfig; focusId?: string | null }) {
  return <FilesView config={config} focusId={focusId} />;
}
