import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import type { Note, PageResponse } from "../../lib/api/types";
import { resolveCategoryScope } from "../../lib/categories";

const NOTES_PAGE_SIZE = 6;

function notesQuery(categoryScope: string, page: number, size: number, sort: string, projectCode: string, from: string, to: string) {
  const query = new URLSearchParams({ page: String(page), size: String(size), sort: sort === "old" ? "date,asc" : "date,desc" });
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const scope = resolveCategoryScope(categoryScope);
  if (scope.categoryCode !== "all") query.set("categoryCode", scope.categoryCode);
  const effectiveProject = scope.projectCode !== "all" ? scope.projectCode : projectCode;
  if (effectiveProject !== "all") query.set("projectCode", effectiveProject);
  return query;
}

function compareNotes(left: Note, right: Note, sort: string) {
  const dateOrder = left.date.localeCompare(right.date);
  const order = sort === "old" ? dateOrder : -dateOrder;
  return order || left.id.localeCompare(right.id);
}

export function useNotesData(page: number, categoryCode: string | string[], sort: string, projectCode = "all", from = "", to = "") {
  const categoryScopes = Array.isArray(categoryCode) ? [...new Set(categoryCode)].sort() : categoryCode === "all" ? [] : [categoryCode];
  const categoryScopeKey = JSON.stringify(categoryScopes);
  const queryKey = `notes:${page}:${categoryScopeKey}:${sort}:${projectCode}:${from}:${to}`;
  return useApiQuery(queryKey, async (signal): Promise<PageResponse<Note>> => {
    if (categoryScopes.length <= 1) {
      return api.notes(notesQuery(categoryScopes[0] ?? "all", page, NOTES_PAGE_SIZE, sort, projectCode, from, to), signal);
    }

    const size = (page + 1) * NOTES_PAGE_SIZE;
    const pages = await Promise.all(categoryScopes.map((scope) => api.notes(notesQuery(scope, 0, size, sort, projectCode, from, to), signal)));
    const totalElements = pages.reduce((total, result) => total + result.totalElements, 0);
    const totalPages = Math.ceil(totalElements / NOTES_PAGE_SIZE);
    const content = pages.flatMap((result) => result.content).sort((left, right) => compareNotes(left, right, sort)).slice(page * NOTES_PAGE_SIZE, (page + 1) * NOTES_PAGE_SIZE);
    return { content, page, size: NOTES_PAGE_SIZE, totalElements, totalPages, first: page === 0, last: page + 1 >= totalPages };
  });
}
