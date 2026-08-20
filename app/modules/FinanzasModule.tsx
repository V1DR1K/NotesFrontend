"use client";

import { useMemo, useState } from "react";
import { INITIAL_FINANCES, USD_RATE, type FinanceEntry } from "../config/mock-data";
import { FINANCE_BUCKET_OPTIONS, FINANCE_CATEGORY_OPTIONS, FINANCE_CONCEPT_OPTIONS, type FinanceBucket, type FinanceCategory, type FinanceConcept } from "../config/section-settings/finanzas";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, FilterPills, FormField, FormPanel, MetricCard, ModuleToolbar, Pagination, SectionHero, SelectField } from "../ui/Primitives";

const bucketLabels = Object.fromEntries(FINANCE_BUCKET_OPTIONS.map((option) => [option.value, option.label])) as Record<FinanceBucket, string>;
const conceptLabels = Object.fromEntries(FINANCE_CONCEPT_OPTIONS.map((option) => [option.value, option.label])) as Record<FinanceConcept, string>;
const categoryLabels = Object.fromEntries(FINANCE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])) as Record<FinanceCategory, string>;
const pageSize = 4;

const formatARS = (amount: number) => `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
const formatUSD = (amount: number) => `US$ ${(amount / USD_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanzasModule() {
  const [entries, setEntries] = useState(INITIAL_FINANCES);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: "2026-08-20", bucket: "expense" as FinanceBucket, amount: "", concept: "other" as FinanceConcept, category: "other" as FinanceCategory, note: "" });

  const totals = useMemo(() => {
    const income = entries.filter((entry) => entry.bucket === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const expense = entries.filter((entry) => entry.bucket === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    const invested = entries.filter((entry) => entry.bucket === "invested").reduce((sum, entry) => sum + entry.amount, 0);
    return { income, expense, invested, cash: income - expense - invested };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const result = entries.filter((entry) => (filter === "all" || entry.bucket === filter) && (!dateFilter || entry.date === dateFilter) && (conceptFilter === "all" || entry.concept === conceptFilter) && (categoryFilter === "all" || entry.category === categoryFilter));
    return [...result].sort((a, b) => sort === "large" ? b.amount - a.amount : b.date.localeCompare(a.date));
  }, [entries, filter, dateFilter, conceptFilter, categoryFilter, sort]);
  const pages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);
  const countFor = (value: string) => value === "all" ? entries.length : entries.filter((entry) => entry.bucket === value).length;
  const hasAdvancedFilters = Boolean(dateFilter || conceptFilter !== "all" || categoryFilter !== "all");

  const startNew = () => {
    setEditingId(null);
    setDraft({ date: "2026-08-20", bucket: "expense", amount: "", concept: "other", category: "other", note: "" });
    setComposerOpen(true);
  };

  const startEdit = (entry: FinanceEntry) => {
    setEditingId(entry.id);
    setDraft({ date: entry.date, bucket: entry.bucket, amount: String(entry.amount), concept: entry.concept, category: entry.category, note: entry.note ?? "" });
    setComposerOpen(true);
  };

  const saveEntry = () => {
    const amount = Number(draft.amount);
    if (!amount) return;
    const entry: FinanceEntry = { id: editingId ?? `fin-${Date.now()}`, date: draft.date, dateLabel: draft.date === "2026-08-20" ? "Hoy · ahora" : new Date(`${draft.date}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", ""), bucket: draft.bucket, category: draft.category, concept: draft.concept, amount, note: draft.note };
    setEntries((current) => editingId ? current.map((item) => item.id === editingId ? entry : item) : [entry, ...current]);
    setComposerOpen(false);
  };

  const deleteEntry = () => {
    if (!pendingDelete) return;
    setEntries((current) => current.filter((entry) => entry.id !== pendingDelete));
    setPendingDelete(null);
  };

  const updateFilter = (value: string) => { setFilter(value); setPage(1); };
  const clearAdvancedFilters = () => { setDateFilter(""); setConceptFilter("all"); setCategoryFilter("all"); setPage(1); };

  return (
    <div className="view module-view">
      <SectionHero section="finances" onAction={startNew} rightSlot={<div className="rate-card"><span className="eyebrow">DÓLAR DE REFERENCIA</span><strong>$ {USD_RATE.toLocaleString("es-AR")}</strong><span>1 USD / actualización preparada para API <i>↗</i></span></div>} />

      <section className="metric-grid finance-metrics">
        <MetricCard label="CAJA DISPONIBLE" value={formatARS(totals.cash)} detail={formatUSD(totals.cash)} icon="◌" />
        <MetricCard label="INVERTIDO" value={formatARS(totals.invested)} detail={formatUSD(totals.invested)} icon="↗" />
        <MetricCard label="INGRESOS DEL MES" value={formatARS(totals.income)} detail={`${entries.filter((entry) => entry.bucket === "income").length} movimientos`} icon="+" />
        <MetricCard label="EGRESOS DEL MES" value={formatARS(totals.expense)} detail={`${entries.filter((entry) => entry.bucket === "expense").length} movimientos`} icon="−" />
      </section>

      {composerOpen ? <Dialog ariaLabel="Cargar movimiento financiero" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar movimiento" : "Cargar movimiento"} description="Guardá el valor en pesos; la conversión a dólares se calcula con el tipo de cambio de referencia." onClose={() => setComposerOpen(false)}>
        <div className="form-grid form-grid-finance">
          <label className="form-field"><span>Fecha</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <SelectField label="Sección" value={draft.bucket} onChange={(bucket) => setDraft({ ...draft, bucket: bucket as FinanceBucket })} options={FINANCE_BUCKET_OPTIONS.map(({ value, label }) => ({ value, label }))} />
          <SelectField label="Concepto" value={draft.concept} onChange={(concept) => setDraft({ ...draft, concept: concept as FinanceConcept })} options={FINANCE_CONCEPT_OPTIONS.map(({ value, label }) => ({ value, label }))} />
          <SelectField label="Categoría" value={draft.category} onChange={(category) => setDraft({ ...draft, category: category as FinanceCategory })} options={FINANCE_CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label }))} />
          <label className="form-field"><span>Importe en pesos</span><input inputMode="numeric" type="number" min="0" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0" /></label>
          <FormField label="Nota" value={draft.note} onChange={(note) => setDraft({ ...draft, note })} placeholder="Opcional" />
        </div>
        <div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={saveEntry} disabled={!Number(draft.amount)}>{editingId ? "Guardar cambios" : "Guardar movimiento"} <span aria-hidden="true">↗</span></Button></div>
      </FormPanel></Dialog> : null}

      <ModuleToolbar resultLabel={`${filteredEntries.length} movimientos`}>
        <FilterPills active={filter} onChange={updateFilter} options={[{ value: "all", label: "Todos", count: countFor("all") }, ...FINANCE_BUCKET_OPTIONS.map(({ value, label }) => ({ value, label, count: countFor(value) }))]} />
        <div className="finance-filter-row">
          <label className="toolbar-date-field"><span>Fecha exacta</span><input type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} /></label>
          <SelectField label="Concepto filtro" compact value={conceptFilter} onChange={(value) => { setConceptFilter(value); setPage(1); }} options={[{ value: "all", label: "Concepto" }, ...FINANCE_CONCEPT_OPTIONS.map(({ value, label }) => ({ value, label }))]} />
          <SelectField label="Categoría filtro" compact value={categoryFilter} onChange={(value) => { setCategoryFilter(value); setPage(1); }} options={[{ value: "all", label: "Categoría" }, ...FINANCE_CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label }))]} />
          <SelectField label="Ordenar" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "large", label: "Mayor importe" }]} />
          {hasAdvancedFilters ? <Button className="filter-clear" variant="quiet" onClick={clearAdvancedFilters}>Limpiar</Button> : null}
        </div>
      </ModuleToolbar>

      {visibleEntries.length ? <div className="content-grid finance-grid">{visibleEntries.map((entry) => <article className={`content-card finance-card finance-${entry.bucket}`} key={entry.id}>
        <div className="content-card-top"><span className="mono-date">{entry.dateLabel}</span><CardActions onEdit={() => startEdit(entry)} onDelete={() => setPendingDelete(entry.id)} /></div>
        <div className="finance-card-heading"><span className="finance-kind">{bucketLabels[entry.bucket]}</span><span className="finance-category">{categoryLabels[entry.category]}</span></div>
        <h2>{conceptLabels[entry.concept]}</h2><strong className="finance-amount">{formatARS(entry.amount)}</strong><span className="finance-usd">{formatUSD(entry.amount)} <small>valor convertido</small></span>
        {entry.note ? <p>{entry.note}</p> : null}
        <div className="card-footer"><span className="eyebrow">MOVIMIENTO / PESOS</span><span className="card-arrow">↗</span></div>
      </article>)}</div> : <EmptyState title="No hay movimientos acá" description="Probá limpiar los filtros o cargá el próximo movimiento." action="Cargar movimiento" onAction={startNew} />}
      <div className="module-bottom"><span className="bottom-caption">LOS PESOS SON PRINCIPALES. EL DÓLAR, CONTEXTO.</span><Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} /></div>
      {pendingDelete ? <ConfirmDialog title="¿Eliminar este movimiento?" description="Se quitará de esta vista local. Después, el backend podrá sumar auditoría y recuperación." onCancel={() => setPendingDelete(null)} onConfirm={deleteEntry} /> : null}
    </div>
  );
}
