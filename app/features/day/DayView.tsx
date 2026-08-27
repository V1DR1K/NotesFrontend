"use client";

import { useState } from "react";
import type { ApiConfig } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { currentMonth, dateLabel, fieldError, monthBounds, todayIso } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, MultiSelectChips, Pagination, SectionHero, SelectField, SkeletonGrid, StatusDot } from "../../ui/Primitives";
import { DayCalendar } from "./DayCalendar";
import { useDayCalendarData } from "./useDayCalendarData";
import { useDayData } from "./useDayData";

function parseFeelings(value: string) {
  const tokens = value.split("|").map((item) => item.trim()).filter(Boolean);
  return tokens.length ? tokens : value.trim() ? [value.trim()] : [];
}

function statusTone(code: string): "green" | "yellow" | "red" {
  if (code.toLowerCase() === "green") return "green";
  if (code.toLowerCase() === "yellow") return "yellow";
  return "red";
}

export function DayView({ config }: { config: ApiConfig }) {
  const [filter, setFilter] = useState("all");
  const [feelings, setFeelings] = useState<string[]>([]);
  const defaultMonth = currentMonth();
  const defaultRange = monthBounds(defaultMonth);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState("all");
  const [draftFeelings, setDraftFeelings] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonth());
  const [draft, setDraft] = useState({ date: todayIso(), description: "" });
  const data = useDayData(page, filter, feelings, from, to);
  const calendarData = useDayCalendarData(calendarMonth);
  const mutation = useMutationError();
  const statusOptions = config.dayStatuses.filter((option) => option.active !== false);
  const feelingOptions = config.dayFeelings.filter((option) => option.active !== false);
  const statusLabel = (code: string) => statusOptions.find((item) => item.code === code)?.label ?? code;
  const statusEmoji = (code: string) => statusOptions.find((item) => item.code === code)?.emoji ?? "◌";

  const startNew = () => { setEditingId(null); setDraft({ date: todayIso(), description: "" }); setAnalysisNotice(""); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (entry: NonNullable<typeof data.data>["content"][number]) => { setEditingId(entry.id); setDraft({ date: entry.date, description: entry.description }); setAnalysisNotice(""); mutation.clearError(); setComposerOpen(true); };
  const openFilters = () => { setDraftFilter(filter); setDraftFeelings(feelings); setFiltersOpen(true); };
  const applyFilters = () => { setFilter(draftFilter); setFeelings(draftFeelings); setPage(0); setFiltersOpen(false); };
  const clearDraftFilters = () => { setDraftFilter("all"); setDraftFeelings([]); };

  const runAnalysis = async (id: string) => {
    if (analyzingIds.includes(id)) return;
    setAnalyzingIds((current) => [...current, id]);
    setAnalysisNotice("");
    try {
      const result = await api.analyzeDay(id);
      setAnalysisNotice(result.analysisStatus === "COMPLETED" ? "El análisis se completó." : "La descripción sigue pendiente de análisis. Podés volver a intentarlo.");
      invalidateApiQueryCache(); data.reload();
    } catch {
      setAnalysisNotice("No se pudo completar el análisis. El registro sigue guardado; intentá nuevamente.");
    } finally {
      setAnalyzingIds((current) => current.filter((item) => item !== id));
    }
  };

  const save = async () => {
    if (!draft.date || !draft.description.trim() || saving) return;
    setSaving(true);
    try {
      const body = { date: draft.date, description: draft.description.trim() };
      const entry = await mutation.run(() => editingId ? api.updateDay(editingId, body) : api.createDay(body));
      setAnalysisNotice("");
      try {
        const result = await api.analyzeDay(entry.id);
        setAnalysisNotice(result.analysisStatus === "COMPLETED" ? "El día fue analizado." : "El registro quedó guardado y pendiente de análisis.");
      } catch {
        setAnalysisNotice("El registro quedó guardado, pero el análisis no pudo completarse. Podés reintentarlo desde la tarjeta.");
      }
      setComposerOpen(false);
       invalidateApiQueryCache(); data.reload();
    } catch { /* the mutation error is shown in the form */ }
    finally { setSaving(false); }
  };

  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteDay(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const pageCount = data.data?.totalPages ?? 0;
  const activeFilterCount = (filter === "all" ? 0 : 1) + feelings.length;
  const exactDate = from === to ? from : "";

  return <div className="view module-view">
     <SectionHero section="day" onAction={startNew} rightSlot={<div className="streak-card"><span className="eyebrow">RACHA ACTUAL</span><strong>—</strong><span>calculada con tus registros</span><div className="streak-dots"><i /><i /><i /><i className="streak-empty" /><i className="streak-empty" /><i className="streak-empty" /><i className="streak-empty" /></div></div>} />
     {calendarData.error ? <div className="analysis-notice" role="status">No se pudo cargar el calendario. El listado sigue disponible.</div> : <DayCalendar month={calendarMonth} entries={calendarData.data?.content ?? []} selectedDate={exactDate} onMonthChange={setCalendarMonth} onSelectDate={(selected) => { setFrom(selected); setTo(selected); setPage(0); }} />}
    {composerOpen ? <Dialog ariaLabel="Registrar un día" onClose={() => setComposerOpen(false)}><FormPanel eyebrow={editingId ? "EDITAR REGISTRO" : "NUEVO REGISTRO"} onSubmit={() => void save()} title={editingId ? "Editar el registro" : "Registrar el día"} description="Escribí lo que pasó. La IA va a identificar el balance y las sensaciones presentes." onClose={() => setComposerOpen(false)}>
      <div className="form-grid form-grid-day">
        <label className="form-field" htmlFor="day-date"><span>Fecha</span><input id="day-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label>
        <div className="form-field-full"><FormField label="Descripción del día" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder="¿Qué pasó hoy y qué estuvo presente?" multiline /><span className="analysis-helper">La descripción se guarda aunque el análisis necesite un reintento.</span></div>
      </div>
      {mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "description", "date")}</div> : null}
      <div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.date || !draft.description.trim() || saving}>{saving ? "Guardando y analizando..." : editingId ? "Guardar cambios" : "Guardar día"} <span aria-hidden="true">↗</span></Button></div>
    </FormPanel></Dialog> : null}
    {filtersOpen ? <Dialog ariaLabel="Filtrar registros de Mi día" trackChanges={false} onClose={() => setFiltersOpen(false)}><section className="day-filters-dialog">
      <div className="day-filters-heading"><div><span className="eyebrow">ORDENAR LA MEMORIA</span><h2>Filtros de Mi día</h2><p>Elegí cómo querés recorrer tus registros. Los cambios se aplican al confirmar.</p></div><span className="day-filters-mark" aria-hidden="true">⌁</span></div>
      <section className="day-filter-section day-filter-statuses" aria-labelledby="day-filter-status-title"><div className="day-filter-section-heading"><div><span className="eyebrow">01 / SEMÁFORO</span><h3 id="day-filter-status-title">Cómo estuvo el día</h3></div><span>{draftFilter === "all" ? "Todos" : "1 elegido"}</span></div><FilterPills active={draftFilter} onChange={setDraftFilter} options={[{ value: "all", label: "Todos" }, ...statusOptions.map((option) => ({ value: option.code, label: option.label }))]} /></section>
      <section className="day-filter-section day-filter-feelings" aria-labelledby="day-filter-feelings-title"><div className="day-filter-section-heading"><div><span className="eyebrow">02 / SENSACIONES</span><h3 id="day-filter-feelings-title">Qué estuvo presente</h3></div><span>{draftFeelings.length ? `${draftFeelings.length} elegidas` : "Todas"}</span></div><div className="day-filter-chips"><MultiSelectChips selected={draftFeelings} options={feelingOptions.map(({ code, label }) => ({ value: code, label }))} onChange={setDraftFeelings} ariaLabel="Sensaciones para filtrar" /></div></section>
      <div className="day-filter-actions"><Button variant="quiet" onClick={clearDraftFilters}>Limpiar filtros</Button><Button onClick={applyFilters}>Aplicar filtros <span aria-hidden="true">↗</span></Button></div>
    </section></Dialog> : null}
     <ModuleToolbar resultLabel={`${data.data?.totalElements ?? 0} registros`}>
       <label className="toolbar-date-field" htmlFor="day-filter-from"><span>Desde</span><input id="day-filter-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} /></label>
       <label className="toolbar-date-field" htmlFor="day-filter-to"><span>Hasta</span><input id="day-filter-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} /></label>
       {from !== defaultRange.from || to !== defaultRange.to ? <Button className="filter-clear" variant="quiet" onClick={() => { setFrom(defaultRange.from); setTo(defaultRange.to); setPage(0); }}>Mes actual</Button> : <span className="history-state">MES ACTUAL</span>}
      <Button className="day-filter-trigger" variant="quiet" onClick={openFilters} ariaHasPopup="dialog" ariaExpanded={filtersOpen}><span>Filtros</span>{activeFilterCount ? <span className="day-filter-count">{activeFilterCount}</span> : null}<span className="day-filter-chevron" aria-hidden="true">⌄</span></Button>
      <SelectField label="Ordenar" compact value="recent" onChange={() => undefined} options={[{ value: "recent", label: "Más recientes" }]} />
    </ModuleToolbar>
    {analysisNotice ? <div className="analysis-notice" role="status" aria-live="polite">{analysisNotice}</div> : null}
    {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : data.data?.content.length ? <div className="content-grid day-grid">{data.data.content.map((entry) => {
      const pending = entry.analysisStatus !== "COMPLETED";
      const analyzing = analyzingIds.includes(entry.id);
      return <article className={`content-card day-card ${pending ? "day-card-pending" : ""}`} key={entry.id}>
        <div className="content-card-top"><span className="mono-date">{dateLabel(entry.date, true)}</span><CardActions onEdit={() => startEdit(entry)} onDelete={() => setPendingDelete(entry.id)} /></div>
        {pending ? <div className="day-analysis-pending"><span className="day-analysis-mark" aria-hidden="true">◌</span><div><strong>Análisis pendiente</strong><span>La descripción está guardada, pero todavía no tiene color ni sensaciones.</span></div></div> : <><div className="day-card-heading"><StatusDot status={statusTone(entry.statusCode)} /><span className="status-copy">{entry.status?.label ?? statusLabel(entry.statusCode)}</span><span className="day-mood">{entry.status?.emoji ?? statusEmoji(entry.statusCode)}</span></div><div className="day-feeling-tags" aria-label="Sensaciones del día">{parseFeelings(entry.feeling).map((feeling) => <span className="day-feeling-tag" key={feeling}>{feelingOptions.find((option) => option.code === feeling)?.label ?? feeling}</span>)}</div></>}
        <p>{entry.description}</p><div className="card-footer">{pending ? <button type="button" className="card-link-button" onClick={() => void runAnalysis(entry.id)} disabled={analyzing}>{analyzing ? "ANALIZANDO..." : "ANALIZAR DE NUEVO"}</button> : <span className="eyebrow">REGISTRO ANALIZADO</span>}<span className="card-arrow" aria-hidden="true">↗</span></div>
      </article>;
    })}</div> : <EmptyState title="Todavía no hay registros con esos filtros" description="Probá otro filtro o dejá un nuevo registro para empezar a construir memoria." action="Anotar el día" onAction={startNew} />}
    <div className="module-bottom"><span className="bottom-caption">CADA REGISTRO ES UNA FOTO, NO UN JUICIO.</span><Pagination page={Math.min(page + 1, Math.max(1, pageCount))} pages={pageCount} onChange={(next) => setPage(next - 1)} /></div>
    {pendingDelete ? <ConfirmDialog title="¿Eliminar este registro?" description="El registro se eliminará de tu cuaderno y no se puede deshacer." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
