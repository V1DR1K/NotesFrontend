import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useTasksData(categoryCode: string) {
  const query = new URLSearchParams({ page: "0", size: "100", sort: "dueDate,asc" });
  if (categoryCode !== "all") query.set("categoryCode", categoryCode);
  return useApiQuery(`tasks:${categoryCode}`, (signal) => api.tasks(query, signal));
}
