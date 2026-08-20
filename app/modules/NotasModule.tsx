"use client";

import { useMemo, useState } from "react";
import { INITIAL_NOTES, type NoteEntry } from "../config/mock-data";
import { NOTE_CATEGORY_OPTIONS, type NoteCategory } from "../config/section-settings/notas";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, VisualTile } from "../ui/Primitives";

const categoryLabels = Object.fromEntries(NOTE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])) as Record<NoteCategory, string>;
const pageSize = 3;

export function NotasModule() {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "", category: "ideas" as NoteCategory, date: "2026-08-20" });

  const filteredNotes = useMemo(() => [...(filter === "all" ? notes : notes.filter((note) => note.category === filter))].sort((a, b) => sort === "old" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [notes, filter, sort]);
  const pages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  const visibleNotes = filteredNotes.slice((page - 1) * pageSize, page * pageSize);
  const countFor = (value: string) => value === "all" ? notes.length : notes.filter((note) => note.category === value).length;

  const startNew = () => { setEditingId(null); setDraft({ title: "", body: "", category: "ideas", date: "2026-08-20" }); setComposerOpen(true); };
  const startEdit = (note: NoteEntry) => { setEditingId(note.id); setDraft({ title: note.title, body: note.body, category: note.category, date: note.date }); setComposerOpen(true); };
  const saveNote = () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    const note: NoteEntry = { id: editingId ?? `note-${Date.now()}`, title: draft.title, body: draft.body, category: draft.category, date: draft.date, dateLabel: draft.date === "2026-08-20" ? "Hoy · ahora" : new Date(`${draft.date}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "") };
    setNotes((current) => editingId ? current.map((item) => item.id === editingId ? note : item) : [note, ...current]);
    setComposerOpen(false);
  };
  const deleteNote = () => { if (!pendingDelete) return; setNotes((current) => current.filter((note) => note.id !== pendingDelete)); setPendingDelete(null); };
  const updateFilter = (value: string) => { setFilter(value); setPage(1); };

  return (
    <div className="view module-view">
      <SectionHero section="notes" onAction={startNew} rightSlot={<div className="notes-stamp"><VisualTile emoji="✎" label="Notas" /><div><span className="eyebrow">ÚLTIMA NOTA</span><strong>La idea del tablero</strong><span>Actualizada hace 18 min</span></div></div>} />

      {composerOpen ? <Dialog ariaLabel="Escribir una nota" onClose={() => setComposerOpen(false)}><FormPanel title={editingId ? "Editar nota" : "Escribir una nota"} description="Una nota simple, con fecha y categoría para volver a encontrarla." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-notes"><FormField label="Título" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Ej. Una idea para mañana" /><SelectField label="Categoría" value={draft.category} onChange={(category) => setDraft({ ...draft, category: category as NoteCategory })} options={NOTE_CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label }))} /><label className="form-field"><span>Fecha</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><div className="form-field-full"><FormField label="Nota" value={draft.body} onChange={(body) => setDraft({ ...draft, body })} placeholder="Escribí lo que quieras conservar..." multiline /></div></div><div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={saveNote} disabled={!draft.title.trim() || !draft.body.trim()}>{editingId ? "Guardar cambios" : "Guardar nota"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}

      <ModuleToolbar resultLabel={`${filteredNotes.length} notas`}>
        <FilterPills active={filter} onChange={updateFilter} options={[{ value: "all", label: "Todas", count: countFor("all") }, ...NOTE_CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label, count: countFor(value) }))]} />
        <SelectField label="Ordenar" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "old", label: "Más antiguas" }]} />
      </ModuleToolbar>

      {visibleNotes.length ? <div className="content-grid notes-grid">{visibleNotes.map((note) => <article className="content-card note-card" key={note.id}>
        <div className="content-card-top"><span className="mono-date">{note.dateLabel}</span><CardActions onEdit={() => startEdit(note)} onDelete={() => setPendingDelete(note.id)} /></div>
        <div className="note-card-heading"><span className="note-symbol">✎</span><span className="note-category">{categoryLabels[note.category]}</span></div>
        <h2>{note.title}</h2><p>{note.body}</p>
        <div className="card-footer"><span className="eyebrow">NOTA / {categoryLabels[note.category].toUpperCase()}</span><span className="card-arrow">↗</span></div>
      </article>)}</div> : <EmptyState title="No hay notas con esa categoría" description="Las ideas aparecen cuando les dejás un espacio. Podés escribir la primera ahora." action="Escribir nota" onAction={startNew} />}
      <div className="module-bottom"><span className="bottom-caption">UNA IDEA GUARDADA ES UNA IDEA QUE PUEDE CRECER.</span><Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} /></div>
      {pendingDelete ? <ConfirmDialog title="¿Eliminar esta nota?" description="La nota se quitará de esta vista local y no podrá recuperarse desde acá." onCancel={() => setPendingDelete(null)} onConfirm={deleteNote} /> : null}
    </div>
  );
}
