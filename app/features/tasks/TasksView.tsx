"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ApiConfig, Task, TaskStatus } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { dateLabel, isTaskOverdue as isOverdue } from "../../lib/presentation";
import { defaultCategoryCode, sortCategoryOptions } from "../../lib/categories";
import { Button, CardActions, CompactSectionHeader, ConfirmDialog, DateRangeFilter, Dialog, EmptyState, ErrorState, FormField, FormPanel, ModuleToolbar, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { useTasksData } from "./useTasksData";
import { NoteBody } from "../notes/NoteBody";
import { MarkdownAssistant } from "../../ui/MarkdownAssistant";
import { MarkdownEditor } from "../../ui/MarkdownEditor";

const STATUS_META: Record<TaskStatus, { label: string; eyebrow: string }> = {
  PENDING: { label: "Pendientes", eyebrow: "POR EMPEZAR" },
  IN_PROGRESS: { label: "En proceso", eyebrow: "EN MARCHA" },
  COMPLETED: { label: "Finalizadas", eyebrow: "RESUELTAS" },
};
const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

function taskDueLabel(task: Task) {
  if (!task.dueDate) return "Sin fecha límite";
  return isOverdue(task) ? `Vencida · ${dateLabel(task.dueDate)}` : `Límite · ${dateLabel(task.dueDate)}`;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return left.title.localeCompare(right.title);
  });
}

function completionTime(task: Task) {
  const value = task.completedAt ?? task.updatedAt ?? task.createdAt;
  return value ? Date.parse(value) : Number.NaN;
}

function sortCompletedTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => completionTime(right) - completionTime(left) || left.title.localeCompare(right.title));
}

type Draft = { title: string; detail: string; categoryCode: string; status: TaskStatus; dueDate: string; projectCode: string };

const emptyDraft = (categoryCode: string, projectCode = "personal"): Draft => ({ title: "", detail: "", categoryCode, status: "PENDING", dueDate: "", projectCode });

function TaskCard({ task, projectLabel, onEdit, onDelete, onPreview, onStatusChange, onPointerDown, dragging, shaking }: { task: Task; projectLabel: string; onEdit: () => void; onDelete: () => void; onPreview: () => void; onStatusChange: (status: TaskStatus) => void; onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void; dragging: boolean; shaking: boolean }) {
  return <article id={`record-${task.id}`} className={`task-card ${dragging ? "task-card-dragging" : ""} ${shaking ? "task-card-shake" : ""} ${isOverdue(task) ? "task-card-overdue" : ""}`} onPointerDown={onPointerDown}>
    <div className="task-card-top"><span className="task-grip" aria-hidden="true">⠿</span><span className="task-category">{task.category.label} · {projectLabel}</span><CardActions onEdit={onEdit} onDelete={onDelete} /></div>
    <button type="button" className="task-card-preview-trigger" onClick={onPreview} aria-label={`Ver tarea ${task.title}`}><h3>{task.title}</h3>{task.detail ? <div className="task-card-markdown"><NoteBody body={task.detail} interactiveLinks={false} /></div> : null}<div className={`task-due ${isOverdue(task) ? "task-due-overdue" : ""}`}><span aria-hidden="true">◷</span>{taskDueLabel(task)}</div></button>
    <div className="task-card-footer">
      <span className="task-drag-hint">Arrastrá para mover</span>
      <label className="task-status-select"><span className="visually-hidden">Cambiar estado de {task.title}</span><select value={task.status} onChange={(event) => onStatusChange(event.target.value as TaskStatus)}><option value="PENDING">Pendientes</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Finalizadas</option></select></label>
    </div>
  </article>;
}

export function TasksView({ config, focusId, editId, projectCode = "all", nested = false }: { config: ApiConfig; focusId?: string | null; editId?: string | null; projectCode?: string; nested?: boolean }) {
  const [projectFilterSelection, setProjectFilterSelection] = useState({ contextProjectCode: projectCode, value: projectCode });
  const filterProjectCode = nested ? projectCode : projectFilterSelection.contextProjectCode === projectCode ? projectFilterSelection.value : projectCode;
  const [categoryFilter, setCategoryFilter] = useState({ contextProjectCode: projectCode, projectCode, value: "all" });
  const categoryCode = categoryFilter.contextProjectCode === projectCode && categoryFilter.projectCode === filterProjectCode ? categoryFilter.value : "all";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const data = useTasksData(categoryCode, filterProjectCode, from, to);
  const { reload: reloadTasks } = data;
  const [previousVisibility, setPreviousVisibility] = useState<{ categoryCode: string; visible: boolean } | null>(null);
  const taskScopeKey = `${categoryCode}:${filterProjectCode}:${from}:${to}`;
  const showPreviousTasks = previousVisibility?.categoryCode === taskScopeKey && previousVisibility.visible;
  const mutation = useMutationError();
  const { clearError } = mutation;
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Task>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewEditTask, setPreviewEditTask] = useState<Task | null>(null);
  const [focusError, setFocusError] = useState("");
  const [dismissedFocusId, setDismissedFocusId] = useState<string | null>(null);
  const firstProject = projectCode === "all" ? config.projects.find((option) => option.code === "personal" && option.active !== false)?.code ?? config.projects.find((option) => option.active !== false)?.code ?? "personal" : projectCode;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultCategoryCode(config.categories, firstProject), firstProject));
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [shakingIds, setShakingIds] = useState<string[]>([]);
  const [pulsingStatus, setPulsingStatus] = useState<TaskStatus | null>(null);
  const dragRef = useRef<{ task: Task; x: number; y: number; moved: boolean } | null>(null);
  const lastEditId = useRef<string | null>(null);

  const tasks = useMemo(() => {
    const serverTasks = data.data?.content ?? [];
    const visibleServer = [...serverTasks, ...data.previousTasks].filter((task) => !deletedIds.includes(task.id)).map((task) => overrides[task.id] ?? task).filter((task) => filterProjectCode === "all" || task.projectCode === filterProjectCode);
    const serverIds = new Set(serverTasks.map((task) => task.id));
    const localCreated = createdTasks.map((task) => overrides[task.id] ?? task).filter((task) => !serverIds.has(task.id) && (categoryCode === "all" || `${task.projectCode}:${task.category.code}` === categoryCode) && (filterProjectCode === "all" || task.projectCode === filterProjectCode));
    return [...visibleServer, ...localCreated];
  }, [categoryCode, filterProjectCode, createdTasks, data.data, data.previousTasks, deletedIds, overrides]);

  const focusedPreviewTask = focusId && !editId && dismissedFocusId !== focusId ? tasks.find((task) => task.id === focusId) ?? null : null;
  const activePreviewTask = previewTask ?? focusedPreviewTask;

  useEffect(() => {
    if (!focusId) return;
    const target = document.getElementById(`record-${focusId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, tasks]);

  useEffect(() => {
    if (!focusId || editId) return;
    let cancelled = false;
    void api.getTask(focusId).then((task) => {
      if (!cancelled) { setFocusError(""); setPreviewTask(task); }
    }).catch(() => {
      if (!cancelled) setFocusError("No pudimos abrir esa tarea. Puede que se haya eliminado o que ya no esté disponible.");
    });
    return () => { cancelled = true; };
  }, [editId, focusId]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { PENDING: [], IN_PROGRESS: [], COMPLETED: [] };
    for (const task of tasks) grouped[task.status].push(task);
    for (const status of STATUSES) grouped[status] = status === "COMPLETED" ? sortCompletedTasks(grouped[status]) : sortTasks(grouped[status]);
    return grouped;
  }, [tasks]);

  const completedCutoff = Date.parse(data.data?.completedAfter ?? "");
  const recentCompleted = tasksByStatus.COMPLETED.filter((task) => {
    const completedAt = completionTime(task);
    return !Number.isFinite(completedAt) || completedAt >= completedCutoff;
  });
  const previousCompleted = tasksByStatus.COMPLETED.filter((task) => {
    const completedAt = completionTime(task);
    return Number.isFinite(completedAt) && completedAt < completedCutoff;
  });
  const previousCount = data.data?.previousCount ?? 0;
  const completedColumnVisible = recentCompleted.length > 0 || previousCount > 0;
  const visibleStatuses = completedColumnVisible ? STATUSES : STATUSES.slice(0, 2);
  const totalTaskCount = data.data?.totalCount ?? tasks.length + (data.previousTasks.length ? 0 : previousCount);

  const openCreate = () => { mutation.clearError(); setEditing(null); const nextProject = projectCode === "all" ? config.projects.find((option) => option.code === "personal" && option.active !== false)?.code ?? config.projects.find((option) => option.active !== false)?.code ?? "personal" : projectCode; setDraft(emptyDraft(defaultCategoryCode(config.categories, nextProject), nextProject)); setComposerOpen(true); };
  const openEdit = useCallback((task: Task) => { clearError(); setEditing(task); setDraft({ title: task.title, detail: task.detail ?? "", categoryCode: task.category.code, status: task.status, dueDate: task.dueDate ?? "", projectCode: task.projectCode }); setComposerOpen(true); }, [clearError]);
  const closePreview = () => { const task = previewEditTask; setPreviewEditTask(null); if (focusId && activePreviewTask?.id === focusId) setDismissedFocusId(focusId); setPreviewTask(null); if (task) openEdit(task); };
  useEffect(() => {
    if (!editId || !data.data || lastEditId.current === editId) return;
    const task = tasks.find((item) => item.id === editId);
    if (!task) return;
    lastEditId.current = editId;
    const timer = window.setTimeout(() => openEdit(task), 0);
    return () => window.clearTimeout(timer);
  }, [data.data, editId, openEdit, tasks]);
  const closeComposer = () => { if (!mutation.pending) setComposerOpen(false); };

  const saveTask = async () => {
    if (!draft.title.trim() || !selectedDraftCategoryCode || mutation.pending) return;
    try {
      const saved = editing
        ? await mutation.run(() => api.updateTask(editing.id, { title: draft.title.trim(), detail: draft.detail.trim(), categoryCode: selectedDraftCategoryCode, status: draft.status, dueDate: draft.dueDate || null, projectCode: draft.projectCode }))
        : await mutation.run(() => api.createTask({ title: draft.title.trim(), detail: draft.detail.trim() || undefined, categoryCode: selectedDraftCategoryCode, status: draft.status, dueDate: draft.dueDate || null, projectCode: draft.projectCode }));
      if (editing) setOverrides((current) => ({ ...current, [saved.id]: saved }));
      else setCreatedTasks((current) => [...current, saved]);
      setComposerOpen(false);
      invalidateApiQueryCache();
      reloadTasks();
    } catch { /* shown in the form */ }
  };

  const removeTask = async () => {
    if (!pendingDelete || mutation.pending) return;
    try {
      await mutation.run(() => api.deleteTask(pendingDelete.id));
      setDeletedIds((current) => current.includes(pendingDelete.id) ? current : [...current, pendingDelete.id]);
      setCreatedTasks((current) => current.filter((task) => task.id !== pendingDelete.id));
      setPendingDelete(null);
      invalidateApiQueryCache();
    } catch { /* keep confirmation open */ }
  };

  const clearDrag = useCallback(() => { dragRef.current = null; setDraggingId(null); setDropTarget(null); }, []);

  const moveTask = useCallback(async (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) { clearDrag(); return; }
    const previous = task;
    setOverrides((current) => ({ ...current, [task.id]: { ...task, status: nextStatus, completedAt: nextStatus === "COMPLETED" ? new Date().toISOString() : null } }));
    setPulsingStatus(nextStatus);
    setShakingIds((current) => [...current, task.id]);
    window.setTimeout(() => setShakingIds((current) => current.filter((id) => id !== task.id)), 360);
    clearDrag();
    try {
      const saved = await mutation.run(() => api.updateTask(task.id, { status: nextStatus }));
      setOverrides((current) => ({ ...current, [saved.id]: saved }));
      reloadTasks();
    } catch {
      setOverrides((current) => ({ ...current, [previous.id]: previous }));
      setShakingIds((current) => current.includes(task.id) ? current : [...current, task.id]);
      window.setTimeout(() => setShakingIds((current) => current.filter((id) => id !== task.id)), 360);
    } finally {
      window.setTimeout(() => setPulsingStatus(null), 420);
    }
  }, [clearDrag, mutation, reloadTasks]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>, task: Task) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input, textarea, a")) return;
    dragRef.current = { task, x: event.clientX, y: event.clientY, moved: false };
    setPointer({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    document.body.style.userSelect = draggingId ? "none" : "";
    return () => { document.body.style.userSelect = ""; };
  }, [draggingId]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
      if (distance < 6 && !drag.moved) return;
      drag.moved = true;
      setDraggingId(drag.task.id);
      setPointer({ x: event.clientX, y: event.clientY });
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-task-status-column]")?.dataset.taskStatusColumn as TaskStatus | undefined;
      setDropTarget(target ?? null);
    };
    const handlePointerUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const target = dropTarget;
      if (drag.moved && target) void moveTask(drag.task, target);
      else clearDrag();
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearDrag);
    return () => { window.removeEventListener("pointermove", handlePointerMove); window.removeEventListener("pointerup", handlePointerUp); window.removeEventListener("pointercancel", clearDrag); };
  }, [clearDrag, dropTarget, mutation, moveTask]);

  const activeCategories = sortCategoryOptions(config.categories.filter((option) => option.active !== false && (filterProjectCode === "all" || option.projectCode === filterProjectCode)));
  let draftCategories = sortCategoryOptions(config.categories.filter((option) => option.projectCode === draft.projectCode && (option.active !== false || option.code === draft.categoryCode)));
  if (editing && editing.projectCode === draft.projectCode && editing.category.code === draft.categoryCode && !draftCategories.some((option) => option.code === editing.category.code)) draftCategories = sortCategoryOptions([...draftCategories, { ...editing.category, projectCode: draft.projectCode }]);
  const selectedDraftCategoryCode = draftCategories.some((option) => option.code === draft.categoryCode) ? draft.categoryCode : draftCategories[0]?.code ?? "";
  const changeDraftProject = (nextProject: string) => setDraft((current) => ({ ...current, projectCode: nextProject, categoryCode: config.categories.some((option) => option.projectCode === nextProject && option.code === current.categoryCode && option.active !== false) ? current.categoryCode : defaultCategoryCode(config.categories, nextProject) }));
  const togglePreviousTasks = async () => {
    if (showPreviousTasks) {
      setPreviousVisibility({ categoryCode: taskScopeKey, visible: false });
      return;
    }
    if (await data.loadPrevious()) setPreviousVisibility({ categoryCode: taskScopeKey, visible: true });
  };

  return <div className="view view-tasks">
    {focusError ? <div className="analysis-notice" role="alert">{focusError}</div> : null}
    <CompactSectionHeader section="tasks" headingLevel={nested ? 2 : 1}>
      <Button onClick={openCreate}>Crear tarea <span aria-hidden="true">↗</span></Button>
    </CompactSectionHeader>
    <ModuleToolbar resultLabel={`${totalTaskCount} ${totalTaskCount === 1 ? "tarea" : "tareas"}`}>
      {!nested && <SelectField label="Proyecto" compact value={filterProjectCode} onChange={(nextProject) => { setProjectFilterSelection({ contextProjectCode: projectCode, value: nextProject }); setCategoryFilter({ contextProjectCode: projectCode, projectCode: nextProject, value: "all" }); }} options={[{ value: "all", label: "Todos los proyectos" }, ...config.projects.filter((item) => item.active !== false || item.code === filterProjectCode).map(({ code, label }) => ({ value: code, label }))]} />}
      <SelectField label="Categoría" compact value={categoryCode} onChange={(value) => setCategoryFilter({ contextProjectCode: projectCode, projectCode: filterProjectCode, value })} options={[{ value: "all", label: "Todas" }, ...activeCategories.map((option) => ({ value: `${option.projectCode}:${option.code}`, label: filterProjectCode === "all" ? `${option.label} · ${config.projects.find((project) => project.code === option.projectCode)?.label ?? option.projectCode}` : option.label }))]} />
      <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(""); setTo(""); }} idPrefix="task-filter" />
    </ModuleToolbar>
    {mutation.error ? <div className="inline-error task-global-error" role="alert">{mutation.error.message || "No se pudo actualizar la tarea. Probá de nuevo."}</div> : null}
    {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : !tasks.length && previousCount === 0 ? <EmptyState title="Todavía no hay tareas" description="Creá la primera y movela entre columnas a medida que avance." action="Crear tarea" onAction={openCreate} /> : <section className={`tasks-board ${completedColumnVisible ? "" : "tasks-board-two-columns"}`} aria-label="Tablero de tareas">
      {visibleStatuses.map((status) => {
        const columnTasks = status === "COMPLETED"
          ? [...recentCompleted, ...(showPreviousTasks ? previousCompleted : [])]
          : tasksByStatus[status];
        const columnCount = data.data?.statusCounts[status] ?? columnTasks.length;
        return <section className={`task-column ${dropTarget === status ? "task-column-drop-target" : ""} ${pulsingStatus === status ? "task-column-pulse" : ""}`} data-task-status-column={status} aria-labelledby={`task-column-${status}`} key={status}>
          <div className="task-column-heading"><div><span className="eyebrow">{STATUS_META[status].eyebrow}</span><h2 id={`task-column-${status}`}>{STATUS_META[status].label}</h2></div><span className="task-column-count">{columnCount}</span></div>
          <div className="task-column-list" id={status === "COMPLETED" ? "task-previous-list" : undefined}>{columnTasks.length ? columnTasks.map((task) => <TaskCard key={task.id} task={task} projectLabel={config.projects.find((item) => item.code === task.projectCode)?.label ?? task.projectCode} onEdit={() => openEdit(task)} onDelete={() => setPendingDelete(task)} onPreview={() => setPreviewTask(task)} onStatusChange={(nextStatus) => void moveTask(task, nextStatus)} onPointerDown={(event) => handlePointerDown(event, task)} dragging={draggingId === task.id} shaking={shakingIds.includes(task.id)} />) : <div className="task-column-empty">{status === "COMPLETED" ? "Sin finalizadas recientes" : "Soltá una tarea acá"}</div>}</div>
          {data.hasMore[status] !== null ? <Button variant="quiet" className="task-column-more" onClick={() => void data.loadMore(status)} disabled={data.refreshing || data.loadingMore === status}>{data.loadingMore === status ? "Cargando tareas…" : "Cargar más"}</Button> : null}
          {data.loadMoreError?.status === status ? <div className="inline-error task-column-error" role="alert">{data.loadMoreError.message}</div> : null}
          {status === "COMPLETED" && previousCount > 0 ? <>
            <Button variant="quiet" className="task-previous-toggle" onClick={() => void togglePreviousTasks()} disabled={data.previousLoading} ariaExpanded={showPreviousTasks} aria-controls="task-previous-list">
              {data.previousLoading ? "Cargando anteriores…" : showPreviousTasks ? "Ocultar anteriores" : `Ver anteriores (${previousCount})`}
            </Button>
            {data.previousError ? <div className="inline-error task-previous-error" role="alert">{data.previousError}</div> : null}
          </> : null}
        </section>;
      })}
    </section>}
    {draggingId ? <div className="task-drag-ghost" style={{ left: pointer.x + 14, top: pointer.y + 14 }} aria-hidden="true">{tasks.find((task) => task.id === draggingId)?.title}</div> : null}
    {activePreviewTask ? (
      <Dialog ariaLabel={`Vista previa de ${activePreviewTask.title}`} trackChanges={false} onClose={closePreview}>
        <FormPanel
          mode="preview"
          eyebrow={`VISTA PREVIA · ${activePreviewTask.category.label.toUpperCase()}`}
          title={activePreviewTask.title}
          description={`${activePreviewTask.category.label} · ${config.projects.find((item) => item.code === activePreviewTask.projectCode)?.label ?? activePreviewTask.projectCode}`}
          headerExtra={
            <dl className="task-preview-header-meta" aria-label="Estado y fecha límite">
              <div><dt>Estado</dt><dd>{STATUS_META[activePreviewTask.status].label}</dd></div>
              <div><dt>Fecha límite</dt><dd>{activePreviewTask.dueDate ? dateLabel(activePreviewTask.dueDate) : "Sin fecha límite"}</dd></div>
            </dl>
          }
          onClose={closePreview}
          onEdit={() => setPreviewEditTask(activePreviewTask)}
        >
          {activePreviewTask.detail ? <div className="record-preview-copy task-preview-markdown"><NoteBody body={activePreviewTask.detail} /></div> : <p className="record-preview-empty">Esta tarea no tiene detalles adicionales.</p>}
        </FormPanel>
      </Dialog>
    ) : null}
    {composerOpen ? (
      <Dialog ariaLabel={editing ? "Editar tarea" : "Crear tarea"} onClose={closeComposer} wide>
        <FormPanel eyebrow={editing ? "EDITAR TAREA" : "NUEVA TAREA"} title={editing ? "Editar tarea" : "Crear tarea"} description="Las tareas se guardan en tu espacio y podés moverlas cuando cambien de estado." onClose={closeComposer} onSubmit={() => void saveTask()}>
          <div className="form-grid task-form-grid">
            <FormField label="Tarea" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Ej. Entregar el trabajo práctico" />
            <SelectField label="Proyecto" value={draft.projectCode} onChange={changeDraftProject} options={config.projects.filter((item) => item.active !== false || item.code === draft.projectCode).map(({ code, label }) => ({ value: code, label }))} />
            <SelectField label="Categoría" value={selectedDraftCategoryCode} onChange={(value) => setDraft({ ...draft, categoryCode: value })} options={draftCategories.map((option) => ({ value: option.code, label: option.label }))} disabled={!draftCategories.length} />
            <SelectField label="Estado" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value as TaskStatus })} options={STATUSES.map((status) => ({ value: status, label: STATUS_META[status].label }))} />
            <label className="form-field"><span>Fecha límite (opcional)</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
            <div className="task-detail-field"><MarkdownEditor label="Detalle (opcional)" value={draft.detail} onChange={(detail) => setDraft((current) => ({ ...current, detail }))} placeholder="Agregá contexto o el próximo paso" preview={<NoteBody body={draft.detail} />} emptyPreview="Agregá detalle para ver la vista previa." assistant={<MarkdownAssistant kind="TASK" title={draft.title} content={draft.detail} onGenerated={(detail) => setDraft((current) => ({ ...current, detail }))} />} /></div>
          </div>
          {mutation.error ? <div className="inline-error" role="alert">{mutation.error.message}</div> : null}
          <div className="form-actions"><Button variant="quiet" onClick={closeComposer} disabled={mutation.pending}>Cancelar</Button><Button type="submit" disabled={mutation.pending || !draft.title.trim() || !selectedDraftCategoryCode || !draft.projectCode}>{mutation.pending ? "Guardando..." : editing ? "Guardar cambios" : "Crear tarea"}<span aria-hidden="true">↗</span></Button></div>
        </FormPanel>
      </Dialog>
    ) : null}
    {pendingDelete ? <ConfirmDialog title={`¿Eliminar ${pendingDelete.title}?`} description="La tarea se quitará del tablero, pero la acción no modifica tus categorías." onCancel={() => setPendingDelete(null)} onConfirm={() => void removeTask()} /> : null}
  </div>;
}
