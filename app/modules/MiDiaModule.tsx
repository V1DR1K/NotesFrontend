"use client";

import { useMemo, useState } from "react";
import { INITIAL_DAYS, type DayEntry, type DayStatus } from "../config/mock-data";
import { DAY_STATUS_OPTIONS } from "../config/section-settings/mi-dia";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, StatusDot } from "../ui/Primitives";

const statusLabels: Record<DayStatus, string> = Object.fromEntries(DAY_STATUS_OPTIONS.map((option) => [option.value, option.label])) as Record<DayStatus, string>;
const pageSize = 3;

export function MiDiaModule() {
  const [entries, setEntries] = useState(INITIAL_DAYS);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: "2026-08-20", status: "green" as DayStatus, feeling: "", description: "" });

  const filteredEntries = useMemo(() => filter === "all" ? entries : entries.filter((entry) => entry.status === filter), [entries, filter]);
  const pages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  const startNew = () => {
    setEditingId(null);
    setDraft({ date: "2026-08-20", status: "green", feeling: "", description: "" });
    setComposerOpen(true);
  };

  const startEdit = (entry: DayEntry) => {
    setEditingId(entry.id);
    setDraft({ date: entry.date, status: entry.status, feeling: entry.feeling, description: entry.description });
    setComposerOpen(true);
  };

  const saveEntry = () => {
    if (!draft.feeling.trim() || !draft.description.trim()) return;
    const dateLabel = draft.date === "2026-08-20" ? "Jueves 20 ago" : new Date(`${draft.date}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "");
    const entry: DayEntry = { id: editingId ?? `day-${Date.now()}`, date: draft.date, dateLabel, status: draft.status, feeling: draft.feeling, description: draft.description, mood: DAY_STATUS_OPTIONS.find((option) => option.value === draft.status)?.emoji ?? "◌" };
    setEntries((current) => editingId ? current.map((item) => item.id === editingId ? entry : item) : [entry, ...current]);
    setComposerOpen(false);
  };

  const deleteEntry = () => {
    if (!pendingDelete) return;
    setEntries((current) => current.filter((entry) => entry.id !== pendingDelete));
    setPendingDelete(null);
  };

  const updateFilter = (value: string) => { setFilter(value); setPage(1); };
  const countFor = (value: string) => value === "all" ? entries.length : entries.filter((entry) => entry.status === value).length;

  return (
    <div className="view module-view">
      <SectionHero section="day" onAction={startNew} rightSlot={<div className="streak-card"><span className="eyebrow">RACHA ACTUAL</span><strong>04 días</strong><span>en verde</span><div className="streak-dots"><i /><i /><i /><i /><i className="streak-empty" /><i className="streak-empty" /><i className="streak-empty" /></div></div>} />

      {composerOpen ? <Dialog ariaLabel="Registrar cómo estuvo el día" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar el registro" : "Guardar cómo estuvo"} description="No hace falta escribir mucho. Que sea honesto alcanza." onClose={() => setComposerOpen(false)}>
        <div className="form-grid form-grid-day">
          <label className="form-field"><span>Fecha</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <div className="form-field"><span>Semáforo del día</span><div className="status-picker">{DAY_STATUS_OPTIONS.map((option) => <button type="button" className={draft.status === option.value ? `status-choice active status-choice-${option.value}` : `status-choice status-choice-${option.value}`} onClick={() => setDraft({ ...draft, status: option.value })} key={option.value}><StatusDot status={option.value} />{option.label}</button>)}</div></div>
          <FormField label="¿Cómo te sentiste?" value={draft.feeling} onChange={(feeling) => setDraft({ ...draft, feeling })} placeholder="Ej. tranquilo, con energía..." />
          <div className="form-field-full"><FormField label="Descripción" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder="¿Qué pasó hoy?" multiline /></div>
        </div>
        <div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={saveEntry} disabled={!draft.feeling.trim() || !draft.description.trim()}>{editingId ? "Guardar cambios" : "Guardar registro"} <span aria-hidden="true">↗</span></Button></div>
      </FormPanel></Dialog> : null}

      <ModuleToolbar resultLabel={`${filteredEntries.length} registros`}>
        <FilterPills active={filter} onChange={updateFilter} options={[{ value: "all", label: "Todos", count: countFor("all") }, { value: "green", label: "Verde", count: countFor("green") }, { value: "yellow", label: "Amarillo", count: countFor("yellow") }, { value: "red", label: "Rojo", count: countFor("red") }]} />
        <SelectField label="Ordenar" compact value="recent" onChange={() => undefined} options={[{ value: "recent", label: "Más recientes" }, { value: "old", label: "Más antiguos" }]} />
      </ModuleToolbar>

      {visibleEntries.length ? <div className="content-grid day-grid">{visibleEntries.map((entry) => <article className="content-card day-card" key={entry.id}>
        <div className="content-card-top"><span className="mono-date">{entry.dateLabel}</span><CardActions onEdit={() => startEdit(entry)} onDelete={() => setPendingDelete(entry.id)} /></div>
        <div className="day-card-heading"><StatusDot status={entry.status} /><span className="status-copy">{statusLabels[entry.status]}</span><span className="day-mood">{entry.mood}</span></div>
        <h2>{entry.feeling}</h2><p>{entry.description}</p>
        <div className="card-footer"><span className="eyebrow">REGISTRO DIARIO</span><span className="card-arrow">↗</span></div>
      </article>)}</div> : <EmptyState title="Todavía no hay días con ese color" description="Probá otro filtro o dejá un nuevo registro para empezar a construir memoria." action="Anotar el día" onAction={startNew} />}
      <div className="module-bottom"><span className="bottom-caption">CADA REGISTRO ES UNA FOTO, NO UN JUICIO.</span><Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} /></div>
      {pendingDelete ? <ConfirmDialog title="¿Eliminar este registro?" description="La acción es local por ahora y no se puede deshacer desde esta pantalla." onCancel={() => setPendingDelete(null)} onConfirm={deleteEntry} /> : null}
    </div>
  );
}
