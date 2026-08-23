"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiConfig } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useMutationError } from "../../lib/api/hooks";
import { dateLabel, todayIso, fieldError } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, MultiSelectChips, Pagination, SectionHero, SelectField, SkeletonGrid, StatusDot } from "../../ui/Primitives";
import { useDayData } from "./useDayData";

function parseFeelings(value: string) {
  const tokens = value.split("|").map((item) => item.trim()).filter(Boolean);
  return tokens.length ? tokens : value.trim() ? [value.trim()] : [];
}

function serializeFeelings(values: string[], options: Array<{ code: string }>) {
  if (values.length === 1 && !options.some((option) => option.code === values[0])) return values[0];
  return `|${values.join("|")}|`;
}

function feelingLabel(value: string, options: Array<{ code: string; label: string }>) {
  return parseFeelings(value).map((code) => options.find((option) => option.code === code)?.label ?? code).join(" · ");
}

function statusTone(option: { code: string; emoji?: string }, fallbackIndex: number): "green" | "yellow" | "red" {
  if (option.emoji?.includes("🟢")) return "green";
  if (option.emoji?.includes("🟡")) return "yellow";
  if (option.emoji?.includes("🔴")) return "red";
  if (option.code.toLowerCase().startsWith("green")) return "green";
  if (option.code.toLowerCase().startsWith("yellow")) return "yellow";
  return fallbackIndex === 0 ? "green" : fallbackIndex === 1 ? "yellow" : "red";
}

export function DayView({ config }: { config: ApiConfig }) {
  const [filter, setFilter] = useState("all");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [date, setDate] = useState(todayIso());
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [draft, setDraft] = useState({ date: todayIso(), statusCode: config.dayStatuses[0]?.code ?? "", feelings: [] as string[], description: "" });
  const lastSuggestedDescription = useRef("");
  const suggestionRequest = useRef(0);
  const data = useDayData(page, filter, feelings, date);
  const mutation = useMutationError();
  const statusLabel = (code: string) => config.dayStatuses.find((item) => item.code === code)?.label ?? code;
  const statusEmoji = (code: string) => config.dayStatuses.find((item) => item.code === code)?.emoji ?? "◌";
  const draftFeelingOptions = [...config.dayFeelings.map(({ code, label }) => ({ value: code, label })), ...draft.feelings.filter((value) => !config.dayFeelings.some((option) => option.code === value)).map((value) => ({ value, label: value }))];

  const startNew = () => { lastSuggestedDescription.current = ""; setEditingId(null); setDraft({ date: todayIso(), statusCode: config.dayStatuses[0]?.code ?? "", feelings: [], description: "" }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (entry: NonNullable<typeof data.data>["content"][number]) => { lastSuggestedDescription.current = entry.description.trim(); setEditingId(entry.id); setDraft({ date: entry.date, statusCode: entry.statusCode, feelings: parseFeelings(entry.feeling), description: entry.description }); mutation.clearError(); setComposerOpen(true); };
  useEffect(() => {
    const description = draft.description.trim();
    if (!composerOpen || description.length < 12 || description === lastSuggestedDescription.current) return;
    const requestId = ++suggestionRequest.current;
    const timer = window.setTimeout(async () => {
      lastSuggestedDescription.current = description;
      setSuggesting(true);
      try {
        const suggestion = await api.suggestDay(description);
        if (requestId !== suggestionRequest.current || !suggestion.enabled) return;
        setDraft((current) => ({ ...current, statusCode: suggestion.statusCode || current.statusCode, feelings: suggestion.feelingCodes.length ? suggestion.feelingCodes : current.feelings }));
      } catch { /* AI suggestions are optional; manual selection remains available. */ }
      finally { if (requestId === suggestionRequest.current) setSuggesting(false); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [composerOpen, draft.description]);
  const save = async () => {
    if (!draft.date || !draft.statusCode || !draft.feelings.length || !draft.description.trim()) return;
    try {
      const body = { date: draft.date, statusCode: draft.statusCode, feeling: serializeFeelings(draft.feelings, config.dayFeelings), description: draft.description.trim() };
      await mutation.run(() => editingId ? api.updateDay(editingId, body) : api.createDay(body));
      setComposerOpen(false); data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete) return; try { await mutation.run(() => api.deleteDay(pendingDelete)); setPendingDelete(null); data.reload(); } catch { /* keep confirmation open */ } };
  const pageCount = data.data?.totalPages ?? 0;

  return <div className="view module-view">
    <SectionHero section="day" onAction={startNew} rightSlot={<div className="streak-card"><span className="eyebrow">RACHA ACTUAL</span><strong>—</strong><span>calculada con tus registros</span><div className="streak-dots"><i /><i /><i /><i className="streak-empty" /><i className="streak-empty" /><i className="streak-empty" /><i className="streak-empty" /></div></div>} />
    {composerOpen ? <Dialog ariaLabel="Registrar cómo estuvo el día" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar el registro" : "Guardar cómo estuvo"} description="No hace falta escribir mucho. Que sea honesto alcanza." onClose={() => setComposerOpen(false)}>
      <div className="form-grid form-grid-day">
        <label className="form-field" htmlFor="day-date"><span>Fecha</span><input id="day-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label>
        <div className="form-field"><span>Semáforo del día</span><div className="status-picker">{config.dayStatuses.map((option, index) => <button type="button" aria-pressed={draft.statusCode === option.code} className={draft.statusCode === option.code ? "status-choice active" : "status-choice"} onClick={() => setDraft({ ...draft, statusCode: option.code })} key={option.code}><StatusDot status={statusTone(option, index)} />{option.label}</button>)}</div></div>
        <div className="form-field"><span>¿Cómo te sentiste?</span><MultiSelectChips selected={draft.feelings} options={draftFeelingOptions} onChange={(next) => setDraft({ ...draft, feelings: next })} ariaLabel="Sensaciones del día" /></div>
        <div className="form-field-full"><FormField label="Descripción" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder="¿Qué pasó hoy?" multiline />{suggesting ? <span className="ai-suggestion-status" aria-live="polite">IA leyendo tu día...</span> : null}</div>
      </div>
      {mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "feeling", "description", "statusCode")}</div> : null}
      <div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.date || !draft.statusCode || !draft.feelings.length || !draft.description.trim() || mutation.error?.status === -1}>{editingId ? "Guardar cambios" : "Guardar registro"} <span aria-hidden="true">↗</span></Button></div>
    </FormPanel></Dialog> : null}
     <ModuleToolbar resultLabel={`${data.data?.totalElements ?? 0} registros`}>
       <label className="toolbar-date-field" htmlFor="day-filter-date"><span>Fecha exacta</span><input id="day-filter-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(0); }} /></label>
       {date ? <Button className="filter-clear" variant="quiet" onClick={() => { setDate(""); setPage(0); }}>Ver historial</Button> : null}
       <FilterPills active={filter} onChange={(value) => { setFilter(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...config.dayStatuses.map((option) => ({ value: option.code, label: option.label }))]} />
       <MultiSelectChips selected={feelings} options={config.dayFeelings.map(({ code, label }) => ({ value: code, label }))} onChange={(next) => { setFeelings(next); setPage(0); }} ariaLabel="Filtrar por sensación" />
       <SelectField label="Ordenar" compact value="recent" onChange={() => undefined} options={[{ value: "recent", label: "Más recientes" }]} />
     </ModuleToolbar>
     {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : data.data?.content.length ? <div className="content-grid day-grid">{data.data.content.map((entry) => <article className="content-card day-card" key={entry.id}>
       <div className="content-card-top"><span className="mono-date">{dateLabel(entry.date, true)}</span><CardActions onEdit={() => startEdit(entry)} onDelete={() => setPendingDelete(entry.id)} /></div>
        <div className="day-card-heading"><StatusDot status={statusTone(entry.status ?? { code: entry.statusCode, emoji: "" }, config.dayStatuses.findIndex((option) => option.code === entry.statusCode))} /><span className="status-copy">{entry.status?.label ?? statusLabel(entry.statusCode)}</span><span className="day-mood">{entry.status?.emoji ?? statusEmoji(entry.statusCode)}</span></div>
        <h2>{feelingLabel(entry.feeling, config.dayFeelings)}</h2><p>{entry.description}</p><div className="card-footer"><span className="eyebrow">REGISTRO DIARIO</span><span className="card-arrow">↗</span></div>
     </article>)}</div> : <EmptyState title="Todavía no hay registros con esos filtros" description="Probá otro filtro o dejá un nuevo registro para empezar a construir memoria." action="Anotar el día" onAction={startNew} />}
    <div className="module-bottom"><span className="bottom-caption">CADA REGISTRO ES UNA FOTO, NO UN JUICIO.</span><Pagination page={Math.min(page + 1, Math.max(1, pageCount))} pages={pageCount} onChange={(next) => setPage(next - 1)} /></div>
    {pendingDelete ? <ConfirmDialog title="¿Eliminar este registro?" description="El registro se eliminará de tu cuaderno y no se puede deshacer." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
