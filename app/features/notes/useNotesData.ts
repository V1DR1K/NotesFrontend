import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useNotesData(page: number, categoryCode: string, sort: string, projectCode = "all") {
  const query = new URLSearchParams({ page: String(page), size: "6", sort: sort === "old" ? "date,asc" : "date,desc" });
  const [categoryProject, scopedCategory] = categoryCode === "all" ? ["all", "all"] : categoryCode.split(":", 2);
  if (scopedCategory !== "all") query.set("categoryCode", scopedCategory);
  const effectiveProject = categoryProject !== "all" ? categoryProject : projectCode;
  if (effectiveProject !== "all") query.set("projectCode", effectiveProject);
  return useApiQuery(`notes:${page}:${categoryCode}:${sort}:${projectCode}`, (signal) => api.notes(query, signal));
}
