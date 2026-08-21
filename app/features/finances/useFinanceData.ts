import { useApiQuery } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { todayIso } from "../../lib/presentation";

export function useFinanceData(page: number, bucket: string, date: string, itemCode: string) {
  const query = new URLSearchParams({ page: String(page), size: "8" });
  if (bucket !== "all") query.set("bucket", bucket);
  if (date) query.set("date", date);
  if (itemCode !== "all") query.set("itemCode", itemCode);
  const summaryQuery = new URLSearchParams();
  if (date) { summaryQuery.set("from", date); summaryQuery.set("to", date); }
  else { const currentDay = todayIso(); summaryQuery.set("from", `${currentDay.slice(0, 7)}-01`); summaryQuery.set("to", currentDay); }
  return useApiQuery(`finance:${page}:${bucket}:${date}:${itemCode}`, () => Promise.all([api.movements(query), api.financeSummary(summaryQuery), api.exchangeRate()]));
}
