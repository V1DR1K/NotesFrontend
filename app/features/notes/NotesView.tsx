"use client";

import { useRef, useState } from "react";
import type { ApiConfig, Note } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { dateLabel, todayIso, fieldError } from "../../lib/presentation";
import { sortCategoryOptions } from "../../lib/categories";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { NoteBody } from "./NoteBody";
import { MarkdownAssistant } from "../../ui/MarkdownAssistant";
import { useNotesData } from "./useNotesData";
import { useFocusTarget } from "../../lib/ui/useFocusTarget";

export function NotesView({ config, focusId, projectCode = "all", nested = false }: { config: ApiConfig; focusId?: string | null; projectCode?: string; nested?: boolean }) {
  const [projectFilterSelection, setProjectFilterSelection] = useState({ contextProjectCode: projectCode, value: projectCode });
  const filterProjectCode = nested ? projectCode : projectFilterSelection.contextProjectCode === projectCode ? projectFilterSelection.value : projectCode;
  const [categoryFilter, setCategoryFilter] = useState({ contextProjectCode: projectCode, projectCode, value: "all" });
  const filter = categoryFilter.contextProjectCode === projectCode && categoryFilter.projectCode === filterProjectCode ? categoryFilter.value : "all";
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [bodyMode, setBodyMode] = useState<"edit" | "preview">("edit");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const pendingPreviewEdit = useRef<Note | null>(null);
  const firstProject = projectCode === "all" ? config.projects.find((item) => item.code === "personal" && item.active !== false)?.code ?? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode;
  const [draft, setDraft] = useState({ title: "", body: "", categoryCode: sortCategoryOptions(config.categories).find((item) => item.projectCode === firstProject && item.active !== false)?.code ?? "", date: todayIso(), projectCode: firstProject });
  const data = useNotesData(page, filter, sort, filterProjectCode);
  const mutation = useMutationError();
  const categoryLabel = (code: string) => config.categories.find((item) => item.code === code)?.label ?? code;
  const notes = data.data?.content ?? [];
  useFocusTarget(focusId, Boolean(data.data));
  const startNew = () => { setEditingId(null); setBodyMode("edit"); const nextProject = projectCode === "all" ? config.projects.find((item) => item.code === "personal" && item.active !== false)?.code ?? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode; setDraft({ title: "", body: "", categoryCode: sortCategoryOptions(config.categories).find((item) => item.projectCode === nextProject && item.active !== false)?.code ?? "", date: todayIso(), projectCode: nextProject }); mutation.clearError(); setComposerOpen(true); };
  const startEdit = (note: Note) => { setEditingId(note.id); setBodyMode("edit"); setDraft({ title: note.title, body: note.body, categoryCode: note.categoryCode, date: note.date, projectCode: note.projectCode }); mutation.clearError(); setComposerOpen(true); };
  const closePreview = () => { const note = pendingPreviewEdit.current; pendingPreviewEdit.current = null; setPreviewNote(null); if (note) startEdit(note); };
  const activeCategories = sortCategoryOptions(config.categories.filter((item) => item.active !== false && (filterProjectCode === "all" || item.projectCode === filterProjectCode)));
  let draftCategories = sortCategoryOptions(config.categories.filter((item) => item.projectCode === draft.projectCode && (item.active !== false || item.code === draft.categoryCode)));
  const currentCategory = notes.find((note) => note.id === editingId)?.category;
  if (currentCategory && notes.find((note) => note.id === editingId)?.projectCode === draft.projectCode && currentCategory.code === draft.categoryCode && !draftCategories.some((item) => item.code === currentCategory.code)) draftCategories = sortCategoryOptions([...draftCategories, { ...currentCategory, projectCode: draft.projectCode }]);
  const changeDraftProject = (nextProject: string) => setDraft((current) => ({ ...current, projectCode: nextProject, categoryCode: config.categories.some((item) => item.projectCode === nextProject && item.code === current.categoryCode && item.active !== false) ? current.categoryCode : "" }));
  const save = async () => {
    if (!draft.title.trim() || !draft.body.trim() || !draft.categoryCode || !draft.date || mutation.pending) return;
    try {
      const body = { title: draft.title.trim(), body: draft.body.trim(), categoryCode: draft.categoryCode, date: draft.date, projectCode: draft.projectCode };
      await mutation.run(() => editingId ? api.updateNote(editingId, body) : api.createNote(body));
       setComposerOpen(false); invalidateApiQueryCache(); data.reload();
    } catch { /* the mutation error is shown in the form */ }
  };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteNote(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const pageCount = data.data?.totalPages ?? 0;

  return <div className="view module-view">
    <SectionHero section="notes" headingLevel={nested ? 2 : 1} onAction={startNew} rightSlot={<div className="notes-stamp"><VisualTile emoji="✎" label="Notas" /><div><span className="eyebrow">ÚLTIMA NOTA</span><strong>{notes[0]?.title ?? "Todavía no hay notas"}</strong><span>{notes[0] ? dateLabel(notes[0].date, true) : "Empezá cuando quieras"}</span></div></div>} />
    {composerOpen ? <Dialog ariaLabel="Escribir una nota" onClose={() => setComposerOpen(false)}><FormPanel eyebrow={editingId ? "EDITAR NOTA" : "NUEVA NOTA"} onSubmit={() => void save()} title={editingId ? "Editar nota" : "Escribir una nota"} description="Dale estructura a tus resúmenes con títulos, listas y otros formatos Markdown." onClose={() => setComposerOpen(false)}><div className="form-grid form-grid-notes">
       <FormField label="Título" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Ej. Una idea para mañana" /><SelectField label="Proyecto" value={draft.projectCode} onChange={changeDraftProject} options={config.projects.filter((item) => item.active !== false || item.code === draft.projectCode).map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Categoría" id="note-category" value={draft.categoryCode} onChange={(categoryCode) => setDraft({ ...draft, categoryCode })} options={draftCategories.map(({ code, label }) => ({ value: code, label }))} disabled={!draftCategories.length} /><label className="form-field" htmlFor="note-date"><span>Fecha</span><input id="note-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label><div className="form-field-full note-content-field">
         <div className="note-content-actions"><div className="note-markdown-toolbar" role="group" aria-label="Modo del contenido de la nota"><button className={`note-markdown-mode ${bodyMode === "edit" ? "note-markdown-mode-active" : ""}`} type="button" aria-pressed={bodyMode === "edit"} onClick={() => setBodyMode("edit")}>Escribir</button><button className={`note-markdown-mode ${bodyMode === "preview" ? "note-markdown-mode-active" : ""}`} type="button" aria-pressed={bodyMode === "preview"} onClick={() => setBodyMode("preview")}>Vista previa</button></div><MarkdownAssistant kind="NOTE" title={draft.title} content={draft.body} onGenerated={(body) => setDraft((current) => ({ ...current, body }))} /></div>
         {bodyMode === "edit" ? <FormField label="Contenido de la nota" value={draft.body} onChange={(body) => setDraft({ ...draft, body })} placeholder="Escribí tu resumen..." multiline /> : <div className="note-markdown-preview" role="region" aria-label="Vista previa del contenido de la nota">{draft.body.trim() ? <NoteBody body={draft.body} /> : <p className="note-markdown-empty">Escribí algo para ver la vista previa.</p>}</div>}
         <p className="note-markdown-hint">Admite títulos, negrita, listas, enlaces, tablas y bloques de código Markdown.</p>
       </div>
    </div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "title", "body", "categoryCode", "date")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={!draft.title.trim() || !draft.body.trim() || !draft.categoryCode || !draft.date}>{editingId ? "Guardar cambios" : "Guardar nota"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
      <ModuleToolbar resultLabel={`${data.data?.totalElements ?? 0} notas`}>
        {!nested && <SelectField label="Proyecto" compact value={filterProjectCode} onChange={(nextProject) => { setProjectFilterSelection({ contextProjectCode: projectCode, value: nextProject }); setCategoryFilter({ contextProjectCode: projectCode, projectCode: nextProject, value: "all" }); setPage(0); }} options={[{ value: "all", label: "Todos los proyectos" }, ...config.projects.filter((item) => item.active !== false || item.code === filterProjectCode).map(({ code, label }) => ({ value: code, label }))]} />}
        <SelectField label="Categoría" compact value={filter} onChange={(value) => { setCategoryFilter({ contextProjectCode: projectCode, projectCode: filterProjectCode, value }); setPage(0); }} options={[{ value: "all", label: "Todas" }, ...activeCategories.map(({ code, label, projectCode: ownerProject }) => ({ value: `${ownerProject}:${code}`, label: filterProjectCode === "all" ? `${label} · ${config.projects.find((project) => project.code === ownerProject)?.label ?? ownerProject}` : label }))]} />
        <SelectField label="Ordenar" compact value={sort} onChange={setSort} options={[{ value: "recent", label: "Más recientes" }, { value: "old", label: "Más antiguas" }]} />
      </ModuleToolbar>
      {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : notes.length ? <div className="content-grid notes-grid">{notes.map((note) => <article id={`record-${note.id}`} className="content-card note-card" key={note.id}><div className="content-card-top"><span className="mono-date">{dateLabel(note.date, true)}</span><CardActions onEdit={() => startEdit(note)} onDelete={() => setPendingDelete(note.id)} /></div><button type="button" className="content-card-preview-trigger" onClick={() => setPreviewNote(note)} aria-label={`Ver nota ${note.title}`}><div className="note-card-heading"><span className="note-symbol">✎</span><span className="note-category">{note.category?.label ?? categoryLabel(note.categoryCode)} · {config.projects.find((item) => item.code === note.projectCode)?.label ?? note.projectCode}</span></div><h2>{note.title}</h2><NoteBody body={note.body} interactiveLinks={false} /><div className="card-footer"><span className="eyebrow">NOTA / {categoryLabel(note.categoryCode).toUpperCase()}</span><span className="card-arrow">↗</span></div></button></article>)}</div> : <EmptyState title="No hay notas con esa categoría" description="Las ideas aparecen cuando les dejás un espacio. Podés escribir la primera ahora." action="Escribir nota" onAction={startNew} />}
    {previewNote ? <Dialog ariaLabel={`Vista previa de ${previewNote.title}`} trackChanges={false} onClose={closePreview}><FormPanel mode="preview" eyebrow={`VISTA PREVIA · ${categoryLabel(previewNote.categoryCode).toUpperCase()}`} title={previewNote.title} description={`${dateLabel(previewNote.date, true)} · ${config.projects.find((item) => item.code === previewNote.projectCode)?.label ?? previewNote.projectCode}`} onClose={closePreview} onEdit={() => { pendingPreviewEdit.current = previewNote; }}><NoteBody body={previewNote.body} /></FormPanel></Dialog> : null}
    <div className="module-bottom"><span className="bottom-caption">UNA IDEA GUARDADA ES UNA IDEA QUE PUEDE CRECER.</span><Pagination page={Math.min(page + 1, Math.max(1, pageCount))} pages={pageCount} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar esta nota?" description="La nota se quitará de tu cuaderno y no podrá recuperarse desde acá." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
