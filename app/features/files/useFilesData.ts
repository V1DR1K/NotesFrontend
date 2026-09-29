import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useFilesData(page: number, kind: string, folderId: string, search: string, projectCode = "all") {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (kind !== "all") query.set("kind", kind);
  if (folderId !== "all") query.set("folderId", folderId);
  if (projectCode !== "all") query.set("projectCode", projectCode);
  if (search.trim()) query.set("search", search.trim());
  const files = useApiQuery(`files:${page}:${kind}:${folderId}:${search}:${projectCode}`, (signal) => api.files(query, signal));
  const folders = useApiQuery(`file-folders:${projectCode}`, (signal) => api.folders(projectCode, signal));
  return {
    data: files.data && folders.data ? [files.data, folders.data] as const : null,
    loading: files.loading || folders.loading,
    refreshing: files.refreshing || folders.refreshing,
    error: files.error ?? folders.error,
    reload: () => { files.reload(); folders.reload(); },
  };
}
