"use client";

import { useState } from "react";
import type { ApiConfig, ApiOption, ConfigKind, FinanceItemType } from "../../lib/api/types";
import { invalidateApiQueryCache } from "../../lib/api/hooks";
import { api } from "../../lib/api/client";
import { sortCategoryOptions } from "../../lib/categories";
import { Button, ConfirmDialog, Dialog, FormField, FormPanel, IconButton, SectionHero, SelectField } from "../../ui/Primitives";

type ConfigKey = "dayStatuses" | "dayFeelings" | "financeItems" | "categories" | "projects";
type ConfigGroup = { kind: ConfigKind; key: ConfigKey; label: string; description: string; emoji: boolean; fixed?: boolean };
type Draft = { label: string; emoji: string; sortOrder: string; active: boolean; financeType: FinanceItemType; projectCode: string };

const GROUPS: ConfigGroup[] = [
  { kind: "day-statuses", key: "dayStatuses", label: "Semáforo del día", description: "Los tres colores fijos para describir el balance general del día.", emoji: true, fixed: true },
  { kind: "day-feelings", key: "dayFeelings", label: "Sensaciones", description: "Las opciones que aparecen al registrar cómo te sentiste.", emoji: false },
  { kind: "finance-items", key: "financeItems", label: "Clasificaciones financieras", description: "Las opciones disponibles para registrar cada movimiento.", emoji: false },
  { kind: "projects", key: "projects", label: "Proyectos", description: "Espacios para reunir tareas, notas, archivos y eventos de agenda.", emoji: false },
  { kind: "categories", key: "categories", label: "Categorías por proyecto", description: "Las mismas categorías se comparten entre tareas, notas y eventos.", emoji: false },
];

const emptyDraft = (projectCode = "personal"): Draft => ({ label: "", emoji: "", sortOrder: "0", active: true, financeType: "EXPENSE", projectCode });

export function SettingsView({ config, onConfigChanged }: { config: ApiConfig; onConfigChanged: (config: ApiConfig) => void }) {
  const [editing, setEditing] = useState<{ group: ConfigGroup; option?: ApiOption } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pendingDelete, setPendingDelete] = useState<{ group: ConfigGroup; option: ApiOption } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<ConfigKind>>(() => new Set());

  const setGroupExpanded = (kind: ConfigKind, expanded: boolean) => setExpandedGroups((current) => {
    if (current.has(kind) === expanded) return current;
    const next = new Set(current);
    if (expanded) next.add(kind); else next.delete(kind);
    return next;
  });

  const openCreate = (group: ConfigGroup) => { setGroupExpanded(group.kind, true); setError(""); setDraft(emptyDraft(config.projects.find((item) => item.active !== false)?.code ?? "personal")); setEditing({ group }); };
  const openEdit = (group: ConfigGroup, option: ApiOption) => { setError(""); setDraft({ label: option.label, emoji: option.emoji ?? "", sortOrder: String(option.sortOrder ?? 0), active: option.active !== false, financeType: option.financeType ?? "EXPENSE", projectCode: option.projectCode ?? "personal" }); setEditing({ group, option }); };
  const closeEditor = () => { if (!saving) setEditing(null); };
  const save = async () => {
    if (!editing || !draft.label.trim()) return;
    setSaving(true);
    setError("");
    try {
      const financeType = editing.group.kind === "finance-items" ? draft.financeType : undefined;
      if (editing.group.kind === "categories") {
        if (editing.option) await api.updateCategory(editing.option.id!, { label: draft.label.trim(), active: draft.active, projectCode: draft.projectCode });
        else await api.createCategory({ label: draft.label.trim(), sortOrder: 0, active: draft.active, projectCode: draft.projectCode });
      } else if (editing.option) await api.updateConfigOption(editing.group.kind, editing.option.code, { label: draft.label.trim(), emoji: editing.group.emoji ? draft.emoji.trim() : undefined, sortOrder: Number(draft.sortOrder) || 0, active: draft.active, financeType });
      else await api.createConfigOption(editing.group.kind, { label: draft.label.trim(), emoji: editing.group.emoji ? draft.emoji.trim() : undefined, sortOrder: Number(draft.sortOrder) || 0, active: draft.active, financeType });
       invalidateApiQueryCache(); onConfigChanged(await api.config());
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la configuración.");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!pendingDelete || saving || deleting) return;
    setDeleting(true);
    try { if (pendingDelete.group.kind === "categories") await api.deleteCategory(pendingDelete.option.id!); else await api.deleteConfigOption(pendingDelete.group.kind, pendingDelete.option.code); invalidateApiQueryCache(); onConfigChanged(await api.config()); setPendingDelete(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo eliminar la opción."); }
    finally { setDeleting(false); }
  };

  return <div className="view settings-view">
    <SectionHero section="settings" rightSlot={<div className="settings-note"><span className="eyebrow">TODO A TU MEDIDA</span><strong>La configuración también es parte del cuaderno.</strong><span>Los cambios se guardan en tu espacio y alimentan formularios y filtros.</span></div>} />
    {error && !editing ? <div className="inline-error" role="alert">{error}</div> : null}
    <div className="settings-grid">
      {GROUPS.map((group) => {
       const rawOptions = config[group.key] as ApiOption[];
       const options = group.kind === "categories" ? sortCategoryOptions(rawOptions) : [...rawOptions].sort((left, right) => (left.projectCode ?? "").localeCompare(right.projectCode ?? "") || (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.label.localeCompare(right.label, "es", { sensitivity: "base" }));
        const protectedOption = (option: ApiOption) => group.kind === "finance-items" && option.code.toLowerCase() === "transferencia";
        const renderOption = (option: ApiOption) => {
          const metadata = [option.financeType ? option.financeType === "INCOME" ? "ingreso" : option.financeType === "EXPENSE" ? "egreso" : "transferencia" : null, option.active === false ? "inactivo" : null].filter(Boolean).join(" · ");
          return <div className={`settings-row ${option.active === false ? "settings-row-inactive" : ""}`} key={option.id ?? option.code}>
          <div className="settings-option-mark">{group.emoji && option.emoji ? option.emoji : <span>◆</span>}</div>
          <div className="settings-option-copy"><strong>{option.label}</strong>{metadata ? <span>{metadata}</span> : null}</div>
          {!group.fixed && !protectedOption(option) ? <div className="settings-row-actions"><IconButton label={`Editar ${option.label}`} onClick={() => openEdit(group, option)}>✎</IconButton>{!(group.kind === "projects" && option.code.toLowerCase() === "personal") ? <IconButton label={`Eliminar ${option.label}`} onClick={() => { setError(""); setPendingDelete({ group, option }); }} variant="danger">×</IconButton> : null}</div> : null}
        </div>;
        };
        const categoryGroups = group.kind === "categories" ? config.projects.map((project) => ({ project, categories: options.filter((option) => option.projectCode === project.code) })).filter((item) => item.categories.length) : [];
        return <section className="settings-group" key={group.kind}>
          <div className="settings-group-top">
            <details className="settings-group-disclosure" open={expandedGroups.has(group.kind)} onToggle={(event) => setGroupExpanded(group.kind, event.currentTarget.open)}>
              <summary className="settings-group-heading"><div><span className="eyebrow">CONFIGURACIÓN</span><h2>{group.label}</h2><p>{group.description}</p></div><span className="settings-group-count">{options.length} {group.kind === "categories" ? options.length === 1 ? "categoría" : "categorías" : options.length === 1 ? "opción" : "opciones"}</span></summary>
              <div className="settings-list">
                {options.length ? group.kind === "categories" ? categoryGroups.map(({ project, categories }) => <details className="settings-category-project" key={project.code}><summary><h3>{project.label}</h3><span>{categories.length} {categories.length === 1 ? "categoría" : "categorías"}</span></summary><div className="settings-category-project-list">{categories.map(renderOption)}</div></details>) : options.map(renderOption) : <p className="settings-empty">Todavía no hay opciones configuradas.</p>}
              </div>
            </details>
            <div className="settings-group-actions">{group.fixed ? <span className="settings-fixed-label">FIJO</span> : <Button variant="ghost" onClick={() => openCreate(group)}>+ Agregar</Button>}</div>
          </div>
        </section>;
      })}
    </div>
    {editing ? <Dialog ariaLabel={`${editing.option ? "Editar" : "Agregar"} ${editing.group.label.toLowerCase()}`} onClose={closeEditor}><FormPanel eyebrow={editing.option ? "EDITAR OPCIÓN" : "NUEVA OPCIÓN"} onSubmit={() => void save()} title={editing.option ? `Editar ${editing.group.label.toLowerCase()}` : `Agregar ${editing.group.label.toLowerCase()}`} description={editing.group.kind === "categories" && editing.option ? "Al cambiar el proyecto, las tareas, notas y eventos de esta categoría también se moverán." : "Este cambio se verá en los formularios y filtros de tu cuaderno."} onClose={closeEditor}>
       <div className="settings-form-fields">{editing.group.kind === "categories" ? <SelectField label="Proyecto" value={draft.projectCode} onChange={(projectCode) => setDraft({ ...draft, projectCode })} options={config.projects.filter((project) => project.active !== false || project.code === draft.projectCode).map(({ code, label }) => ({ value: code, label }))} /> : null}<FormField label="Nombre" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} placeholder="Ej. Reuniones" />{editing.group.kind === "finance-items" ? <SelectField label="Tipo de movimiento" id="settings-finance-type" value={draft.financeType} onChange={(financeType) => setDraft({ ...draft, financeType: financeType as FinanceItemType })} options={[{ value: "INCOME", label: "Ingreso" }, { value: "EXPENSE", label: "Egreso" }, { value: "TRANSFER", label: "Transferencia" }]} disabled={editing.option?.code.toLowerCase() === "transferencia"} /> : null}{editing.group.emoji ? <FormField label="Símbolo" value={draft.emoji} onChange={(emoji) => setDraft({ ...draft, emoji })} placeholder="Ej. ✦" /> : null}{editing.group.kind !== "categories" ? <label className="form-field" htmlFor="settings-order"><span>Orden</span><input id="settings-order" type="number" inputMode="numeric" min="0" step="1" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></label> : null}<label className="settings-active"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} disabled={editing.option?.code.toLowerCase() === "transferencia" || (editing.group.kind === "projects" && editing.option?.code.toLowerCase() === "personal")} /><span>Disponible en formularios y filtros</span></label></div>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={closeEditor} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || !draft.label.trim() || (editing.group.kind === "categories" && !draft.projectCode)}>{saving ? "Guardando..." : "Guardar opción"}<span aria-hidden="true">↗</span></Button></div>
    </FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title={`¿Eliminar ${pendingDelete.option.label}?`} description={pendingDelete.group.kind === "projects" ? "Podés eliminar este proyecto cuando ya no tenga tareas, notas, archivos ni eventos asociados." : "La opción dejará de aparecer en formularios y filtros. Los registros históricos conservarán la opción asociada."} onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
