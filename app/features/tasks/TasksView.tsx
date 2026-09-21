"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ApiConfig, Task, TaskStatus } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { dateLabel } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, SectionHero, SelectField, SkeletonGrid } from "../../ui/Primitives";
import { useTasksData } from "./useTasksData";

const STATUS_META: Record<TaskStatus, { label: string; eyebrow: string }> = {
  PENDING: { label: "Pendientes", eyebrow: "POR EMPEZAR" },
  IN_PROGRESS: { label: "En proceso", eyebrow: "EN MARCHA" },
  COMPLETED: { label: "Finalizadas", eyebrow: "RESUELTAS" },
};
const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isOverdue(task: Task) {
  return task.status !== "COMPLETED" && Boolean(task.dueDate && task.dueDate < todayIso());
}

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

type Draft = { title: string; detail: string; categoryCode: string; status: TaskStatus; dueDate: string };

const emptyDraft = (categoryCode: string): Draft => ({ title: "", detail: "", categoryCode, status: "PENDING", dueDate: "" });

function TaskCard({ task, onEdit, onDelete, onStatusChange, onPointerDown, dragging, shaking }: { task: Task; onEdit: () => void; onDelete: () => void; onStatusChange: (status: TaskStatus) => void; onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void; dragging: boolean; shaking: boolean }) {
  return <article id={`record-${task.id}`} className={`task-card ${dragging ? "task-card-dragging" : ""} ${shaking ? "task-card-shake" : ""} ${isOverdue(task) ? "task-card-overdue" : ""}`} onPointerDown={onPointerDown}>
    <div className="task-card-top"><span className="task-grip" aria-hidden="true">⠿</span><span className="task-category">{task.category.label}</span><CardActions onEdit={onEdit} onDelete={onDelete} /></div>
    <h3>{task.title}</h3>
    {task.detail ? <p>{task.detail}</p> : null}
    <div className={`task-due ${isOverdue(task) ? "task-due-overdue" : ""}`}><span aria-hidden="true">◷</span>{taskDueLabel(task)}</div>
    <div className="task-card-footer">
      <span className="task-drag-hint">Arrastrá para mover</span>
      <label className="task-status-select"><span className="visually-hidden">Cambiar estado de {task.title}</span><select value={task.status} onChange={(event) => onStatusChange(event.target.value as TaskStatus)}><option value="PENDING">Pendientes</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Finalizadas</option></select></label>
    </div>
  </article>;
}

export function TasksView({ config, focusId, editId }: { config: ApiConfig; focusId?: string | null; editId?: string | null }) {
  const [categoryCode, setCategoryCode] = useState("all");
  const data = useTasksData(categoryCode);
  const mutation = useMutationError();
  const { clearError } = mutation;
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Task>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(config.taskCategories[0]?.code ?? ""));
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
    const visibleServer = serverTasks.filter((task) => !deletedIds.includes(task.id)).map((task) => overrides[task.id] ?? task);
    const serverIds = new Set(serverTasks.map((task) => task.id));
    const localCreated = createdTasks.filter((task) => !serverIds.has(task.id) && (categoryCode === "all" || task.category.code === categoryCode));
    return [...visibleServer, ...localCreated];
  }, [categoryCode, createdTasks, data.data, deletedIds, overrides]);

  useEffect(() => {
    if (!focusId) return;
    const target = document.getElementById(`record-${focusId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, tasks]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { PENDING: [], IN_PROGRESS: [], COMPLETED: [] };
    for (const task of tasks) grouped[task.status].push(task);
    for (const status of STATUSES) grouped[status] = sortTasks(grouped[status]);
    return grouped;
  }, [tasks]);

  const openCreate = () => { mutation.clearError(); setEditing(null); setDraft(emptyDraft(config.taskCategories.find((option) => option.active !== false)?.code ?? "")); setComposerOpen(true); };
  const openEdit = useCallback((task: Task) => { clearError(); setEditing(task); setDraft({ title: task.title, detail: task.detail ?? "", categoryCode: task.category.code, status: task.status, dueDate: task.dueDate ?? "" }); setComposerOpen(true); }, [clearError]);
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
    if (!draft.title.trim() || !draft.categoryCode || mutation.pending) return;
    try {
      const saved = editing
        ? await mutation.run(() => api.updateTask(editing.id, { title: draft.title.trim(), detail: draft.detail.trim(), categoryCode: draft.categoryCode, status: draft.status, dueDate: draft.dueDate || null }))
        : await mutation.run(() => api.createTask({ title: draft.title.trim(), detail: draft.detail.trim() || undefined, categoryCode: draft.categoryCode, status: draft.status, dueDate: draft.dueDate || null }));
      if (editing) setOverrides((current) => ({ ...current, [saved.id]: saved }));
      else setCreatedTasks((current) => [...current, saved]);
      setComposerOpen(false);
      invalidateApiQueryCache();
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
    setOverrides((current) => ({ ...current, [task.id]: { ...task, status: nextStatus } }));
    setPulsingStatus(nextStatus);
    setShakingIds((current) => [...current, task.id]);
    window.setTimeout(() => setShakingIds((current) => current.filter((id) => id !== task.id)), 360);
    clearDrag();
    try {
      const saved = await mutation.run(() => api.updateTask(task.id, { status: nextStatus }));
      setOverrides((current) => ({ ...current, [saved.id]: saved }));
      invalidateApiQueryCache();
    } catch {
      setOverrides((current) => ({ ...current, [previous.id]: previous }));
      setShakingIds((current) => current.includes(task.id) ? current : [...current, task.id]);
      window.setTimeout(() => setShakingIds((current) => current.filter((id) => id !== task.id)), 360);
    } finally {
      window.setTimeout(() => setPulsingStatus(null), 420);
    }
  }, [clearDrag, mutation]);

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

  const activeCategories = config.taskCategories.filter((option) => option.active !== false);
  const totalOpen = tasksByStatus.PENDING.length + tasksByStatus.IN_PROGRESS.length;

  return <div className="view view-tasks">
    <SectionHero section="tasks" onAction={openCreate} rightSlot={<div className="tasks-summary-card"><span className="eyebrow">TAREAS ABIERTAS</span><strong>{totalOpen}</strong><span>{tasksByStatus.PENDING.length} pendientes · {tasksByStatus.IN_PROGRESS.length} en proceso</span></div>} />
    <ModuleToolbar resultLabel={`${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`}><FilterPills active={categoryCode} options={[{ value: "all", label: "Todas" }, ...activeCategories.map((option) => ({ value: option.code, label: option.label }))]} onChange={setCategoryCode} /></ModuleToolbar>
    {mutation.error ? <div className="inline-error task-global-error" role="alert">{mutation.error.message || "No se pudo actualizar la tarea. Probá de nuevo."}</div> : null}
    {data.loading ? <SkeletonGrid count={3} /> : data.error ? <ErrorState onRetry={data.reload} /> : !tasks.length ? <EmptyState title="Todavía no hay tareas" description="Creá la primera y movela entre columnas a medida que avance." action="Crear tarea" onAction={openCreate} /> : <section className="tasks-board" aria-label="Tablero de tareas">
      {STATUSES.map((status) => <section className={`task-column ${dropTarget === status ? "task-column-drop-target" : ""} ${pulsingStatus === status ? "task-column-pulse" : ""}`} data-task-status-column={status} aria-labelledby={`task-column-${status}`} key={status}>
        <div className="task-column-heading"><div><span className="eyebrow">{STATUS_META[status].eyebrow}</span><h2 id={`task-column-${status}`}>{STATUS_META[status].label}</h2></div><span className="task-column-count">{tasksByStatus[status].length}</span></div>
        <div className="task-column-list">{tasksByStatus[status].length ? tasksByStatus[status].map((task) => <TaskCard key={task.id} task={task} onEdit={() => openEdit(task)} onDelete={() => setPendingDelete(task)} onStatusChange={(nextStatus) => void moveTask(task, nextStatus)} onPointerDown={(event) => handlePointerDown(event, task)} dragging={draggingId === task.id} shaking={shakingIds.includes(task.id)} />) : <div className="task-column-empty">Soltá una tarea acá</div>}</div>
      </section>)}
    </section>}
    {draggingId ? <div className="task-drag-ghost" style={{ left: pointer.x + 14, top: pointer.y + 14 }} aria-hidden="true">{tasks.find((task) => task.id === draggingId)?.title}</div> : null}
    {composerOpen ? <Dialog ariaLabel={editing ? "Editar tarea" : "Crear tarea"} onClose={closeComposer}><FormPanel eyebrow={editing ? "EDITAR TAREA" : "NUEVA TAREA"} title={editing ? "Editar tarea" : "Crear tarea"} description="Las tareas se guardan en tu espacio y podés moverlas cuando cambien de estado." onClose={closeComposer} onSubmit={() => void saveTask()}><div className="form-grid task-form-grid"><FormField label="Tarea" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Ej. Entregar el trabajo práctico" /><SelectField label="Categoría" value={draft.categoryCode} onChange={(value) => setDraft({ ...draft, categoryCode: value })} options={activeCategories.map((option) => ({ value: option.code, label: option.label }))} disabled={!activeCategories.length} /><FormField label="Detalle (opcional)" value={draft.detail} onChange={(detail) => setDraft({ ...draft, detail })} placeholder="Agregá contexto o el próximo paso" multiline /><SelectField label="Estado" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value as TaskStatus })} options={STATUSES.map((status) => ({ value: status, label: STATUS_META[status].label }))} /><label className="form-field"><span>Fecha límite (opcional)</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label></div>{mutation.error ? <div className="inline-error" role="alert">{mutation.error.message}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={closeComposer} disabled={mutation.pending}>Cancelar</Button><Button type="submit" disabled={mutation.pending || !draft.title.trim() || !draft.categoryCode}>{mutation.pending ? "Guardando..." : editing ? "Guardar cambios" : "Crear tarea"}<span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title={`¿Eliminar ${pendingDelete.title}?`} description="La tarea se quitará del tablero, pero la acción no modifica tus categorías." onCancel={() => setPendingDelete(null)} onConfirm={() => void removeTask()} /> : null}
  </div>;
}
