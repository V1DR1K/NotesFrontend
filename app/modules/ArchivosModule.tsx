"use client";

import { FilesView } from "../features/files/FilesView";

export function ArchivosModule({ focusId }: { focusId?: string | null }) {
  return <FilesView focusId={focusId} />;
}
