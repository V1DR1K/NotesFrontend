import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";

export function useFinanceData(page: number, bucket: string, from: string, to: string, itemCode: string) {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (bucket !== "all") query.set("bucket", bucket);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (itemCode !== "all") query.set("itemCode", itemCode);
  const rangeQuery = new URLSearchParams({ from, to });
  return useApiQuery(`finance:${page}:${bucket}:${from}:${to}:${itemCode}`, () => Promise.all([api.movements(query), api.financeSummary(rangeQuery), api.financeAnalytics(rangeQuery), api.exchangeRate(), api.financeAccounts()]));
}
