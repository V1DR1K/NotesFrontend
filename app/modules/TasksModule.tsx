"use client";

import type { ApiConfig } from "../lib/api/types";
import { TasksView } from "../features/tasks/TasksView";

export function TasksModule({ config, focusId, editId }: { config: ApiConfig; focusId?: string | null; editId?: string | null }) {
  return <TasksView config={config} focusId={focusId} editId={editId} />;
}
