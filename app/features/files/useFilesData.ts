import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useFilesData(page: number, kind: string, folderId: string) {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (kind !== "all") query.set("kind", kind);
  if (folderId !== "all") query.set("folderId", folderId);
  const files = useApiQuery(`files:${page}:${kind}:${folderId}`, () => api.files(query));
  const folders = useApiQuery("file-folders", () => api.folders());
  return {
    data: files.data && folders.data ? [files.data, folders.data] as const : null,
    loading: files.loading || folders.loading,
    refreshing: files.refreshing || folders.refreshing,
    error: files.error ?? folders.error,
    reload: () => { files.reload(); folders.reload(); },
  };
}
