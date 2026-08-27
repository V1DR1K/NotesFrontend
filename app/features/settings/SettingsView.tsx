"use client";

import { useState } from "react";
import type { ApiConfig, ApiOption, ConfigKind, FinanceItemType } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { Button, ConfirmDialog, Dialog, FormField, FormPanel, IconButton, SectionHero, SelectField } from "../../ui/Primitives";

type ConfigKey = "dayStatuses" | "dayFeelings" | "financeItems" | "noteCategories";
type ConfigGroup = { kind: ConfigKind; key: ConfigKey; label: string; description: string; emoji: boolean; fixed?: boolean };
type Draft = { code: string; label: string; emoji: string; sortOrder: string; active: boolean; financeType: FinanceItemType };

const GROUPS: ConfigGroup[] = [
  { kind: "day-statuses", key: "dayStatuses", label: "Semáforo del día", description: "Los tres colores fijos para describir el balance general del día.", emoji: true, fixed: true },
  { kind: "day-feelings", key: "dayFeelings", label: "Sensaciones", description: "Las opciones que aparecen al registrar cómo te sentiste.", emoji: false },
  { kind: "finance-items", key: "financeItems", label: "Clasificaciones financieras", description: "Las opciones disponibles para registrar cada movimiento.", emoji: false },
  { kind: "note-categories", key: "noteCategories", label: "Categorías de notas", description: "Las etiquetas disponibles para tus ideas.", emoji: false },
];

const emptyDraft = (): Draft => ({ code: "", label: "", emoji: "", sortOrder: "0", active: true, financeType: "EXPENSE" });

export function SettingsView({ config, onConfigChanged }: { config: ApiConfig; onConfigChanged: (config: ApiConfig) => void }) {
  const [editing, setEditing] = useState<{ group: ConfigGroup; option?: ApiOption } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pendingDelete, setPendingDelete] = useState<{ group: ConfigGroup; option: ApiOption } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const openCreate = (group: ConfigGroup) => { setError(""); setDraft(emptyDraft()); setEditing({ group }); };
  const openEdit = (group: ConfigGroup, option: ApiOption) => { setError(""); setDraft({ code: option.code, label: option.label, emoji: option.emoji ?? "", sortOrder: String(option.sortOrder ?? 0), active: option.active !== false, financeType: option.financeType ?? "EXPENSE" }); setEditing({ group, option }); };
  const closeEditor = () => { if (!saving) setEditing(null); };
  const save = async () => {
    if (!editing || !draft.label.trim() || (!editing.option && !draft.code.trim())) return;
    setSaving(true);
    setError("");
    try {
      const financeType = editing.group.kind === "finance-items" ? draft.financeType : undefined;
      if (editing.option) await api.updateConfigOption(editing.group.kind, editing.option.code, { label: draft.label.trim(), emoji: editing.group.emoji ? draft.emoji.trim() : undefined, sortOrder: Number(draft.sortOrder) || 0, active: draft.active, financeType });
      else await api.createConfigOption(editing.group.kind, { code: draft.code.trim().toLowerCase().replace(/\s+/g, "_"), label: draft.label.trim(), emoji: editing.group.emoji ? draft.emoji.trim() : undefined, sortOrder: Number(draft.sortOrder) || 0, active: draft.active, financeType });
      onConfigChanged(await api.config());
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la configuración.");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!pendingDelete || saving || deleting) return;
    setDeleting(true);
    try { await api.deleteConfigOption(pendingDelete.group.kind, pendingDelete.option.code); onConfigChanged(await api.config()); setPendingDelete(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo eliminar la opción."); }
    finally { setDeleting(false); }
  };

  return <div className="view settings-view">
    <SectionHero section="settings" rightSlot={<div className="settings-note"><span className="eyebrow">TODO A TU MEDIDA</span><strong>La configuración también es parte del cuaderno.</strong><span>Los cambios se guardan en tu espacio y alimentan formularios y filtros.</span></div>} />
    <div className="settings-grid">
      {GROUPS.map((group) => {
       const options = config[group.key] as ApiOption[];
        const protectedOption = (option: ApiOption) => group.kind === "finance-items" && option.code.toLowerCase() === "transferencia";
        return <section className="settings-group" key={group.kind}>
           <div className="settings-group-heading"><div><span className="eyebrow">CONFIGURACIÓN</span><h2>{group.label}</h2><p>{group.description}</p></div>{group.fixed ? <span className="settings-fixed-label">FIJO</span> : <Button variant="ghost" onClick={() => openCreate(group)}>+ Agregar</Button>}</div>
          <div className="settings-list">
            {options.length ? options.map((option) => <div className={`settings-row ${option.active === false ? "settings-row-inactive" : ""}`} key={option.code}>
              <div className="settings-option-mark">{group.emoji && option.emoji ? option.emoji : <span>◆</span>}</div>
               <div className="settings-option-copy"><strong>{option.label}</strong><span>{option.code}{option.financeType ? ` · ${option.financeType === "INCOME" ? "ingreso" : option.financeType === "EXPENSE" ? "egreso" : "transferencia"}` : ""}{option.active === false ? " · inactivo" : ""}</span></div>
                {!group.fixed && !protectedOption(option) ? <div className="settings-row-actions"><IconButton label={`Editar ${option.label}`} onClick={() => openEdit(group, option)}>✎</IconButton><IconButton label={`Eliminar ${option.label}`} onClick={() => setPendingDelete({ group, option })} variant="danger">×</IconButton></div> : null}
            </div>) : <p className="settings-empty">Todavía no hay opciones configuradas.</p>}
          </div>
        </section>;
      })}
    </div>
    {editing ? <Dialog ariaLabel={`${editing.option ? "Editar" : "Agregar"} ${editing.group.label.toLowerCase()}`} onClose={closeEditor}><FormPanel eyebrow={editing.option ? "EDITAR OPCIÓN" : "NUEVA OPCIÓN"} onSubmit={() => void save()} title={editing.option ? `Editar ${editing.group.label.toLowerCase()}` : `Agregar ${editing.group.label.toLowerCase()}`} description="Este cambio se verá en los formularios y filtros de tu cuaderno." onClose={closeEditor}>
       <div className="settings-form-grid"><FormField label="Nombre visible" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} placeholder="Ej. Personal" />{editing.option ? <label className="form-field" htmlFor="settings-code"><span>Código</span><input id="settings-code" value={draft.code} readOnly /></label> : <FormField label="Código interno" value={draft.code} onChange={(code) => setDraft({ ...draft, code })} placeholder="Ej. personal" />}{editing.group.kind === "finance-items" ? <SelectField label="Tipo de movimiento" id="settings-finance-type" value={draft.financeType} onChange={(financeType) => setDraft({ ...draft, financeType: financeType as FinanceItemType })} options={[{ value: "INCOME", label: "Ingreso" }, { value: "EXPENSE", label: "Egreso" }, { value: "TRANSFER", label: "Transferencia" }]} disabled={editing.option?.code.toLowerCase() === "transferencia"} /> : null}{editing.group.emoji ? <FormField label="Símbolo" value={draft.emoji} onChange={(emoji) => setDraft({ ...draft, emoji })} placeholder="Ej. ✦" /> : null}<label className="form-field" htmlFor="settings-order"><span>Orden</span><input id="settings-order" type="number" inputMode="numeric" min="0" step="1" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></label><label className="settings-active"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} disabled={editing.option?.code.toLowerCase() === "transferencia"} /><span>Disponible en formularios y filtros</span></label></div>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={closeEditor} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || !draft.label.trim() || (!editing.option && !draft.code.trim())}>{saving ? "Guardando..." : "Guardar opción"}<span aria-hidden="true">↗</span></Button></div>
    </FormPanel></Dialog> : null}
    {pendingDelete ? <ConfirmDialog title={`¿Eliminar ${pendingDelete.option.label}?`} description="La opción dejará de aparecer en formularios y filtros. Los registros históricos conservarán su código." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
  </div>;
}
