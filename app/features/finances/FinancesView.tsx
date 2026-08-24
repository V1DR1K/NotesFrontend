"use client";

import { useState } from "react";
import type { ApiConfig, FinanceBucket, FinanceMovement, FinanceSummary } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useMutationError } from "../../lib/api/hooks";
import { asNumber, currentMonth, dateLabel, fieldError, formatARS, formatUSD, monthBounds, todayIso } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, MetricCard, ModuleToolbar, Pagination, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { FinanceAnalytics } from "./FinanceAnalytics";
import { useFinanceData } from "./useFinanceData";

const bucketOptions: Array<{ code: FinanceBucket; label: string }> = [{ code: "INCOME", label: "Ingreso" }, { code: "EXPENSE", label: "Egreso" }, { code: "INVESTED", label: "Invertido" }];

function movementARS(movement: FinanceMovement) { return movement.amount?.ars ?? movement.amountArs ?? 0; }
function summaryValue(summary: FinanceSummary | null | undefined, names: string[], fallback: number) { for (const name of names) { const value = summary?.[name as keyof FinanceSummary]; if (value !== undefined) return asNumber(typeof value === "object" && value !== null ? (value as { ars?: unknown }).ars : value); } return fallback; }

export function FinancesView({ config }: { config: ApiConfig }) {
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
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: todayIso(), bucket: "EXPENSE", amount: "", itemCode: config.financeItems[0]?.code ?? "", note: "" });
  const data = useFinanceData(page, bucket, from, to, itemCode);
  const mutation = useMutationError();
  const [movements, summary, analytics, ratePayload] = data.data ?? [null, null, null, null];
  const rate = asNumber(ratePayload?.average);
  const rateSource = ratePayload?.source === "provider" ? "DolarApi Blue" : "Fallback configurado";
  const rateUpdatedAt = ratePayload?.fetchedAt ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ratePayload.fetchedAt)) : null;
  const fallbackIncome = movements?.content.filter((item) => item.bucket === "INCOME").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackExpense = movements?.content.filter((item) => item.bucket === "EXPENSE").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackInvested = movements?.content.filter((item) => item.bucket === "INVESTED").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const income = summaryValue(summary, ["income", "totalIncome"], fallbackIncome);
  const expense = summaryValue(summary, ["expense", "totalExpense"], fallbackExpense);
  const invested = summaryValue(summary, ["invested", "totalInvested"], fallbackInvested);
  const cash = summaryValue(summary, ["cash", "availableCash"], income - expense - invested);
  const visible = [...(movements?.content ?? [])].sort((a, b) => sort === "large" ? asNumber(movementARS(b)) - asNumber(movementARS(a)) : b.date.localeCompare(a.date));
  const itemLabel = (code: string) => config.financeItems.find((item) => item.code === code)?.label ?? code;
  const startNew = () => { setEditingId(null); setDraft({ date: todayIso(), bucket: "EXPENSE", amount: "", itemCode: config.financeItems[0]?.code ?? "", note: "" }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (movement: FinanceMovement) => { setEditingId(movement.id); setDraft({ date: movement.date, bucket: movement.bucket.toUpperCase(), amount: String(movementARS(movement)), itemCode: movement.itemCode, note: movement.note ?? "" }); mutation.clearError(); setComposerOpen(true); };
  const save = async () => {
    const amount = Number(draft.amount);
    if (!draft.date || !draft.bucket || !draft.itemCode || !Number.isFinite(amount) || amount <= 0) return;
    try { const body = { date: draft.date, bucket: draft.bucket, itemCode: draft.itemCode, amountArs: amount, note: draft.note.trim() || undefined }; await mutation.run(() => editingId ? api.updateMovement(editingId, body) : api.createMovement(body)); setComposerOpen(false); data.reload(); } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete) return; try { await mutation.run(() => api.deleteMovement(pendingDelete)); setPendingDelete(null); data.reload(); } catch { /* keep confirmation open */ } };
  const resetFilters = () => { setFrom(defaultRange.from); setTo(defaultRange.to); setCalendarMonth(defaultMonth); setItemCode("all"); setPage(0); };

  return <div className="view module-view">
    <SectionHero section="finances" onAction={startNew} rightSlot={<div className="rate-card"><span className="eyebrow">DÓLAR BLUE</span><strong>{rate ? formatARS(rate) : "—"}</strong><span>{rate ? `${rateSource}${rateUpdatedAt ? ` · ${rateUpdatedAt}` : ""}` : "Consultando cotización..."} <i>↗</i></span></div>} />
     <section className="metric-grid finance-metrics"><MetricCard label="CAJA DISPONIBLE" value={formatARS(cash)} detail={rate ? formatUSD(cash / rate) : "Conversión pendiente"} icon="◌" /><MetricCard label="INVERTIDO" value={formatARS(invested)} detail={rate ? formatUSD(invested / rate) : "Conversión pendiente"} icon="↗" /><MetricCard label="INGRESOS DEL RANGO" value={formatARS(income)} detail="Total del período seleccionado" icon="+" /><MetricCard label="EGRESOS DEL RANGO" value={formatARS(expense)} detail="Total del período seleccionado" icon="−" /></section>
     {data.loading ? <div className="analytics-loading" aria-live="polite">Preparando calendario y distribución...</div> : data.error ? null : <FinanceAnalytics month={calendarMonth} from={from} to={to} analytics={analytics} options={config.financeItems} onMonthChange={(month) => setCalendarMonth(month)} />}
    {composerOpen ? <Dialog ariaLabel="Cargar movimiento financiero" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar movimiento" : "Cargar movimiento"} description="Guardá el valor en pesos; la conversión a dólares se calcula con el tipo de cambio de referencia." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-finance"><label className="form-field" htmlFor="finance-date"><span>Fecha</span><input id="finance-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><SelectField label="Sección" id="finance-bucket" value={draft.bucket} onChange={(value) => setDraft({ ...draft, bucket: value })} options={bucketOptions.map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Clasificación" id="finance-item" value={draft.itemCode} onChange={(value) => setDraft({ ...draft, itemCode: value })} options={config.financeItems.map(({ code, label }) => ({ value: code, label }))} /><label className="form-field" htmlFor="finance-amount"><span>Importe en pesos</span><input id="finance-amount" inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.amount} onFocus={(event) => event.currentTarget.select()} onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0" required /></label><FormField label="Nota" value={draft.note} onChange={(note) => setDraft({ ...draft, note })} placeholder="Opcional" /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "amountArs", "itemCode", "date")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.date || !draft.bucket || !draft.itemCode || !draft.amount}>{editingId ? "Guardar cambios" : "Guardar movimiento"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
     <ModuleToolbar resultLabel={`${movements?.totalElements ?? 0} movimientos`}><FilterPills active={bucket} onChange={(value) => { setBucket(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...bucketOptions.map(({ code, label }) => ({ value: code, label }))]} /><div className="finance-filter-row"><label className="toolbar-date-field" htmlFor="finance-filter-from"><span>Desde</span><input id="finance-filter-from" type="date" value={from} onChange={(event) => { const value = event.target.value; setFrom(value); setCalendarMonth(value.slice(0, 7)); setPage(0); }} /></label><label className="toolbar-date-field" htmlFor="finance-filter-to"><span>Hasta</span><input id="finance-filter-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} /></label><SelectField label="Clasificación filtro" id="finance-filter-item" compact value={itemCode} onChange={(value) => { setItemCode(value); setPage(0); }} options={[{ value: "all", label: "Clasificación" }, ...config.financeItems.map(({ code, label }) => ({ value: code, label }))]} /><SelectField label="Ordenar" id="finance-sort" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "large", label: "Mayor importe" }]} />{from !== defaultRange.from || to !== defaultRange.to || itemCode !== "all" ? <Button className="filter-clear" variant="quiet" onClick={resetFilters}>Mes actual</Button> : null}</div></ModuleToolbar>
    {data.loading ? <SkeletonGrid count={4} /> : data.error ? <ErrorState onRetry={data.reload} /> : visible.length ? <div className="content-grid finance-grid">{visible.map((movement) => { const ars = movementARS(movement); const usd = movement.amount?.usd ?? (rate ? asNumber(ars) / rate : 0); return <article className={`content-card finance-card finance-${movement.bucket.toLowerCase()}`} key={movement.id}><div className="content-card-top"><span className="mono-date">{dateLabel(movement.date, true)}</span><CardActions onEdit={() => startEdit(movement)} onDelete={() => setPendingDelete(movement.id)} /></div><div className="finance-card-heading"><span className="finance-kind">{bucketOptions.find((item) => item.code === movement.bucket.toUpperCase())?.label ?? movement.bucket}</span><span className="finance-item">{movement.item?.label ?? itemLabel(movement.itemCode)}</span></div><h2>{movement.item?.label ?? itemLabel(movement.itemCode)}</h2><strong className="finance-amount">{formatARS(ars)}</strong><span className="finance-usd">{formatUSD(usd)} <small>valor convertido</small></span>{movement.note ? <p>{movement.note}</p> : null}<div className="card-footer"><span className="eyebrow">MOVIMIENTO / PESOS</span><span className="card-arrow">↗</span></div></article>; })}</div> : <EmptyState title="No hay movimientos acá" description="Probá limpiar los filtros o cargá el próximo movimiento." action="Cargar movimiento" onAction={startNew} />}
    <div className="module-bottom"><span className="bottom-caption">LOS PESOS SON PRINCIPALES. EL DÓLAR, CONTEXTO.</span><Pagination page={Math.min(page + 1, Math.max(1, movements?.totalPages ?? 0))} pages={movements?.totalPages ?? 0} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar este movimiento?" description="El movimiento se quitará de tu cuaderno y no podrá recuperarse desde acá." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
