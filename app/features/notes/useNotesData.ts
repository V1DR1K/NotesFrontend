import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useNotesData(page: number, categoryCode: string) {
  const query = new URLSearchParams({ page: String(page), size: "6" });
  if (categoryCode !== "all") query.set("categoryCode", categoryCode);
  return useApiQuery(`notes:${page}:${categoryCode}`, () => api.notes(query));
}
