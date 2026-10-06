import { useCallback, useState } from "react";
import type { Task, TaskStatus } from "../../lib/api/types";
import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { resolveCategoryScope } from "../../lib/categories";

const TASK_BOARD_PAGE_SIZE = 100;
const COMPLETED_WINDOW_MS = 168 * 60 * 60 * 1000;

type TaskBoardData = {
  content: Task[];
  previousCount: number;
  completedAfter: string;
  totalCount: number;
  statusCounts: Record<TaskStatus, number>;
  nextPages: Record<TaskStatus, number | null>;
};

type AdditionalTasksState = {
  key: string;
  tasks: Task[];
  nextPages: Record<TaskStatus, number | null>;
  loadingStatus: TaskStatus | null;
  error: string | null;
  errorStatus: TaskStatus | null;
};

function taskQuery(categoryCode: string, projectCode: string, status: TaskStatus, page: number, sort: string, completedAfter?: string, completedBefore?: string, size = TASK_BOARD_PAGE_SIZE) {
  const query = new URLSearchParams({ status, page: String(page), size: String(size), sort });
  const scope = resolveCategoryScope(categoryCode);
  if (scope.categoryCode !== "all") query.set("categoryCode", scope.categoryCode);
  const effectiveProject = scope.projectCode !== "all" ? scope.projectCode : projectCode;
  if (effectiveProject !== "all") query.set("projectCode", effectiveProject);
  if (completedAfter) query.set("completedAfter", completedAfter);
  if (completedBefore) query.set("completedBefore", completedBefore);
  return query;
}

export function useTasksData(categoryCode: string, projectCode = "all") {
  const queryKey = `tasks-board:${categoryCode}:${projectCode}`;
  const query = useApiQuery<TaskBoardData>(queryKey, async (signal) => {
    const completedAfter = new Date(Date.now() - COMPLETED_WINDOW_MS).toISOString();
    const [pending, inProgress, recent, previousCountPage] = await Promise.all([
      api.tasks(taskQuery(categoryCode, projectCode, "PENDING", 0, "dueDate,asc"), signal),
      api.tasks(taskQuery(categoryCode, projectCode, "IN_PROGRESS", 0, "dueDate,asc"), signal),
      api.tasks(taskQuery(categoryCode, projectCode, "COMPLETED", 0, "completedAt,desc", completedAfter), signal),
      api.tasks(taskQuery(categoryCode, projectCode, "COMPLETED", 0, "completedAt,desc", undefined, completedAfter, 1), signal),
    ]);
    const statusCounts: Record<TaskStatus, number> = {
      PENDING: pending.totalElements,
      IN_PROGRESS: inProgress.totalElements,
      COMPLETED: recent.totalElements + previousCountPage.totalElements,
    };

    return {
      content: [...pending.content, ...inProgress.content, ...recent.content],
      previousCount: previousCountPage.totalElements,
      completedAfter,
      statusCounts,
      totalCount: statusCounts.PENDING + statusCounts.IN_PROGRESS + statusCounts.COMPLETED,
      nextPages: {
        PENDING: pending.last ? null : 1,
        IN_PROGRESS: inProgress.last ? null : 1,
        COMPLETED: recent.last ? null : 1,
      },
    };
  });

  const boardKey = `${queryKey}:${query.data?.completedAfter ?? ""}`;
  const [additionalTasks, setAdditionalTasks] = useState<AdditionalTasksState>({
    key: "",
    tasks: [],
    nextPages: { PENDING: null, IN_PROGRESS: null, COMPLETED: null },
    loadingStatus: null,
    error: null,
    errorStatus: null,
  });
  const currentAdditionalTasks = additionalTasks.key === boardKey
    ? additionalTasks
    : {
        key: boardKey,
        tasks: [],
        nextPages: query.data?.nextPages ?? { PENDING: null, IN_PROGRESS: null, COMPLETED: null },
        loadingStatus: null,
        error: null,
        errorStatus: null,
      };

  const loadMore = useCallback(async (status: TaskStatus) => {
    const board = query.data;
    const page = currentAdditionalTasks.nextPages[status];
    if (!board || page === null || currentAdditionalTasks.loadingStatus) return false;

    setAdditionalTasks({ ...currentAdditionalTasks, loadingStatus: status, error: null, errorStatus: null });
    try {
      const sort = status === "COMPLETED" ? "completedAt,desc" : "dueDate,asc";
      const completedAfter = status === "COMPLETED" ? board.completedAfter : undefined;
      const result = await api.tasks(taskQuery(categoryCode, projectCode, status, page, sort, completedAfter));
      setAdditionalTasks((current) => {
        const base = current.key === boardKey ? current : currentAdditionalTasks;
        return {
          ...base,
          tasks: [...base.tasks, ...result.content],
          nextPages: { ...base.nextPages, [status]: result.last ? null : page + 1 },
          loadingStatus: null,
          error: null,
          errorStatus: null,
        };
      });
      return true;
    } catch {
      setAdditionalTasks((current) => {
        const base = current.key === boardKey ? current : currentAdditionalTasks;
        return { ...base, loadingStatus: null, error: "No se pudieron cargar más tareas. Probá de nuevo.", errorStatus: status };
      });
      return false;
    }
  }, [boardKey, categoryCode, currentAdditionalTasks, projectCode, query.data]);

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

  const data = query.data
    ? { ...query.data, content: [...query.data.content, ...currentAdditionalTasks.tasks] }
    : null;

  return {
    ...query,
    data,
    hasMore: currentAdditionalTasks.nextPages,
    loadingMore: currentAdditionalTasks.loadingStatus,
    loadMoreError: currentAdditionalTasks.error
      ? { status: currentAdditionalTasks.errorStatus, message: currentAdditionalTasks.error }
      : null,
    loadMore,
    previousTasks: currentArchive.tasks,
    previousLoading: currentArchive.loading,
    previousError: currentArchive.error,
    loadPrevious,
  };
}
