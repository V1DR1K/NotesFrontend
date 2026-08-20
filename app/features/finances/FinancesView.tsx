"use client";

import { useState } from "react";
import type { ApiConfig, FinanceBucket, FinanceMovement, FinanceSummary } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useMutationError } from "../../lib/api/hooks";
import { asNumber, dateLabel, fieldError, formatARS, formatUSD, todayIso } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, MetricCard, ModuleToolbar, Pagination, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { useFinanceData } from "./useFinanceData";

const bucketOptions: Array<{ code: FinanceBucket; label: string }> = [{ code: "INCOME", label: "Ingreso" }, { code: "EXPENSE", label: "Egreso" }, { code: "INVESTED", label: "Invertido" }];

function movementARS(movement: FinanceMovement) { return movement.amount?.ars ?? movement.amountArs ?? 0; }
function summaryValue(summary: FinanceSummary | null | undefined, names: string[], fallback: number) { for (const name of names) { const value = summary?.[name as keyof FinanceSummary]; if (value !== undefined) return asNumber(typeof value === "object" && value !== null ? (value as { ars?: unknown }).ars : value); } return fallback; }

export function FinancesView({ config }: { config: ApiConfig }) {
  const [bucket, setBucket] = useState("all");
  const [date, setDate] = useState("");
  const [conceptCode, setConceptCode] = useState("all");
  const [categoryCode, setCategoryCode] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: todayIso(), bucket: "EXPENSE", amount: "", conceptCode: config.financeConcepts[0]?.code ?? "", categoryCode: config.financeCategories[0]?.code ?? "", note: "" });
  const data = useFinanceData(page, bucket, date, conceptCode, categoryCode);
  const mutation = useMutationError();
  const [movements, summary, ratePayload] = data.data ?? [null, null, null];
  const rate = asNumber(ratePayload?.average);
  const fallbackIncome = movements?.content.filter((item) => item.bucket === "INCOME").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackExpense = movements?.content.filter((item) => item.bucket === "EXPENSE").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const fallbackInvested = movements?.content.filter((item) => item.bucket === "INVESTED").reduce((sum, item) => sum + asNumber(movementARS(item)), 0) ?? 0;
  const income = summaryValue(summary, ["income", "totalIncome"], fallbackIncome);
  const expense = summaryValue(summary, ["expense", "totalExpense"], fallbackExpense);
  const invested = summaryValue(summary, ["invested", "totalInvested"], fallbackInvested);
  const cash = summaryValue(summary, ["cash", "availableCash"], income - expense - invested);
  const visible = [...(movements?.content ?? [])].sort((a, b) => sort === "large" ? asNumber(movementARS(b)) - asNumber(movementARS(a)) : b.date.localeCompare(a.date));
  const conceptLabel = (code: string) => config.financeConcepts.find((item) => item.code === code)?.label ?? code;
  const categoryLabel = (code: string) => config.financeCategories.find((item) => item.code === code)?.label ?? code;
  const startNew = () => { setEditingId(null); setDraft({ date: todayIso(), bucket: "EXPENSE", amount: "", conceptCode: config.financeConcepts[0]?.code ?? "", categoryCode: config.financeCategories[0]?.code ?? "", note: "" }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (movement: FinanceMovement) => { setEditingId(movement.id); setDraft({ date: movement.date, bucket: movement.bucket.toUpperCase(), amount: String(movementARS(movement)), conceptCode: movement.conceptCode, categoryCode: movement.categoryCode, note: movement.note ?? "" }); mutation.clearError(); setComposerOpen(true); };
  const save = async () => {
    const amount = Number(draft.amount);
    if (!draft.date || !draft.bucket || !draft.conceptCode || !draft.categoryCode || !Number.isFinite(amount) || amount <= 0) return;
    try { const body = { date: draft.date, bucket: draft.bucket, conceptCode: draft.conceptCode, categoryCode: draft.categoryCode, amountArs: amount, note: draft.note.trim() || undefined }; await mutation.run(() => editingId ? api.updateMovement(editingId, body) : api.createMovement(body)); setComposerOpen(false); data.reload(); } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete) return; try { await mutation.run(() => api.deleteMovement(pendingDelete)); setPendingDelete(null); data.reload(); } catch { /* keep confirmation open */ } };
  const resetFilters = () => { setDate(""); setConceptCode("all"); setCategoryCode("all"); setPage(0); };

  return <div className="view module-view">
    <SectionHero section="finances" onAction={startNew} rightSlot={<div className="rate-card"><span className="eyebrow">DÓLAR DE REFERENCIA</span><strong>{rate ? formatARS(rate) : "—"}</strong><span>1 USD / actualización desde API <i>↗</i></span></div>} />
    <section className="metric-grid finance-metrics"><MetricCard label="CAJA DISPONIBLE" value={formatARS(cash)} detail={rate ? formatUSD(cash / rate) : "Conversión pendiente"} icon="◌" /><MetricCard label="INVERTIDO" value={formatARS(invested)} detail={rate ? formatUSD(invested / rate) : "Conversión pendiente"} icon="↗" /><MetricCard label="INGRESOS DEL MES" value={formatARS(income)} detail={`${movements?.content.filter((item) => item.bucket === "INCOME").length ?? 0} movimientos`} icon="+" /><MetricCard label="EGRESOS DEL MES" value={formatARS(expense)} detail={`${movements?.content.filter((item) => item.bucket === "EXPENSE").length ?? 0} movimientos`} icon="−" /></section>
    {composerOpen ? <Dialog ariaLabel="Cargar movimiento financiero" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar movimiento" : "Cargar movimiento"} description="Guardá el valor en pesos; la conversión a dólares se calcula con el tipo de cambio de referencia." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-finance"><label className="form-field" htmlFor="finance-date"><span>Fecha</span><input id="finance-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><SelectField label="Sección" id="finance-bucket" value={draft.bucket} onChange={(value) => setDraft({ ...draft, bucket: value })} options={bucketOptions.map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Concepto" id="finance-concept" value={draft.conceptCode} onChange={(value) => setDraft({ ...draft, conceptCode: value })} options={config.financeConcepts.map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Categoría" id="finance-category" value={draft.categoryCode} onChange={(value) => setDraft({ ...draft, categoryCode: value })} options={config.financeCategories.map(({ code, label }) => ({ value: code, label }))} /><label className="form-field" htmlFor="finance-amount"><span>Importe en pesos</span><input id="finance-amount" inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0" required /></label><FormField label="Nota" value={draft.note} onChange={(note) => setDraft({ ...draft, note })} placeholder="Opcional" /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "amountArs", "conceptCode", "categoryCode", "date")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={!Number(draft.amount) || !draft.conceptCode || !draft.categoryCode}>{editingId ? "Guardar cambios" : "Guardar movimiento"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    <ModuleToolbar resultLabel={`${movements?.totalElements ?? 0} movimientos`}><FilterPills active={bucket} onChange={(value) => { setBucket(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...bucketOptions.map(({ code, label }) => ({ value: code, label }))]} /><div className="finance-filter-row"><label className="toolbar-date-field" htmlFor="finance-filter-date"><span>Fecha exacta</span><input id="finance-filter-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(0); }} /></label><SelectField label="Concepto filtro" id="finance-filter-concept" compact value={conceptCode} onChange={(value) => { setConceptCode(value); setPage(0); }} options={[{ value: "all", label: "Concepto" }, ...config.financeConcepts.map(({ code, label }) => ({ value: code, label }))]} /><SelectField label="Categoría filtro" id="finance-filter-category" compact value={categoryCode} onChange={(value) => { setCategoryCode(value); setPage(0); }} options={[{ value: "all", label: "Categoría" }, ...config.financeCategories.map(({ code, label }) => ({ value: code, label }))]} /><SelectField label="Ordenar" id="finance-sort" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "large", label: "Mayor importe" }]} />{date || conceptCode !== "all" || categoryCode !== "all" ? <Button className="filter-clear" variant="quiet" onClick={resetFilters}>Limpiar</Button> : null}</div></ModuleToolbar>
    {data.loading ? <SkeletonGrid count={4} /> : data.error ? <ErrorState onRetry={data.reload} /> : visible.length ? <div className="content-grid finance-grid">{visible.map((movement) => { const ars = movementARS(movement); const usd = movement.amount?.usd ?? (rate ? asNumber(ars) / rate : 0); return <article className={`content-card finance-card finance-${movement.bucket.toLowerCase()}`} key={movement.id}><div className="content-card-top"><span className="mono-date">{dateLabel(movement.date, true)}</span><CardActions onEdit={() => startEdit(movement)} onDelete={() => setPendingDelete(movement.id)} /></div><div className="finance-card-heading"><span className="finance-kind">{bucketOptions.find((item) => item.code === movement.bucket.toUpperCase())?.label ?? movement.bucket}</span><span className="finance-category">{categoryLabel(movement.categoryCode)}</span></div><h2>{conceptLabel(movement.conceptCode)}</h2><strong className="finance-amount">{formatARS(ars)}</strong><span className="finance-usd">{formatUSD(usd)} <small>valor convertido</small></span>{movement.note ? <p>{movement.note}</p> : null}<div className="card-footer"><span className="eyebrow">MOVIMIENTO / PESOS</span><span className="card-arrow">↗</span></div></article>; })}</div> : <EmptyState title="No hay movimientos acá" description="Probá limpiar los filtros o cargá el próximo movimiento." action="Cargar movimiento" onAction={startNew} />}
    <div className="module-bottom"><span className="bottom-caption">LOS PESOS SON PRINCIPALES. EL DÓLAR, CONTEXTO.</span><Pagination page={Math.min(page + 1, Math.max(1, movements?.totalPages ?? 0))} pages={movements?.totalPages ?? 0} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar este movimiento?" description="El movimiento se quitará de tu cuaderno y no podrá recuperarse desde acá." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
