import { useCallback, useState } from "react";
import type { Task, TaskStatus } from "../../lib/api/types";
import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

const PAGE_SIZE = 100;
const COMPLETED_WINDOW_MS = 168 * 60 * 60 * 1000;

type TaskBoardData = {
  content: Task[];
  previousCount: number;
  completedAfter: string;
};

function taskQuery(categoryCode: string, projectCode: string, status: TaskStatus, page: number, sort: string, completedAfter?: string, completedBefore?: string, size = PAGE_SIZE) {
  const query = new URLSearchParams({ status, page: String(page), size: String(size), sort });
  if (categoryCode !== "all") query.set("categoryCode", categoryCode);
  if (projectCode !== "all") query.set("projectCode", projectCode);
  if (completedAfter) query.set("completedAfter", completedAfter);
  if (completedBefore) query.set("completedBefore", completedBefore);
  return query;
}

async function loadAllPages(categoryCode: string, projectCode: string, status: TaskStatus, sort: string, signal: AbortSignal, completedAfter?: string) {
  const items: Task[] = [];
  let page = 0;
  while (true) {
    const result = await api.tasks(taskQuery(categoryCode, projectCode, status, page, sort, completedAfter), signal);
    items.push(...result.content);
    if (result.last) return items;
    page += 1;
  }
}

export function useTasksData(categoryCode: string, projectCode = "all") {
  const query = useApiQuery<TaskBoardData>(`tasks-board:${categoryCode}:${projectCode}`, async (signal) => {
    const completedAfter = new Date(Date.now() - COMPLETED_WINDOW_MS).toISOString();
    const [pending, inProgress, recent, previousCountPage] = await Promise.all([
      loadAllPages(categoryCode, projectCode, "PENDING", "dueDate,asc", signal),
      loadAllPages(categoryCode, projectCode, "IN_PROGRESS", "dueDate,asc", signal),
      loadAllPages(categoryCode, projectCode, "COMPLETED", "completedAt,desc", signal, completedAfter),
      api.tasks(taskQuery(categoryCode, projectCode, "COMPLETED", 0, "completedAt,desc", undefined, completedAfter, 1), signal),
    ]);
    return { content: [...pending, ...inProgress, ...recent], previousCount: previousCountPage.totalElements, completedAfter };
  });

  const archiveKey = `${categoryCode}:${projectCode}:${query.data?.completedAfter ?? ""}`;
  const [archiveState, setArchiveState] = useState<{ key: string; tasks: Task[]; loading: boolean; loaded: boolean; error: string | null }>({ key: "", tasks: [], loading: false, loaded: false, error: null });
  const currentArchive = archiveState.key === archiveKey ? archiveState : { key: archiveKey, tasks: [], loading: false, loaded: false, error: null };

  const loadPrevious = useCallback(async () => {
    const board = query.data;
    if (!board || board.previousCount === 0 || currentArchive.loading) return false;
    if (currentArchive.loaded) return true;
    setArchiveState({ key: archiveKey, tasks: [], loading: true, loaded: false, error: null });
    try {
      const tasks: Task[] = [];
      let page = 0;
      while (true) {
        const result = await api.tasks(taskQuery(categoryCode, projectCode, "COMPLETED", page, "completedAt,desc", undefined, board.completedAfter));
        tasks.push(...result.content);
        if (result.last) break;
        page += 1;
      }
      setArchiveState({ key: archiveKey, tasks, loading: false, loaded: true, error: null });
      return true;
    } catch {
      setArchiveState({ key: archiveKey, tasks: [], loading: false, loaded: false, error: "No se pudieron cargar las tareas anteriores. Probá de nuevo." });
      return false;
    }
  }, [archiveKey, currentArchive.loaded, currentArchive.loading, query.data, categoryCode, projectCode]);

  return { ...query, previousTasks: currentArchive.tasks, previousLoading: currentArchive.loading, previousError: currentArchive.error, loadPrevious };
}
