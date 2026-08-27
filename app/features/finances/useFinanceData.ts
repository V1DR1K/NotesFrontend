import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useFinanceData(page: number, bucket: string, from: string, to: string, itemCode: string) {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (bucket !== "all") query.set("bucket", bucket);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (itemCode !== "all") query.set("itemCode", itemCode);
  const rangeQuery = new URLSearchParams({ from, to });
  const movements = useApiQuery(`finance:movements:${page}:${bucket}:${from}:${to}:${itemCode}`, (signal) => api.movements(query, signal));
  const summary = useApiQuery(`finance:summary:${from}:${to}`, (signal) => api.financeSummary(rangeQuery, signal));
  const analytics = useApiQuery(`finance:analytics:${from}:${to}`, (signal) => api.financeAnalytics(rangeQuery, signal));
  const exchangeRate = useApiQuery("finance:exchange-rate", (signal) => api.exchangeRate(signal));
  const accounts = useApiQuery("finance:accounts", (signal) => api.financeAccounts(signal));
  return {
    data: [movements.data, summary.data, analytics.data, exchangeRate.data, accounts.data] as const,
    loading: movements.loading,
    auxiliaryLoading: summary.loading || analytics.loading || exchangeRate.loading || accounts.loading,
    refreshing: movements.refreshing || summary.refreshing || analytics.refreshing || exchangeRate.refreshing || accounts.refreshing,
    error: movements.error,
    auxiliaryError: summary.error ?? analytics.error ?? exchangeRate.error ?? accounts.error,
    reload: () => { movements.reload(); summary.reload(); analytics.reload(); exchangeRate.reload(); accounts.reload(); },
  };
}
