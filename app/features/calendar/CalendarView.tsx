"use client";

import { useState } from "react";
import type { ApiConfig, CalendarEvent } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { currentMonth, dateLabel, fieldError, monthBounds, todayIso, weekdayLabel } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FormField, FormPanel, ModuleToolbar, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { EventsCalendar } from "./EventsCalendar";
import { useEventsData } from "./useEventsData";

export function CalendarView({ config }: { config: ApiConfig; focusId?: string | null }) {
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [categoryCode, setCategoryCode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: todayIso(), description: "", categoryCode: config.eventCategories.find((item) => item.active !== false)?.code ?? "" });
  const data = useEventsData(month, categoryCode, from, to);
  const mutation = useMutationError();
  const activeCategories = config.eventCategories.filter((item) => item.active !== false);
  const events = data.data?.content ?? [];
  const startNew = (date = selectedDate) => { setEditing(null); setDraft({ date, description: "", categoryCode: activeCategories[0]?.code ?? "" }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (event: CalendarEvent) => { setEditing(event); setDraft({ date: event.date, description: event.description, categoryCode: event.category.code }); mutation.clearError(); setComposerOpen(true); };
  const save = async () => {
    if (!draft.date || !draft.description.trim() || !draft.categoryCode || mutation.pending) return;
    try {
      const body = { date: draft.date, description: draft.description.trim(), categoryCode: draft.categoryCode };
      await mutation.run(() => editing ? api.updateEvent(editing.id, body) : api.createEvent(body));
      setSelectedDate(draft.date); setMonth(draft.date.slice(0, 7)); setComposerOpen(false); invalidateApiQueryCache(); data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteEvent(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const clearFilters = () => { setCategoryCode("all"); setFrom(""); setTo(""); };
  const categoryLabel = (code: string) => config.eventCategories.find((item) => item.code === code)?.label ?? code;
  const range = monthBounds(month);
  const visibleSelectedDate = selectedDate.startsWith(month) ? selectedDate : range.from;
  const visibleSelectedEvents = events.filter((event) => event.date === visibleSelectedDate);

  return <div className="view module-view">
    <SectionHero section="calendar" onAction={() => startNew(visibleSelectedDate)} rightSlot={<div className="calendar-note-card"><span className="eyebrow">ESTE MES</span><strong>{data.data?.totalElements ?? 0}</strong><span>eventos guardados</span><div className="calendar-note-mark" aria-hidden="true">▦</div></div>} />
    <ModuleToolbar resultLabel={`${data.data?.totalElements ?? 0} eventos`}>
      <label className="toolbar-date-field" htmlFor="event-filter-from"><span>Desde</span><input id="event-filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="toolbar-date-field" htmlFor="event-filter-to"><span>Hasta</span><input id="event-filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <SelectField label="Categoría" compact value={categoryCode} onChange={setCategoryCode} options={[{ value: "all", label: "Todas" }, ...config.eventCategories.filter((item) => item.active !== false || item.code === categoryCode).map(({ code, label }) => ({ value: code, label }))]} />
      {from || to || categoryCode !== "all" ? <Button className="filter-clear" variant="quiet" onClick={clearFilters}>Limpiar filtros</Button> : null}
    </ModuleToolbar>
    {data.loading ? <SkeletonGrid count={1} /> : data.error ? <ErrorState onRetry={data.reload} /> : <>
      <EventsCalendar month={month} events={events} selectedDate={visibleSelectedDate} onMonthChange={(next) => { setMonth(next); setSelectedDate(monthBounds(next).from); }} onSelectDate={setSelectedDate} />
      <section className="calendar-day-detail" aria-labelledby="calendar-selected-day">
        <div className="section-heading-row"><div><span className="eyebrow">DÍA SELECCIONADO</span><h2 id="calendar-selected-day">{weekdayLabel(visibleSelectedDate)} · {dateLabel(visibleSelectedDate)}</h2></div><Button variant="ghost" onClick={() => startNew(visibleSelectedDate)}>+ Agregar evento</Button></div>
        {visibleSelectedEvents.length ? <div className="event-detail-list">{visibleSelectedEvents.map((event) => <article className="event-detail-card" key={event.id}><div className="event-detail-copy"><span className="event-category-label">{event.category.label || categoryLabel(event.category.code)}</span><p>{event.description}</p></div><CardActions onEdit={() => startEdit(event)} onDelete={() => setPendingDelete(event.id)} /></article>)}</div> : <EmptyState title="No hay eventos para este día" description="Elegí otra fecha o agregá un evento para empezar a ordenar tu agenda." action="Agregar evento" onAction={() => startNew(visibleSelectedDate)} />}
      </section>
    </>}
    {composerOpen ? <Dialog ariaLabel="Registrar un evento" onClose={() => setComposerOpen(false)}><FormPanel eyebrow={editing ? "EDITAR EVENTO" : "NUEVO EVENTO"} onSubmit={() => void save()} title={editing ? "Editar evento" : "Agregar un evento"} description="Guardá una fecha, una descripción y una categoría para volver a encontrarlo." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-events"><label className="form-field" htmlFor="event-date"><span>Fecha del evento</span><input id="event-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><SelectField label="Categoría" id="event-category" value={draft.categoryCode} onChange={(categoryCode) => setDraft({ ...draft, categoryCode })} options={config.eventCategories.filter((item) => item.active !== false || item.code === draft.categoryCode).map(({ code, label }) => ({ value: code, label }))} /><div className="form-field-full"><FormField label="Descripción" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder="Ej. Presentar el trabajo práctico" multiline /></div></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "date", "description", "categoryCode")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)} disabled={mutation.pending}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.date || !draft.description.trim() || !draft.categoryCode || mutation.pending}>{mutation.pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar evento"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title="¿Eliminar este evento?" description="El evento se quitará de tu calendario y no se puede deshacer." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
