import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useDashboardData() {
  return useApiQuery("dashboard", api.dashboard);
}
