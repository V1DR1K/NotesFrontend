import { useCallback, useMemo, useState } from "react";
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
  nextPages: Record<TaskStatus, Record<string, number | null>>;
};

type AdditionalTasksState = {
  key: string;
  tasks: Task[];
  nextPages: Record<TaskStatus, Record<string, number | null>>;
  loadingStatus: TaskStatus | null;
  error: string | null;
  errorStatus: TaskStatus | null;
};

function taskQuery(categoryCode: string, projectCode: string, status: TaskStatus, page: number, sort: string, completedAfter?: string, completedBefore?: string, from = "", to = "", size = TASK_BOARD_PAGE_SIZE) {
  const query = new URLSearchParams({ status, page: String(page), size: String(size), sort });
  const scope = resolveCategoryScope(categoryCode);
  if (scope.categoryCode !== "all") query.set("categoryCode", scope.categoryCode);
  const effectiveProject = scope.projectCode !== "all" ? scope.projectCode : projectCode;
  if (effectiveProject !== "all") query.set("projectCode", effectiveProject);
  if (completedAfter) query.set("completedAfter", completedAfter);
  if (completedBefore) query.set("completedBefore", completedBefore);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  return query;
}

function emptyCategoryPages(categoryScopes: string[] = [], initialPage: number | null = null): Record<TaskStatus, Record<string, number | null>> {
  const pages = Object.fromEntries(categoryScopes.map((scope) => [scope, initialPage]));
  return { PENDING: { ...pages }, IN_PROGRESS: { ...pages }, COMPLETED: { ...pages } };
}

export function useTasksData(categoryCode: string | string[], projectCode = "all", from = "", to = "") {
  const categoryScopes = useMemo(() => {
    const selected = Array.isArray(categoryCode) ? categoryCode : categoryCode === "all" ? [] : [categoryCode];
    return selected.length ? [...new Set(selected)].sort() : ["all"];
  }, [categoryCode]);
  const categoryScopeKey = JSON.stringify(categoryScopes);
  const queryKey = `tasks-board:${categoryScopeKey}:${projectCode}:${from}:${to}`;
  const query = useApiQuery<TaskBoardData>(queryKey, async (signal) => {
    const completedAfter = new Date(Date.now() - COMPLETED_WINDOW_MS).toISOString();
    const categoryBoards = await Promise.all(categoryScopes.map(async (categoryScope) => Promise.all([
      api.tasks(taskQuery(categoryScope, projectCode, "PENDING", 0, "dueDate,asc", undefined, undefined, from, to), signal),
      api.tasks(taskQuery(categoryScope, projectCode, "IN_PROGRESS", 0, "dueDate,asc", undefined, undefined, from, to), signal),
      api.tasks(taskQuery(categoryScope, projectCode, "COMPLETED", 0, "completedAt,desc", completedAfter, undefined, from, to), signal),
      api.tasks(taskQuery(categoryScope, projectCode, "COMPLETED", 0, "completedAt,desc", undefined, completedAfter, from, to, 1), signal),
    ])));
    const pending = categoryBoards.map(([page]) => page);
    const inProgress = categoryBoards.map(([, page]) => page);
    const recent = categoryBoards.map(([, , page]) => page);
    const previousCountPages = categoryBoards.map(([, , , page]) => page);
    const statusCounts: Record<TaskStatus, number> = {
      PENDING: pending.reduce((total, page) => total + page.totalElements, 0),
      IN_PROGRESS: inProgress.reduce((total, page) => total + page.totalElements, 0),
      COMPLETED: recent.reduce((total, page) => total + page.totalElements, 0) + previousCountPages.reduce((total, page) => total + page.totalElements, 0),
    };

    return {
      content: categoryBoards.flatMap(([pendingPage, inProgressPage, recentPage]) => [...pendingPage.content, ...inProgressPage.content, ...recentPage.content]),
      previousCount: previousCountPages.reduce((total, page) => total + page.totalElements, 0),
      completedAfter,
      statusCounts,
      totalCount: statusCounts.PENDING + statusCounts.IN_PROGRESS + statusCounts.COMPLETED,
      nextPages: {
        PENDING: Object.fromEntries(pending.map((page, index) => [categoryScopes[index], page.last ? null : 1])),
        IN_PROGRESS: Object.fromEntries(inProgress.map((page, index) => [categoryScopes[index], page.last ? null : 1])),
        COMPLETED: Object.fromEntries(recent.map((page, index) => [categoryScopes[index], page.last ? null : 1])),
      },
    };
  });

  const boardKey = `${queryKey}:${query.data?.completedAfter ?? ""}`;
  const [additionalTasks, setAdditionalTasks] = useState<AdditionalTasksState>({
    key: "",
    tasks: [],
    nextPages: emptyCategoryPages(),
    loadingStatus: null,
    error: null,
    errorStatus: null,
  });
  const currentAdditionalTasks = useMemo(() => additionalTasks.key === boardKey
    ? additionalTasks
    : {
        key: boardKey,
        tasks: [],
        nextPages: query.data?.nextPages ?? emptyCategoryPages(categoryScopes),
        loadingStatus: null,
        error: null,
        errorStatus: null,
      }, [additionalTasks, boardKey, categoryScopes, query.data?.nextPages]);

  const loadMore = useCallback(async (status: TaskStatus) => {
    const board = query.data;
    const pagesByScope = currentAdditionalTasks.nextPages[status];
    const requests = categoryScopes.flatMap((categoryScope) => {
      const page = pagesByScope[categoryScope];
      return page === null || page === undefined ? [] : [{ categoryScope, page }];
    });
    if (!board || !requests.length || currentAdditionalTasks.loadingStatus) return false;

    setAdditionalTasks({ ...currentAdditionalTasks, loadingStatus: status, error: null, errorStatus: null });
    try {
      const sort = status === "COMPLETED" ? "completedAt,desc" : "dueDate,asc";
      const completedAfter = status === "COMPLETED" ? board.completedAfter : undefined;
      const results = await Promise.all(requests.map(({ categoryScope, page }) => api.tasks(taskQuery(categoryScope, projectCode, status, page, sort, completedAfter, undefined, from, to))));
      setAdditionalTasks((current) => {
        const base = current.key === boardKey ? current : currentAdditionalTasks;
        const nextPagesForStatus = { ...base.nextPages[status] };
        requests.forEach(({ categoryScope, page }, index) => { nextPagesForStatus[categoryScope] = results[index].last ? null : page + 1; });
        return {
          ...base,
          tasks: [...base.tasks, ...results.flatMap((result) => result.content)],
          nextPages: { ...base.nextPages, [status]: nextPagesForStatus },
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
  }, [boardKey, categoryScopes, currentAdditionalTasks, from, projectCode, query.data, to]);

  const archiveKey = `${categoryScopeKey}:${projectCode}:${from}:${to}:${query.data?.completedAfter ?? ""}`;
  const [archiveState, setArchiveState] = useState<{ key: string; tasks: Task[]; loading: boolean; loaded: boolean; error: string | null }>({ key: "", tasks: [], loading: false, loaded: false, error: null });
  const currentArchive = archiveState.key === archiveKey ? archiveState : { key: archiveKey, tasks: [], loading: false, loaded: false, error: null };

  const loadPrevious = useCallback(async () => {
    const board = query.data;
    if (!board || board.previousCount === 0 || currentArchive.loading) return false;
    if (currentArchive.loaded) return true;
    setArchiveState({ key: archiveKey, tasks: [], loading: true, loaded: false, error: null });
    try {
      const taskGroups = await Promise.all(categoryScopes.map(async (categoryScope) => {
        const tasks: Task[] = [];
        let page = 0;
        while (true) {
          const result = await api.tasks(taskQuery(categoryScope, projectCode, "COMPLETED", page, "completedAt,desc", undefined, board.completedAfter, from, to));
          tasks.push(...result.content);
          if (result.last) break;
          page += 1;
        }
        return tasks;
      }));
      const tasks = taskGroups.flat();
      setArchiveState({ key: archiveKey, tasks, loading: false, loaded: true, error: null });
      return true;
    } catch {
      setArchiveState({ key: archiveKey, tasks: [], loading: false, loaded: false, error: "No se pudieron cargar las tareas anteriores. Probá de nuevo." });
      return false;
    }
  }, [archiveKey, currentArchive.loaded, currentArchive.loading, query.data, categoryScopes, from, projectCode, to]);

  const hasMore = query.data
    ? Object.fromEntries((Object.keys(query.data.nextPages) as TaskStatus[]).map((status) => [status, Object.values(currentAdditionalTasks.nextPages[status]).some((page) => page !== null)])) as Record<TaskStatus, boolean>
    : { PENDING: false, IN_PROGRESS: false, COMPLETED: false };

  const data = query.data
    ? { ...query.data, content: [...query.data.content, ...currentAdditionalTasks.tasks] }
    : null;

  return {
    ...query,
    data,
    hasMore,
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
