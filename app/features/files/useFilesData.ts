import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useFilesData(page: number, kind: string, folderId: string) {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (kind !== "all") query.set("kind", kind);
  if (folderId !== "all") query.set("folderId", folderId);
  return useApiQuery(`files:${page}:${kind}:${folderId}`, () => Promise.all([api.files(query), api.folders()]));
}
