import type { CalendarEvent, PageResponse, Task } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useApiQuery } from "../../lib/api/hooks";
import { monthBounds } from "../../lib/presentation";
import { resolveCategoryScope } from "../../lib/categories";

const CALENDAR_ITEMS_PAGE_SIZE = 100;

export type CalendarItemType = "all" | "events" | "tasks";

type CalendarData = {
  events: CalendarEvent[];
  tasks: Task[];
  totalElements: number;
};

const emptyPage = <T,>(): PageResponse<T> => ({
  content: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
});

export function useCalendarData(month: string, type: CalendarItemType, categoryKeys: string[], from: string, to: string, projectCode = "all") {
  const monthRange = monthBounds(month);
  const queryFrom = from && from > monthRange.from ? from : monthRange.from;
  const queryTo = to && to < monthRange.to ? to : monthRange.to;
  const emptyRange = queryFrom > queryTo;
  const selectedCategoryScopes = categoryKeys.length ? categoryKeys : ["all"];
  const key = `calendar:${month}:${type}:${JSON.stringify(categoryKeys)}:${from}:${to}:${projectCode}`;

  return useApiQuery<CalendarData>(key, async (signal) => {
    if (emptyRange) return { events: [], tasks: [], totalElements: 0 };

    const filteredPages = await Promise.all(selectedCategoryScopes.map(async (categoryScope) => {
      const scope = resolveCategoryScope(categoryScope);
      const effectiveProject = scope.projectCode !== "all" ? scope.projectCode : projectCode;
      const eventQuery = new URLSearchParams({ from: queryFrom, to: queryTo, page: "0", size: String(CALENDAR_ITEMS_PAGE_SIZE), sort: "date,asc" });
      if (scope.categoryCode !== "all") eventQuery.set("categoryCode", scope.categoryCode);
      if (effectiveProject !== "all") eventQuery.set("projectCode", effectiveProject);

      const taskQuery = new URLSearchParams({ from: queryFrom, to: queryTo, page: "0", size: String(CALENDAR_ITEMS_PAGE_SIZE), sort: "dueDate,asc" });
      if (scope.categoryCode !== "all") taskQuery.set("categoryCode", scope.categoryCode);
      if (effectiveProject !== "all") taskQuery.set("projectCode", effectiveProject);

      return Promise.all([
        type === "tasks" ? Promise.resolve(emptyPage<CalendarEvent>()) : api.events(eventQuery, signal),
        type === "events" ? Promise.resolve(emptyPage<Task>()) : api.tasks(taskQuery, signal),
      ]);
    }));
    const events = filteredPages.flatMap(([eventPage]) => eventPage.content);
    const tasks = filteredPages.flatMap(([, taskPage]) => taskPage.content);
    const totalElements = filteredPages.reduce((total, [eventPage, taskPage]) => total + eventPage.totalElements + taskPage.totalElements, 0);

    return {
      events,
      tasks,
      totalElements,
    };
  });
}
