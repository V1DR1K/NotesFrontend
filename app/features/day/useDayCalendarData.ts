import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { monthBounds } from "../../lib/presentation";

export function useDayCalendarData(month: string) {
  const { from, to } = monthBounds(month);
  const query = new URLSearchParams({ from, to, page: "0", size: "40", sort: "date,asc" });
  return useApiQuery(`day-calendar:${month}`, () => api.days(query));
}
