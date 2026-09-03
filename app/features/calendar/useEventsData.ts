import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { monthBounds } from "../../lib/presentation";

export function useEventsData(month: string, categoryCode: string, from: string, to: string) {
  const monthRange = monthBounds(month);
  const queryFrom = from && from > monthRange.from ? from : monthRange.from;
  const queryTo = to && to < monthRange.to ? to : monthRange.to;
  const query = new URLSearchParams({ from: queryFrom, to: queryTo, page: "0", size: "100", sort: "date,asc" });
  if (categoryCode !== "all") query.set("categoryCode", categoryCode);
  const emptyRange = queryFrom > queryTo;
  return useApiQuery(`events:${month}:${categoryCode}:${from}:${to}`, (signal) => emptyRange ? Promise.resolve({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, first: true, last: true }) : api.events(query, signal));
}
