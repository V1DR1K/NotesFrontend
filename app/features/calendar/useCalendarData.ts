import type { CalendarEvent, PageResponse, Task } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useApiQuery } from "../../lib/api/hooks";
import { monthBounds } from "../../lib/presentation";

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

export function useCalendarData(month: string, type: CalendarItemType, eventCategoryCode: string, taskCategoryCode: string, from: string, to: string) {
  const monthRange = monthBounds(month);
  const queryFrom = from && from > monthRange.from ? from : monthRange.from;
  const queryTo = to && to < monthRange.to ? to : monthRange.to;
  const emptyRange = queryFrom > queryTo;
  const key = `calendar:${month}:${type}:${eventCategoryCode}:${taskCategoryCode}:${from}:${to}`;

  return useApiQuery<CalendarData>(key, async (signal) => {
    if (emptyRange) return { events: [], tasks: [], totalElements: 0 };

    const eventQuery = new URLSearchParams({ from: queryFrom, to: queryTo, page: "0", size: "100", sort: "date,asc" });
    if (eventCategoryCode !== "all") eventQuery.set("categoryCode", eventCategoryCode);

    const taskQuery = new URLSearchParams({ from: queryFrom, to: queryTo, page: "0", size: "100", sort: "dueDate,asc" });
    if (taskCategoryCode !== "all") taskQuery.set("categoryCode", taskCategoryCode);

    const [events, tasks] = await Promise.all([
      type === "tasks" ? Promise.resolve(emptyPage<CalendarEvent>()) : api.events(eventQuery, signal),
      type === "events" ? Promise.resolve(emptyPage<Task>()) : api.tasks(taskQuery, signal),
    ]);

    return {
      events: events.content,
      tasks: tasks.content,
      totalElements: events.totalElements + tasks.totalElements,
    };
  });
}
