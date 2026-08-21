import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useDayData(page: number, statusCode: string, feelings: string[], date: string) {
  const query = new URLSearchParams({ page: String(page), size: "6" });
  if (statusCode !== "all") query.set("statusCode", statusCode);
  if (date) query.set("date", date);
  feelings.forEach((feeling) => query.append("feeling", feeling));
  return useApiQuery(`days:${page}:${statusCode}:${feelings.join(",")}:${date}`, () => api.days(query));
}
