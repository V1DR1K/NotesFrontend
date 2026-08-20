import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useDayData(page: number, statusCode: string) {
  const query = new URLSearchParams({ page: String(page), size: "6" });
  if (statusCode !== "all") query.set("statusCode", statusCode);
  return useApiQuery(`days:${page}:${statusCode}`, () => api.days(query));
}
