"use client";

import { useEffect, useState } from "react";
import type { ApiConfig, CryptoAssetCode, CryptoInvestment, FinanceAccount, FinanceBucket, FinanceMovement, FinanceSummary } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { asNumber, currentMonth, dateLabel, fieldError, formatARS, formatARSInputNumber, formatUSD, monthBounds, parseARSInput, parseCryptoDecimal, parseCryptoPrice, parseUSDInput, todayIso } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, MetricCard, ModuleToolbar, Pagination, PeriodRangeFilter, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { FinanceAnalytics } from "./FinanceAnalytics";
import { FinanceAccountsPanel } from "./FinanceAccountsPanel";
import { ARSInput } from "./ARSInput";
import { useFinanceData } from "./useFinanceData";
import { useFocusTarget } from "../../lib/ui/useFocusTarget";
import { CryptoInvestmentPanel } from "./CryptoInvestmentPanel";
import { CryptoInvestmentDialogs } from "./CryptoInvestmentDialogs";
import { FinanceTransferDialog, type TransferDraft } from "./FinanceTransferDialog";
import { movementType, transferAccounts, transferDestinations, transferRoute } from "./financeFlow";

const bucketOptions: Array<{ code: FinanceBucket; label: string }> = [
  { code: "INCOME", label: "Ingreso" },
  { code: "EXPENSE", label: "Egreso" },
];

export type FinanceTab = "inicio" | "crypto" | "movimientos";

const financeTabs: Array<{ id: FinanceTab; label: string }> = [
  { id: "inicio", label: "Inicio" },
  { id: "crypto", label: "Inversión Cripto" },
  { id: "movimientos", label: "Movimientos" },
];

function movementARS(movement: FinanceMovement) {
  return movement.amount?.ars ?? movement.amountArs ?? 0;
}

function summaryValue(summary: FinanceSummary | null | undefined, names: string[], fallback: number) {
  for (const name of names) {
    const value = summary?.[name as keyof FinanceSummary];
    if (value !== undefined) return asNumber(typeof value === "object" && value !== null ? (value as { ars?: unknown }).ars : value);
  }
  return fallback;
}

function financeItemOptions(accountCode: string, bucket: string, accounts: FinanceAccount[], items: ApiConfig["financeItems"]) {
  const account = accounts.find((candidate) => candidate.code.toLowerCase() === accountCode.toLowerCase());
  const financeType = bucket === "INCOME" ? "INCOME" : "EXPENSE";
  return items.filter((item) => item.active !== false && (account?.type === "CASH" || !account ? item.financeType === financeType : item.financeType === "TRANSFER"));
}

function firstFinanceItem(accountCode: string, bucket: string, accounts: FinanceAccount[], items: ApiConfig["financeItems"]) {
  return financeItemOptions(accountCode, bucket, accounts, items)[0]?.code ?? "";
}

export function FinancesView({ config, focusId, tab, onTabChange }: { config: ApiConfig; focusId?: string | null; tab: FinanceTab; onTabChange: (tab: FinanceTab) => void }) {
  const [bucket, setBucket] = useState("all");
  const defaultMonth = currentMonth();
  const defaultRange = monthBounds(defaultMonth);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [calendarMonth, setCalendarMonth] = useState(defaultMonth);
  const [itemCode, setItemCode] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMovement, setPreviewMovement] = useState<FinanceMovement | null>(null);
  const [focusError, setFocusError] = useState("");
  const [previewEditMovement, setPreviewEditMovement] = useState<FinanceMovement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [syncingAccount, setSyncingAccount] = useState<FinanceAccount | null>(null);
  const [syncBalance, setSyncBalance] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transferDraft, setTransferDraft] = useState<TransferDraft>({ sourceAccountCode: "mercadopago", destinationAccountCode: "inversiones_pesos", date: todayIso(), amount: "", exchangeRate: "", note: "" });
  const [transferAmountError, setTransferAmountError] = useState("");
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [investmentDraft, setInvestmentDraft] = useState({ date: todayIso(), assetCode: "BTCUSDT" as CryptoAssetCode, amountUsd: "", unitPriceUsd: "", note: "" });
  const [saleDraft, setSaleDraft] = useState<{ investment: CryptoInvestment; date: string; quantity: string; proceedsUsd: string } | null>(null);
  const [legacyPriceTarget, setLegacyPriceTarget] = useState<CryptoInvestment | null>(null);
  const [legacyUnitPrice, setLegacyUnitPrice] = useState("");
  const [pendingCryptoVoid, setPendingCryptoVoid] = useState<{ kind: "purchase"; investmentId: string; label: string } | { kind: "sale"; investmentId: string; saleId: string; label: string } | null>(null);
  const [amountError, setAmountError] = useState("");
  const [syncBalanceError, setSyncBalanceError] = useState("");
  const [draft, setDraft] = useState({ date: todayIso(), bucket: "EXPENSE", accountCode: "mercadopago", amount: "", itemCode: firstFinanceItem("mercadopago", "EXPENSE", [], config.financeItems), note: "" });
  const data = useFinanceData(page, bucket, from, to, itemCode, sort);
  const mutation = useMutationError();
  const [movements, summary, analytics, ratePayload, accountsPayload, cryptoSummary] = data.data;
  const accounts = accountsPayload ?? [];
  const rate = asNumber(ratePayload?.average);
  const rateSource = ratePayload?.source === "provider" ? "DolarApi Blue" : "Fallback configurado";
  const rateUpdatedAt = ratePayload?.fetchedAt ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ratePayload.fetchedAt)) : null;
  const fallbackIncome = movements?.content.filter((item) => movementType(item) === "INCOME").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackExpense = movements?.content.filter((item) => movementType(item) === "EXPENSE").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackInvested = movements?.content.filter((item) => item.bucket === "INVESTED").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const income = summaryValue(summary, ["income", "totalIncome"], fallbackIncome);
  const expense = summaryValue(summary, ["expense", "totalExpense"], fallbackExpense);
  const periodInvested = summaryValue(summary, ["invested", "totalInvested"], fallbackInvested);
  const cashAccount = accounts.find((account) => account.type === "CASH");
  const investedAccounts = accounts.filter((account) => account.type === "INVESTMENT" || account.type === "CRYPTO");
  const invested = investedAccounts.length ? investedAccounts.reduce((total, account) => total + asNumber(account.balanceArs), 0) : periodInvested;
  const cash = cashAccount ? asNumber(cashAccount.balanceArs) : summaryValue(summary, ["cash", "availableCash"], income - expense - periodInvested);
  const visible = movements?.content ?? [];
  useFocusTarget(focusId, Boolean(data.data));
  useEffect(() => {
    if (!focusId) return;
    let cancelled = false;
    void api.getMovement(focusId).then((movement) => {
      if (!cancelled) { setFocusError(""); setPreviewMovement(movement); }
    }).catch(() => {
      if (!cancelled) setFocusError("No pudimos abrir ese movimiento. Puede que se haya eliminado o que ya no esté disponible.");
    });
    return () => { cancelled = true; };
  }, [focusId]);
  const itemLabel = (code: string) => config.financeItems.find((item) => item.code === code)?.label ?? code;

  const startNew = (bucket = "EXPENSE") => {
    const accountCode = cashAccount?.code ?? "mercadopago";
    setEditingId(null);
    setDraft({ date: todayIso(), bucket, accountCode, amount: "", itemCode: firstFinanceItem(accountCode, bucket, accounts, config.financeItems), note: "" });
    setAmountError("");
    mutation.clearError();
    setComposerOpen(true);
  };

  const startTransfer = (sourceAccountCode = "mercadopago") => {
    setTransferId(null);
    setTransferDraft({ sourceAccountCode, destinationAccountCode: transferDestinations(accounts, sourceAccountCode)[0]?.code ?? "", date: todayIso(), amount: "", exchangeRate: "", note: "" });
    setTransferAmountError("");
    mutation.clearError();
    setTransferOpen(true);
  };

  const startInvestment = () => {
    setInvestmentDraft({ date: todayIso(), assetCode: "BTCUSDT", amountUsd: "", unitPriceUsd: "", note: "" });
    mutation.clearError();
    setInvestmentOpen(true);
  };

  const startSale = (investment: CryptoInvestment) => {
    setSaleDraft({ investment, date: todayIso(), quantity: "", proceedsUsd: "" });
    mutation.clearError();
  };

  const startLegacyPrice = (investment: CryptoInvestment) => {
    setLegacyPriceTarget(investment);
    setLegacyUnitPrice(investment.unitPriceUsd == null ? "" : String(investment.unitPriceUsd));
    mutation.clearError();
  };

  const saveTransfer = async () => {
    if (mutation.pending) return;
    const amount = parseARSInput(transferDraft.amount);
    if (amount === null || amount <= 0) { setTransferAmountError("Ingresá un importe válido mayor a cero."); return; }
    if (!transferDraft.date || !transferAccounts(accounts).some((account) => account.code === transferDraft.sourceAccountCode) || !transferDestinations(accounts, transferDraft.sourceAccountCode).some((account) => account.code === transferDraft.destinationAccountCode)) return;
    const cryptoTransfer = transferDraft.sourceAccountCode === "crypto" || transferDraft.destinationAccountCode === "crypto";
    const exchangeRate = parseUSDInput(transferDraft.exchangeRate);
    if (cryptoTransfer && (exchangeRate === null || exchangeRate <= 0)) { setTransferAmountError("Ingresá la cotización P2P en pesos por USD."); return; }
    setTransferAmountError("");
    try {
      const body = { sourceAccountCode: transferDraft.sourceAccountCode, destinationAccountCode: transferDraft.destinationAccountCode, date: transferDraft.date, amountArs: amount, note: transferDraft.note.trim(), exchangeRate: cryptoTransfer ? exchangeRate! : undefined };
      await mutation.run(() => transferId ? api.updateFinanceTransfer(transferId, body) : api.createFinanceTransfer(body));
      setTransferOpen(false);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };

  const saveInvestment = async () => {
    const amountUsd = parseUSDInput(investmentDraft.amountUsd);
    const unitPriceUsd = parseCryptoPrice(investmentDraft.unitPriceUsd);
    if (amountUsd === null || amountUsd <= 0 || unitPriceUsd === null || unitPriceUsd <= 0 || mutation.pending) return;
    try {
      await mutation.run(() => api.cryptoInvest({ date: investmentDraft.date, assetCode: investmentDraft.assetCode, amountUsd, unitPriceUsd, note: investmentDraft.note.trim() || undefined }));
      setInvestmentOpen(false);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };

  const saveCryptoSale = async () => {
    if (!saleDraft || mutation.pending) return;
    const quantity = parseCryptoDecimal(saleDraft.quantity);
    const proceedsUsd = parseUSDInput(saleDraft.proceedsUsd);
    if (quantity === null || quantity <= 0 || proceedsUsd === null || proceedsUsd <= 0) return;
    try {
      await mutation.run(() => api.sellCrypto(saleDraft.investment.id, { date: saleDraft.date, quantity, proceedsUsd }));
      setSaleDraft(null);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };

  const saveLegacyPrice = async () => {
    if (!legacyPriceTarget || mutation.pending) return;
    const unitPriceUsd = parseCryptoPrice(legacyUnitPrice);
    if (unitPriceUsd === null || unitPriceUsd <= 0) return;
    try {
      await mutation.run(() => api.completeCryptoPurchasePrice(legacyPriceTarget.id, unitPriceUsd));
      setLegacyPriceTarget(null);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };

  const voidCryptoOperation = async () => {
    if (!pendingCryptoVoid || mutation.pending) return;
    try {
      if (pendingCryptoVoid.kind === "purchase") await mutation.run(() => api.voidCryptoInvestment(pendingCryptoVoid.investmentId));
      else await mutation.run(() => api.voidCryptoSale(pendingCryptoVoid.investmentId, pendingCryptoVoid.saleId));
      setPendingCryptoVoid(null);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* keep confirmation open and show the mutation error */ }
  };

  const startEdit = (movement: FinanceMovement) => {
    if (movementType(movement) === "TRANSFER") {
      setTransferId(movement.id);
      setTransferDraft({ ...transferRoute(movement), date: movement.date, amount: formatARSInputNumber(movementARS(movement)), note: movement.note ?? "", exchangeRate: movement.amount?.exchangeRate == null ? "" : String(movement.amount.exchangeRate) });
      setTransferAmountError("");
      mutation.clearError();
      setTransferOpen(true);
      return;
    }
    const accountCode = movement.accountCode || cashAccount?.code || "mercadopago";
    setEditingId(movement.id);
    setDraft({ date: movement.date, bucket: movement.bucket.toUpperCase(), accountCode, amount: formatARSInputNumber(movementARS(movement)), itemCode: movement.itemCode, note: movement.note ?? "" });
    setAmountError("");
    mutation.clearError();
    setComposerOpen(true);
  };
  const closePreview = () => { const movement = previewEditMovement; setPreviewEditMovement(null); setPreviewMovement(null); if (movement) startEdit(movement); };

  const save = async () => {
    if (mutation.pending) return;
    const amount = parseARSInput(draft.amount);
    if (!draft.date || !draft.bucket || !draft.itemCode || amount === null || amount <= 0) {
      setAmountError("Ingresá un importe válido mayor a cero.");
      return;
    }
    setAmountError("");
    try {
      const body = { date: draft.date, bucket: draft.bucket, accountCode: "mercadopago", itemCode: draft.itemCode, amountArs: amount, note: draft.note.trim() };
      await mutation.run(() => editingId ? api.updateMovement(editingId, body) : api.createMovement(body));
      setComposerOpen(false);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };

  const remove = async () => {
    if (!pendingDelete || mutation.pending) return;
    try {
      await mutation.run(() => api.deleteMovement(pendingDelete));
      setPendingDelete(null);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* keep confirmation open */ }
  };

  const openSync = (account: FinanceAccount) => {
    setSyncingAccount(account);
    setSyncBalance(account.type === "CRYPTO" ? String(account.balanceUsd ?? (asNumber(cryptoSummary?.available.usd) + asNumber(cryptoSummary?.invested.usd))) : formatARSInputNumber(account.balanceArs));
    setSyncBalanceError("");
    mutation.clearError();
  };

  const syncAccount = async () => {
    const amount = syncingAccount?.type === "CRYPTO" ? parseUSDInput(syncBalance) : parseARSInput(syncBalance);
    if (!syncingAccount || amount === null || amount < 0 || syncing) {
      setSyncBalanceError("Ingresá un saldo válido igual o mayor a cero.");
      return;
    }
    setSyncBalanceError("");
    setSyncing(true);
    try {
      await mutation.run(() => api.syncFinanceAccount(syncingAccount.code, syncingAccount.type === "CRYPTO" ? { balanceUsd: amount } : { balanceArs: amount }));
      setSyncingAccount(null);
      invalidateApiQueryCache();
      data.reload();
    } catch { /* the mutation error is shown in the form */ }
    finally { setSyncing(false); }
  };

  const resetFilters = () => {
    setFrom(defaultRange.from);
    setTo(defaultRange.to);
    setCalendarMonth(defaultMonth);
    setItemCode("all");
    setPage(0);
  };

   return <div className="view module-view">
     {focusError ? <div className="analysis-notice" role="alert">{focusError}</div> : null}
     {transferOpen ? <FinanceTransferDialog accounts={accounts} draft={transferDraft} onChange={(draft) => { setTransferDraft(draft); setTransferAmountError(""); }} editing={Boolean(transferId)} pending={mutation.pending} error={mutation.error?.message} amountError={transferAmountError} onClose={() => { if (!mutation.pending) setTransferOpen(false); }} onSave={() => void saveTransfer()} /> : null}
     <CryptoInvestmentDialogs
       availableUsd={cryptoSummary ? asNumber(cryptoSummary.available.usd) : null}
       investmentOpen={investmentOpen}
       setInvestmentOpen={setInvestmentOpen}
       investmentDraft={investmentDraft}
       setInvestmentDraft={setInvestmentDraft}
       onSaveInvestment={() => void saveInvestment()}
       saleDraft={saleDraft}
       setSaleDraft={setSaleDraft}
       onSaveSale={() => void saveCryptoSale()}
       legacyPriceTarget={legacyPriceTarget}
       setLegacyPriceTarget={setLegacyPriceTarget}
       legacyUnitPrice={legacyUnitPrice}
       setLegacyUnitPrice={setLegacyUnitPrice}
       onSaveLegacyPrice={() => void saveLegacyPrice()}
       pendingVoid={pendingCryptoVoid}
       setPendingVoid={setPendingCryptoVoid}
       onVoid={() => void voidCryptoOperation()}
       error={mutation.error?.message ?? null}
       pending={mutation.pending}
     />
     <SectionHero section="finances" rightSlot={<div className="rate-card"><span className="eyebrow">DÓLAR BLUE</span><strong>{rate ? formatARS(rate) : "—"}</strong><span>{rate ? `${rateSource}${rateUpdatedAt ? ` · ${rateUpdatedAt}` : ""}` : "Consultando cotización..."} <i>↗</i></span></div>} />
     <div className="finance-navigation">
       <div className="finance-tabs" role="tablist" aria-label="Secciones de Finanzas">
         {financeTabs.map((item, index) => <button key={item.id} id={`finance-tab-${item.id}`} type="button" role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`finance-panel-${item.id}`} className={tab === item.id ? "finance-tab finance-tab-active" : "finance-tab"} onClick={() => onTabChange(item.id)} onKeyDown={(event) => {
           const nextIndex = event.key === "ArrowRight" ? (index + 1) % financeTabs.length : event.key === "ArrowLeft" ? (index + financeTabs.length - 1) % financeTabs.length : event.key === "Home" ? 0 : event.key === "End" ? financeTabs.length - 1 : -1;
           if (nextIndex < 0) return;
           event.preventDefault();
           onTabChange(financeTabs[nextIndex].id);
           document.getElementById(`finance-tab-${financeTabs[nextIndex].id}`)?.focus();
         }}>{item.label}</button>)}
       </div>
     </div>
     <div className="finance-tab-panel" id={`finance-panel-${tab}`} role="tabpanel" aria-labelledby={`finance-tab-${tab}`}>
       <PeriodRangeFilter from={from} to={to} defaultFrom={defaultRange.from} defaultTo={defaultRange.to} onFromChange={(value) => { setFrom(value); if (value) setCalendarMonth(value.slice(0, 7)); setPage(0); }} onToChange={(value) => { setTo(value); setPage(0); }} onReset={resetFilters} idPrefix="finance-filter" />
       {tab === "inicio" ? <>
         <div className="form-actions finance-main-actions"><Button onClick={() => startNew("INCOME")} disabled={data.accountsLoading || Boolean(data.accountsError)}>Registrar ingreso</Button><Button variant="ghost" onClick={() => startNew("EXPENSE")} disabled={data.accountsLoading || Boolean(data.accountsError)}>Registrar gasto</Button><Button variant="ghost" onClick={() => startTransfer()} disabled={data.accountsLoading || Boolean(data.accountsError) || transferAccounts(accounts).length < 2}>Transferir dinero</Button></div>
         {data.accountsError ? <div className="inline-error" role="alert">No se pudieron actualizar los saldos. Volvé a cargar los datos antes de registrar otra operación. <Button variant="quiet" onClick={data.reload}>Reintentar</Button></div> : data.accountsLoading ? <SkeletonGrid count={3} /> : <FinanceAccountsPanel accounts={accounts} rate={rate} onSync={openSync} onTransfer={startTransfer} />}
         {!data.accountsError && !data.accountsLoading ? <section className="metric-grid finance-metrics"><MetricCard label="CAJA DISPONIBLE" value={formatARS(cash)} detail={rate ? formatUSD(cash / rate) : "Conversión pendiente"} icon="◌" /><MetricCard label="INVERTIDO" value={formatARS(invested)} detail={rate ? formatUSD(invested / rate) : "Conversión pendiente"} icon="↗" /><MetricCard label="INGRESOS DEL RANGO" value={summary ? formatARS(income) : "—"} detail="Total del período seleccionado" icon="+" /><MetricCard label="EGRESOS DEL RANGO" value={summary ? formatARS(expense) : "—"} detail="Total del período seleccionado" icon="−" /></section> : null}
         {data.auxiliaryLoading ? <div className="analytics-loading" aria-live="polite">Preparando calendario y distribución...</div> : data.error ? null : <FinanceAnalytics month={calendarMonth} from={from} to={to} analytics={analytics} options={config.financeItems} onMonthChange={(month) => setCalendarMonth(month)} />}
       </> : null}
       {tab === "crypto" ? <CryptoInvestmentPanel summary={cryptoSummary} onInvest={startInvestment} onSell={startSale} onCompletePrice={startLegacyPrice} onVoidPurchase={(investment) => { mutation.clearError(); setPendingCryptoVoid({ kind: "purchase", investmentId: investment.id, label: investment.assetLabel }); }} onVoidSale={(investment, sale) => { mutation.clearError(); setPendingCryptoVoid({ kind: "sale", investmentId: investment.id, saleId: sale.id, label: investment.assetLabel }); }} /> : null}
       {tab === "movimientos" ? <>
         <ModuleToolbar resultLabel={`${movements?.totalElements ?? 0} movimientos`}><FilterPills active={bucket} onChange={(value) => { setBucket(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...bucketOptions.map(({ code, label }) => ({ value: code, label })), { value: "TRANSFER", label: "Transferencias" }]} /><div className="finance-filter-row"><SelectField label="Clasificación filtro" id="finance-filter-item" compact value={itemCode} onChange={(value) => { setItemCode(value); setPage(0); }} options={[{ value: "all", label: "Clasificación" }, ...config.financeItems.filter((item) => item.active !== false).map(({ code, label }) => ({ value: code, label }))]} /><SelectField label="Ordenar" id="finance-sort" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "large", label: "Mayor importe" }]} />{itemCode !== "all" && from === defaultRange.from && to === defaultRange.to ? <Button className="filter-clear" variant="quiet" onClick={resetFilters}>Mes actual</Button> : null}</div></ModuleToolbar>
         {data.loading ? <SkeletonGrid count={4} /> : data.error ? <ErrorState onRetry={data.reload} /> : visible.length ? <div className="content-grid finance-grid">{visible.map((movement) => { const ars = movementARS(movement); const usd = movement.amount?.usd ?? (rate ? asNumber(ars) / rate : 0); const accountLabel = accounts.find((account) => account.code.toLowerCase() === movement.accountCode.toLowerCase())?.label ?? movement.accountCode; const type = movementType(movement); const route = transferRoute(movement); const label = (code: string) => accounts.find((account) => account.code === code)?.label ?? code; const title = type === "TRANSFER" ? `${label(route.sourceAccountCode)} → ${label(route.destinationAccountCode)}` : movement.item?.label ?? itemLabel(movement.itemCode); return <article id={`record-${movement.id}`} className={`content-card finance-card finance-${type.toLowerCase()}`} key={movement.id}><div className="content-card-top"><span className="mono-date">{dateLabel(movement.date, true)}</span><CardActions onEdit={() => startEdit(movement)} onDelete={() => { mutation.clearError(); setPendingDelete(movement.id); }} /></div><button type="button" className="content-card-preview-trigger" onClick={() => setPreviewMovement(movement)} aria-label={`Ver movimiento: ${title}`}><div className="finance-card-heading"><span className="finance-kind">{type === "TRANSFER" ? "Transferencia" : bucketOptions.find((item) => item.code === type)?.label ?? type}</span><span className="finance-item">{accountLabel}</span></div><h2>{title}</h2><strong className="finance-amount">{formatARS(ars)}</strong><span className="finance-usd">{formatUSD(usd)} <small>{type === "TRANSFER" && movement.accountCode === "crypto" ? `P2P · ${formatARS(movement.amount?.exchangeRate ?? 0)} por USD` : "valor convertido"}</small></span>{movement.note ? <p className="multiline-copy">{movement.note}</p> : null}<div className="card-footer"><span className="eyebrow">MOVIMIENTO / {accountLabel.toUpperCase()}</span><span className="card-arrow">↗</span></div></button></article>; })}</div> : <EmptyState title="No hay movimientos acá" description="Probá limpiar los filtros o cargá el próximo movimiento." action="Cargar movimiento" onAction={() => startNew()} />}
         <div className="module-bottom"><span className="bottom-caption">LOS PESOS SON PRINCIPALES. EL DÓLAR, CONTEXTO.</span><Pagination page={Math.min(page + 1, Math.max(1, movements?.totalPages ?? 0))} pages={movements?.totalPages ?? 0} onChange={(next) => setPage(next - 1)} /></div>
       </> : null}
       {data.auxiliaryError && !(tab === "inicio" && data.accountsError) ? <div className="analysis-notice" role="alert">No se pudieron actualizar todos los datos financieros. Los totales no disponibles se muestran sin valor. <Button variant="quiet" onClick={data.reload}>Reintentar</Button></div> : null}
     </div>
       {previewMovement ? (() => { const type = movementType(previewMovement); const route = transferRoute(previewMovement); const accountLabel = accounts.find((account) => account.code.toLowerCase() === previewMovement.accountCode.toLowerCase())?.label ?? previewMovement.accountCode; const label = (code: string) => accounts.find((account) => account.code === code)?.label ?? code; const title = type === "TRANSFER" ? `${label(route.sourceAccountCode)} → ${label(route.destinationAccountCode)}` : previewMovement.item?.label ?? itemLabel(previewMovement.itemCode); const ars = movementARS(previewMovement); const usd = previewMovement.amount?.usd ?? (rate ? asNumber(ars) / rate : 0); return <Dialog ariaLabel={`Vista previa del movimiento: ${title}`} trackChanges={false} onClose={closePreview}><FormPanel mode="preview" eyebrow={`VISTA PREVIA · ${type === "TRANSFER" ? "TRANSFERENCIA" : type === "INCOME" ? "INGRESO" : "EGRESO"}`} title={title} description={`${dateLabel(previewMovement.date, true)} · ${accountLabel}`} onClose={closePreview} onEdit={() => setPreviewEditMovement(previewMovement)}><div className="record-preview-meta"><span><strong>Importe</strong>{formatARS(ars)}</span><span><strong>Equivalente</strong>{formatUSD(usd)}</span>{type === "TRANSFER" ? <span><strong>Recorrido</strong>{label(route.sourceAccountCode)} → {label(route.destinationAccountCode)}</span> : null}</div>{previewMovement.note ? <p className="record-preview-copy multiline-copy">{previewMovement.note}</p> : <p className="record-preview-empty">Este movimiento no tiene una nota adicional.</p>}</FormPanel></Dialog>; })() : null}
       {composerOpen ? <Dialog ariaLabel="Cargar movimiento financiero" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar movimiento" : draft.bucket === "INCOME" ? "Registrar ingreso" : "Registrar gasto"} description={draft.bucket === "INCOME" ? "El ingreso se suma a tu billetera Mercado Pago." : "El gasto se descuenta de tu billetera Mercado Pago."} onClose={() => setComposerOpen(false)} onSubmit={() => void save()}><div className="form-grid form-grid-finance"><label className="form-field" htmlFor="finance-date"><span>Fecha</span><input id="finance-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><p className="finance-fixed-account">Cuenta: <strong>Mercado Pago</strong></p><SelectField label="Tipo" id="finance-bucket" value={draft.bucket} onChange={(value) => setDraft({ ...draft, bucket: value, itemCode: firstFinanceItem(draft.accountCode, value, accounts, config.financeItems) })} options={bucketOptions.map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Clasificación" id="finance-item" value={draft.itemCode} onChange={(value) => setDraft({ ...draft, itemCode: value })} options={financeItemOptions(draft.accountCode, draft.bucket, accounts, config.financeItems).map(({ code, label }) => ({ value: code, label }))} /><label className="form-field" htmlFor="finance-amount"><span>Importe en pesos</span><ARSInput id="finance-amount" value={draft.amount} onFocus={(event) => event.currentTarget.select()} onChange={(amount) => { setDraft({ ...draft, amount }); setAmountError(""); }} aria-invalid={Boolean(amountError)} aria-describedby={amountError ? "finance-amount-error" : undefined} placeholder="0" required />{amountError ? <span id="finance-amount-error" className="form-field-error" role="alert">{amountError}</span> : null}</label><FormField label="Nota" value={draft.note} onChange={(note) => setDraft({ ...draft, note })} placeholder="Opcional" multiline /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "amountArs", "accountCode", "itemCode", "date")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button type="submit" disabled={mutation.pending}>{editingId ? "Guardar cambios" : "Guardar movimiento"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {syncingAccount ? <Dialog ariaLabel={`Corregir saldo de ${syncingAccount.label}`} onClose={() => { if (!syncing) setSyncingAccount(null); }}><FormPanel title={`Corregir saldo de ${syncingAccount.label}`} description="Usá el saldo real de la cuenta para ajustar rendimientos o diferencias. Solo cambia esta cuenta: no transfiere dinero desde Mercado Pago." onClose={() => { if (!syncing) setSyncingAccount(null); }} onSubmit={() => void syncAccount()}><label className="form-field account-sync-field" htmlFor="account-sync-balance"><span>{syncingAccount.type === "CRYPTO" ? "Saldo total en USD (disponible + costo de posiciones)" : "Saldo actual en pesos"}</span>{syncingAccount.type === "CRYPTO" ? <input id="account-sync-balance" inputMode="decimal" value={syncBalance} onChange={(event) => { setSyncBalance(event.target.value); setSyncBalanceError(""); }} required aria-invalid={Boolean(syncBalanceError)} /> : <ARSInput id="account-sync-balance" value={syncBalance} onFocus={(event) => event.currentTarget.select()} onChange={(balance) => { setSyncBalance(balance); setSyncBalanceError(""); }} aria-invalid={Boolean(syncBalanceError)} aria-describedby={syncBalanceError ? "account-sync-balance-error" : undefined} placeholder="0" required />}{syncBalanceError ? <span id="account-sync-balance-error" className="form-field-error" role="alert">{syncBalanceError}</span> : null}</label>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || "Revisá el saldo ingresado."}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setSyncingAccount(null)} disabled={syncing}>Cancelar</Button><Button type="submit" disabled={syncing || !syncBalance}>{syncing ? "Actualizando..." : "Guardar saldo"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title="¿Eliminar este movimiento?" description="Se eliminará el registro y se revertirá su efecto sobre los saldos. Una transferencia devuelve el importe al origen si hay saldo suficiente." onCancel={() => { if (!mutation.pending) setPendingDelete(null); }} onConfirm={() => void remove()} confirmDisabled={mutation.pending} error={mutation.error?.message} /> : null}
  </div>;
}
