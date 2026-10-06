import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { monthBounds } from "../../lib/presentation";

const DAY_CALENDAR_PAGE_SIZE = 40;

export function useDayCalendarData(month: string) {
  const { from, to } = monthBounds(month);
  const query = new URLSearchParams({ from, to, page: "0", size: String(DAY_CALENDAR_PAGE_SIZE), sort: "date,asc" });
  return useApiQuery(`day-calendar:${month}`, (signal) => api.days(query, signal));
}
