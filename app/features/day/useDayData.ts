import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useDayData(page: number, statusCode: string, feelings: string[], from: string, to: string) {
  const query = new URLSearchParams({ page: String(page), size: "6" });
  if (statusCode !== "all") query.set("statusCode", statusCode);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  feelings.forEach((feeling) => query.append("feeling", feeling));
  return useApiQuery(`days:${page}:${statusCode}:${feelings.join(",")}:${from}:${to}`, () => api.days(query));
}
