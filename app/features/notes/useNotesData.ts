import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { resolveCategoryScope } from "../../lib/categories";

const NOTES_PAGE_SIZE = 6;

export function useNotesData(page: number, categoryCode: string, sort: string, projectCode = "all") {
  const query = new URLSearchParams({ page: String(page), size: String(NOTES_PAGE_SIZE), sort: sort === "old" ? "date,asc" : "date,desc" });
  const scope = resolveCategoryScope(categoryCode);
  if (scope.categoryCode !== "all") query.set("categoryCode", scope.categoryCode);
  const effectiveProject = scope.projectCode !== "all" ? scope.projectCode : projectCode;
  if (effectiveProject !== "all") query.set("projectCode", effectiveProject);
  return useApiQuery(`notes:${page}:${categoryCode}:${sort}:${projectCode}`, (signal) => api.notes(query, signal));
}
