import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

const DAY_ENTRIES_PAGE_SIZE = 6;

export function useDayData(page: number, statusCode: string, feelings: string[], from: string, to: string, sort: string) {
  const query = new URLSearchParams({ page: String(page), size: String(DAY_ENTRIES_PAGE_SIZE), sort: sort === "old" ? "date,asc" : "date,desc" });
  if (statusCode !== "all") query.set("statusCode", statusCode);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  feelings.forEach((feeling) => query.append("feeling", feeling));
  return useApiQuery(`days:${page}:${statusCode}:${feelings.join(",")}:${from}:${to}:${sort}`, (signal) => api.days(query, signal));
}
