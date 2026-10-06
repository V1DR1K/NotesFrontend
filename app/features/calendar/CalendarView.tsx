"use client";

import { useRef, useState } from "react";
import type { ApiConfig, CalendarEvent, Task } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { currentMonth, dateLabel, fieldError, monthBounds, todayIso, weekdayLabel } from "../../lib/presentation";
import { sortCategoryOptions } from "../../lib/categories";
import { useFocusTarget } from "../../lib/ui/useFocusTarget";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { EventsCalendar } from "./EventsCalendar";
import { useCalendarData, type CalendarItemType } from "./useCalendarData";

const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
};

function taskIsOverdue(task: Task) {
  return task.status !== "COMPLETED" && Boolean(task.dueDate && task.dueDate < todayIso());
}

export function CalendarView({ config, onOpenTask, focusId, focusDate }: { config: ApiConfig; onOpenTask?: (taskId: string) => void; focusId?: string | null; focusDate?: string | null }) {
  const [month, setMonth] = useState(() => focusDate?.slice(0, 7) ?? currentMonth());
  const [selectedDate, setSelectedDate] = useState(() => focusDate ?? todayIso());
  const [type, setType] = useState<CalendarItemType>("all");
  const [categoryKey, setCategoryKey] = useState("all");
  const [projectCode, setProjectCode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null);
  const pendingPreviewEdit = useRef<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: todayIso(), description: "", categoryCode: "", projectCode: "personal" });
  const data = useCalendarData(month, type, categoryKey, from, to, projectCode);
  useFocusTarget(focusId, Boolean(data.data));
  const mutation = useMutationError();
  const events = data.data?.events ?? [];
  const tasks = data.data?.tasks ?? [];
  const calendarCategories = sortCategoryOptions(config.categories.filter((item) => item.active !== false || `${item.projectCode}:${item.code}` === categoryKey));
  let draftCategories = sortCategoryOptions(config.categories.filter((item) => item.projectCode === draft.projectCode && (item.active !== false || item.code === draft.categoryCode)));
  const currentEventCategory = events.find((event) => event.id === editing?.id)?.category;
  if (currentEventCategory && editing?.projectCode === draft.projectCode && currentEventCategory.code === draft.categoryCode && !draftCategories.some((item) => item.code === currentEventCategory.code)) draftCategories = sortCategoryOptions([...draftCategories, { ...currentEventCategory, projectCode: draft.projectCode }]);
  const totalElements = data.data?.totalElements ?? 0;
  const startNew = (date = selectedDate) => { const nextProject = projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode; setEditing(null); setDraft({ date, description: "", categoryCode: sortCategoryOptions(config.categories).find((item) => item.projectCode === nextProject && item.active !== false)?.code ?? "", projectCode: nextProject }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (event: CalendarEvent) => { setEditing(event); setDraft({ date: event.date, description: event.description, categoryCode: event.category.code, projectCode: event.projectCode }); mutation.clearError(); setComposerOpen(true); };
  const closePreview = () => { const event = pendingPreviewEdit.current; pendingPreviewEdit.current = null; setPreviewEvent(null); if (event) startEdit(event); };
  const save = async () => {
    if (!draft.date || !draft.description.trim() || !draft.categoryCode || mutation.pending) return;
    try {
      const body = { date: draft.date, description: draft.description.trim(), categoryCode: draft.categoryCode, projectCode: draft.projectCode };
      await mutation.run(() => editing ? api.updateEvent(editing.id, body) : api.createEvent(body));
      setSelectedDate(draft.date); setMonth(draft.date.slice(0, 7)); setComposerOpen(false); invalidateApiQueryCache(); data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteEvent(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const clearFilters = () => { setType("all"); setCategoryKey("all"); setProjectCode("all"); setFrom(""); setTo(""); };
  const categoryLabel = (code: string) => config.categories.find((item) => item.code === code)?.label ?? code;
  const projectLabel = (code: string) => config.projects.find((item) => item.code === code)?.label ?? code;
  const range = monthBounds(month);
  const visibleSelectedDate = selectedDate.startsWith(month) ? selectedDate : range.from;
  const visibleSelectedEvents = events.filter((event) => event.date === visibleSelectedDate);
  const visibleSelectedTasks = tasks.filter((task) => task.dueDate === visibleSelectedDate);
  const hasFilters = type !== "all" || categoryKey !== "all" || projectCode !== "all" || Boolean(from || to);

  return <div className="view module-view">
    <SectionHero section="calendar" onAction={() => startNew(visibleSelectedDate)} rightSlot={<div className="calendar-note-card"><span className="eyebrow">ESTE MES</span><strong>{totalElements}</strong><span>elementos en agenda</span><div className="calendar-note-mark" aria-hidden="true">▦</div></div>} />
    <ModuleToolbar resultLabel={`${totalElements} ${totalElements === 1 ? "elemento" : "elementos"}`}>
      <FilterPills ariaLabel="Tipo de elemento" active={type} options={[{ value: "all", label: "Todo" }, { value: "events", label: "Eventos" }, { value: "tasks", label: "Tareas" }]} onChange={(value) => setType(value as CalendarItemType)} />
      <SelectField label="Proyecto" compact value={projectCode} onChange={(nextProject) => { setProjectCode(nextProject); if (categoryKey !== "all" && nextProject !== "all" && !categoryKey.startsWith(`${nextProject}:`)) setCategoryKey("all"); }} options={[{ value: "all", label: "Todos los proyectos" }, ...config.projects.filter((item) => item.active !== false || item.code === projectCode).map(({ code, label }) => ({ value: code, label }))]} />
      <label className="toolbar-date-field" htmlFor="event-filter-from"><span>Desde</span><input id="event-filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="toolbar-date-field" htmlFor="event-filter-to"><span>Hasta</span><input id="event-filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <SelectField label="Categoría" compact value={categoryKey} onChange={setCategoryKey} options={[{ value: "all", label: "Todas" }, ...calendarCategories.filter((item) => projectCode === "all" || item.projectCode === projectCode).map(({ code, label, projectCode: ownerProject }) => ({ value: `${ownerProject}:${code}`, label: projectCode === "all" ? `${label} · ${projectLabel(ownerProject ?? "")}` : label }))]} />
      {hasFilters ? <Button className="filter-clear" variant="quiet" onClick={clearFilters}>Limpiar filtros</Button> : null}
    </ModuleToolbar>
    {data.loading ? <SkeletonGrid count={1} /> : data.error ? <ErrorState onRetry={data.reload} /> : <>
      <EventsCalendar month={month} events={events} tasks={tasks} selectedDate={visibleSelectedDate} onMonthChange={(next) => { setMonth(next); setSelectedDate(monthBounds(next).from); }} onSelectDate={setSelectedDate} />
      <section className="calendar-day-detail" aria-labelledby="calendar-selected-day">
        <div className="section-heading-row"><div><span className="eyebrow">DÍA SELECCIONADO</span><h2 id="calendar-selected-day">{weekdayLabel(visibleSelectedDate)} · {dateLabel(visibleSelectedDate)}</h2></div><Button variant="ghost" onClick={() => startNew(visibleSelectedDate)}>+ Agregar evento</Button></div>
        {visibleSelectedEvents.length || visibleSelectedTasks.length ? <div className="calendar-detail-groups">
          {visibleSelectedEvents.length ? <section className="calendar-detail-group" aria-labelledby="calendar-events-heading"><div className="calendar-detail-group-heading"><h3 id="calendar-events-heading">Eventos</h3><span>{visibleSelectedEvents.length}</span></div><div className="event-detail-list">{visibleSelectedEvents.map((event) => <article className="event-detail-card" id={"record-" + event.id} key={event.id}><button type="button" className="event-detail-preview-trigger" onClick={() => setPreviewEvent(event)} aria-label={`Ver evento: ${event.description}`}><span className="event-category-label">{event.category.label || categoryLabel(event.category.code)} · {projectLabel(event.projectCode)}</span><p className="multiline-copy">{event.description}</p></button><CardActions onEdit={() => startEdit(event)} onDelete={() => setPendingDelete(event.id)} /></article>)}</div></section> : null}
          {visibleSelectedTasks.length ? <section className="calendar-detail-group" aria-labelledby="calendar-tasks-heading"><div className="calendar-detail-group-heading"><h3 id="calendar-tasks-heading">Tareas</h3><span>{visibleSelectedTasks.length}</span></div><div className="event-detail-list">{visibleSelectedTasks.map((task) => <button type="button" className={`calendar-task-detail-card ${task.status === "COMPLETED" ? "calendar-task-detail-card-completed" : ""} ${taskIsOverdue(task) ? "calendar-task-detail-card-overdue" : ""}`} key={task.id} onClick={() => onOpenTask?.(task.id)} aria-label={`Abrir tarea ${task.title}`}><span className="calendar-task-detail-status">{TASK_STATUS_LABEL[task.status]}</span><span className="calendar-task-detail-copy"><strong>{task.title}</strong><small>{task.category.label} · {projectLabel(task.projectCode)} · Límite {dateLabel(task.dueDate ?? undefined)}</small></span><span className="activity-arrow" aria-hidden="true">→</span></button>)}</div></section> : null}
        </div> : <EmptyState title="No hay elementos para este día" description="Elegí otra fecha o agregá un evento para empezar a ordenar tu agenda." action="Agregar evento" onAction={() => startNew(visibleSelectedDate)} />}
      </section>
    </>}
    {composerOpen ? <Dialog ariaLabel="Registrar un evento" onClose={() => setComposerOpen(false)}><FormPanel eyebrow={editing ? "EDITAR EVENTO" : "NUEVO EVENTO"} onSubmit={() => void save()} title={editing ? "Editar evento" : "Agregar un evento"} description="Guardá una fecha, una descripción y una categoría para volver a encontrarlo." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-events"><label className="form-field" htmlFor="event-date"><span>Fecha del evento</span><input id="event-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><SelectField label="Proyecto" value={draft.projectCode} onChange={(value) => { const nextCategory = sortCategoryOptions(config.categories).find((item) => item.projectCode === value && item.active !== false)?.code ?? ""; setDraft({ ...draft, projectCode: value, categoryCode: draft.categoryCode === nextCategory || config.categories.some((item) => item.projectCode === value && item.code === draft.categoryCode && item.active !== false) ? draft.categoryCode : nextCategory }); }} options={config.projects.filter((item) => item.active !== false || item.code === draft.projectCode).map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Categoría" id="event-category" value={draft.categoryCode} onChange={(categoryCode) => setDraft({ ...draft, categoryCode })} options={draftCategories.map(({ code, label }) => ({ value: code, label }))} /><div className="form-field-full"><FormField label="Descripción" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder="Ej. Presentar el trabajo práctico" multiline /></div></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "date", "description", "categoryCode")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)} disabled={mutation.pending}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.date || !draft.description.trim() || !draft.categoryCode || mutation.pending}>{mutation.pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar evento"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {previewEvent ? <Dialog ariaLabel="Vista previa del evento" trackChanges={false} onClose={closePreview}><FormPanel mode="preview" eyebrow={`VISTA PREVIA · ${previewEvent.category.label || categoryLabel(previewEvent.category.code)}`} title={dateLabel(previewEvent.date, true)} description={`${previewEvent.category.label || categoryLabel(previewEvent.category.code)} · ${projectLabel(previewEvent.projectCode)}`} onClose={closePreview} onEdit={() => { pendingPreviewEdit.current = previewEvent; }}><p className="record-preview-copy multiline-copy">{previewEvent.description}</p></FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title="¿Eliminar este evento?" description="El evento se quitará de tu calendario y no se puede deshacer." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
