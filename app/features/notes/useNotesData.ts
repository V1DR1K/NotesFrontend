import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useNotesData(page: number, categoryCode: string, sort: string, projectCode = "all") {
  const query = new URLSearchParams({ page: String(page), size: "6", sort: sort === "old" ? "date,asc" : "date,desc" });
  if (categoryCode !== "all") query.set("categoryCode", categoryCode);
  if (projectCode !== "all") query.set("projectCode", projectCode);
  return useApiQuery(`notes:${page}:${categoryCode}:${sort}:${projectCode}`, (signal) => api.notes(query, signal));
}
