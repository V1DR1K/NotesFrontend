"use client";

import { useState } from "react";
import type { ApiConfig, Note } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { dateLabel, todayIso, fieldError } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { NoteBody } from "./NoteBody";
import { useNotesData } from "./useNotesData";

export function NotesView({ config }: { config: ApiConfig }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const activeCategories = config.noteCategories.filter((item) => item.active !== false);
  const [draft, setDraft] = useState({ title: "", body: "", categoryCode: activeCategories[0]?.code ?? "", date: todayIso() });
  const data = useNotesData(page, filter);
  const mutation = useMutationError();
  const categoryLabel = (code: string) => config.noteCategories.find((item) => item.code === code)?.label ?? code;
  const notes = [...(data.data?.content ?? [])].sort((a, b) => sort === "old" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  const startNew = () => { setEditingId(null); setDraft({ title: "", body: "", categoryCode: activeCategories[0]?.code ?? "", date: todayIso() }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (note: Note) => { setEditingId(note.id); setDraft({ title: note.title, body: note.body, categoryCode: note.categoryCode, date: note.date }); mutation.clearError(); setComposerOpen(true); };
  const save = async () => {
    if (!draft.title.trim() || !draft.body.trim() || !draft.categoryCode || !draft.date || mutation.pending) return;
    try {
      const body = { title: draft.title.trim(), body: draft.body.trim(), categoryCode: draft.categoryCode, date: draft.date };
      await mutation.run(() => editingId ? api.updateNote(editingId, body) : api.createNote(body));
       setComposerOpen(false); invalidateApiQueryCache(); data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteNote(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const pageCount = data.data?.totalPages ?? 0;

  return <div className="view module-view">
    <SectionHero section="notes" onAction={startNew} rightSlot={<div className="notes-stamp"><VisualTile emoji="✎" label="Notas" /><div><span className="eyebrow">ÚLTIMA NOTA</span><strong>{notes[0]?.title ?? "Todavía no hay notas"}</strong><span>{notes[0] ? dateLabel(notes[0].date, true) : "Empezá cuando quieras"}</span></div></div>} />
    {composerOpen ? <Dialog ariaLabel="Escribir una nota" onClose={() => setComposerOpen(false)}><FormPanel eyebrow={editingId ? "EDITAR NOTA" : "NUEVA NOTA"} onSubmit={() => void save()} title={editingId ? "Editar nota" : "Escribir una nota"} description="Una nota simple, con fecha y categoría para volver a encontrarla." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-notes">
       <FormField label="Título" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Ej. Una idea para mañana" /><SelectField label="Categoría" id="note-category" value={draft.categoryCode} onChange={(categoryCode) => setDraft({ ...draft, categoryCode })} options={config.noteCategories.filter((item) => item.active !== false || item.code === draft.categoryCode).map(({ code, label }) => ({ value: code, label }))} /><label className="form-field" htmlFor="note-date"><span>Fecha</span><input id="note-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><div className="form-field-full"><FormField label="Nota" value={draft.body} onChange={(body) => setDraft({ ...draft, body })} placeholder="Escribí lo que quieras conservar..." multiline /></div>
    </div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "title", "body", "categoryCode", "date")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.title.trim() || !draft.body.trim() || !draft.categoryCode || !draft.date}>{editingId ? "Guardar cambios" : "Guardar nota"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
     <ModuleToolbar resultLabel={`${data.data?.totalElements ?? 0} notas`}><FilterPills active={filter} onChange={(value) => { setFilter(value); setPage(0); }} options={[{ value: "all", label: "Todas" }, ...activeCategories.map(({ code, label }) => ({ value: code, label }))]} /><SelectField label="Ordenar" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "old", label: "Más antiguas" }]} /></ModuleToolbar>
     {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : notes.length ? <div className="content-grid notes-grid">{notes.map((note) => <article className="content-card note-card" key={note.id}><div className="content-card-top"><span className="mono-date">{dateLabel(note.date, true)}</span><CardActions onEdit={() => startEdit(note)} onDelete={() => setPendingDelete(note.id)} /></div><div className="note-card-heading"><span className="note-symbol">✎</span><span className="note-category">{note.category?.label ?? categoryLabel(note.categoryCode)}</span></div><h2>{note.title}</h2><NoteBody body={note.body} /><div className="card-footer"><span className="eyebrow">NOTA / {categoryLabel(note.categoryCode).toUpperCase()}</span><span className="card-arrow">↗</span></div></article>)}</div> : <EmptyState title="No hay notas con esa categoría" description="Las ideas aparecen cuando les dejás un espacio. Podés escribir la primera ahora." action="Escribir nota" onAction={startNew} />}
    <div className="module-bottom"><span className="bottom-caption">UNA IDEA GUARDADA ES UNA IDEA QUE PUEDE CRECER.</span><Pagination page={Math.min(page + 1, Math.max(1, pageCount))} pages={pageCount} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar esta nota?" description="La nota se quitará de tu cuaderno y no podrá recuperarse desde acá." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
