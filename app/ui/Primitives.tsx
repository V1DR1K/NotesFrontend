"use client";

import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { SECTION_META, type SectionKey } from "../config/sections";

const DialogCloseContext = createContext<(() => void) | null>(null);
const DialogDirtyContext = createContext<(() => void) | null>(null);

function useDialogHistory(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const dirtyRef = useRef(false);
  const suppressPopRef = useRef(false);
  const dialogId = useId();
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialogState = { ...window.history.state, notesDialogId: dialogId };
    window.history.pushState(dialogState, "", window.location.href);

    const handlePopState = () => {
      if (suppressPopRef.current) {
        suppressPopRef.current = false;
        onCloseRef.current();
        return;
      }
      if (dirtyRef.current) {
        window.history.pushState(dialogState, "", window.location.href);
        setDiscardPromptOpen(true);
        return;
      }
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.notesDialogId === dialogId) window.history.back();
    };
  }, [dialogId]);

  const closeHistoryEntry = useCallback(() => {
    if (window.history.state?.notesDialogId !== dialogId) {
      onCloseRef.current();
      return;
    }
    suppressPopRef.current = true;
    window.history.back();
  }, [dialogId]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) setDiscardPromptOpen(true);
    else closeHistoryEntry();
  }, [closeHistoryEntry]);

  return {
    requestClose,
    markDirty: useCallback(() => { dirtyRef.current = true; }, []),
    discardPromptOpen,
    cancelDiscard: useCallback(() => setDiscardPromptOpen(false), []),
    confirmDiscard: closeHistoryEntry,
  };
}

function DiscardChangesDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="discard-backdrop" role="presentation" onMouseDown={(event) => { event.stopPropagation(); onCancel(); }}>
      <div className="confirm-dialog discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="dialog-symbol">!</span>
        <span className="eyebrow">CAMBIOS SIN GUARDAR</span>
        <h2 id="discard-title">¿Salir sin guardar?</h2>
        <p>Lo que escribiste se va a perder. ¿Seguro que querés salir?</p>
        <div className="dialog-actions"><Button variant="quiet" onClick={onCancel}>Seguir editando</Button><Button variant="danger" onClick={onConfirm}>Salir sin guardar</Button></div>
      </div>
    </div>
  );
}

export type ButtonVariant = "accent" | "ghost" | "quiet" | "danger";

export function Button({
  children,
  variant = "accent",
  onClick,
  type = "button",
  disabled = false,
  className = "",
  ariaLabel,
  ariaHasPopup,
  ariaExpanded,
  ...buttonProps
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaHasPopup?: "dialog" | "menu" | "listbox" | true;
  ariaExpanded?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "disabled" | "className" | "onClick" | "aria-label" | "aria-haspopup" | "aria-expanded">) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  onClick,
  variant = "quiet",
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
}) {
  return (
    <button className={`icon-button icon-button-${variant}`} type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  compact = false,
  id,
  ...selectProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  compact?: boolean;
  id?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "id" | "children" | "className">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <label className={`field-label ${compact ? "field-label-compact" : ""}`} htmlFor={fieldId}>
      <span>{label}</span>
      <span className="select-wrap">
        <select id={fieldId} value={value} onChange={(event) => onChange(event.target.value)} {...selectProps}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select-chevron" aria-hidden="true">⌄</span>
      </span>
    </label>
  );
}

export function FilterPills({
  active,
  options,
  onChange,
}: {
  active: string;
  options: Array<{ value: string; label: string; count?: number }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="filter-pills" role="group" aria-label="Filtros">
      {options.map((option) => (
        <button
          className={`filter-pill ${active === option.value ? "filter-pill-active" : ""}`}
          type="button"
          aria-pressed={active === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {typeof option.count === "number" ? <span>{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function MultiSelectChips({
  selected,
  options,
  onChange,
  ariaLabel,
}: {
  selected: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (values: string[]) => void;
  ariaLabel: string;
}) {
  const markDialogDirty = useContext(DialogDirtyContext);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return (
    <div className="choice-chips" role="group" aria-label={ariaLabel}>
      {options.map((option) => <button className={`choice-chip ${selected.includes(option.value) ? "choice-chip-active" : ""}`} type="button" aria-pressed={selected.includes(option.value)} onClick={() => { markDialogDirty?.(); toggle(option.value); }} key={option.value}>{option.label}</button>)}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="pagination" aria-label="Paginación">
      <Button variant="quiet" onClick={() => onChange(page - 1)} disabled={page === 1} ariaLabel="Página anterior">
        ←
      </Button>
      <span className="pagination-copy"><strong>{String(page).padStart(2, "0")}</strong> / {String(pages).padStart(2, "0")}</span>
      <Button variant="quiet" onClick={() => onChange(page + 1)} disabled={page === pages} ariaLabel="Página siguiente">
        →
      </Button>
    </div>
  );
}

export function SectionHero({
  section,
  onAction,
  actionLabel,
  rightSlot,
}: {
  section: SectionKey;
  onAction?: () => void;
  actionLabel?: string;
  rightSlot?: ReactNode;
}) {
  const meta = SECTION_META[section];

  return (
    <section className="section-hero">
      <div className="hero-copy">
        <div className="eyebrow-row">
          <span className="hero-mark" aria-hidden="true">{meta.icon}</span>
          <span className="eyebrow">{meta.eyebrow}</span>
        </div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        {onAction ? <Button onClick={onAction}>{actionLabel ?? meta.action}<span aria-hidden="true">↗</span></Button> : null}
      </div>
      {rightSlot ? <div className="hero-sidecar">{rightSlot}</div> : null}
    </section>
  );
}

export function ModuleToolbar({
  children,
  resultLabel,
}: {
  children: ReactNode;
  resultLabel?: string;
}) {
  return (
    <div className="module-toolbar">
      <div className="toolbar-filters">{children}</div>
      {resultLabel ? <span className="toolbar-result">{resultLabel}</span> : null}
    </div>
  );
}

export function VisualTile({ emoji, label, className = "" }: { emoji: string; label: string; className?: string }) {
  return <div className={`visual-tile ${className}`} aria-label={label} role="img"><span>{emoji}</span></div>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  return (
    <article className="metric-card">
      <div className="metric-topline"><span className="metric-icon" aria-hidden="true">{icon}</span><span className="metric-label">{label}</span></div>
      <strong>{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

export function CardActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="card-actions">
      {onEdit ? <IconButton label="Editar" onClick={onEdit}>✎</IconButton> : null}
      {onDelete ? <IconButton label="Eliminar" onClick={onDelete} variant="danger">×</IconButton> : null}
    </div>
  );
}

export function StatusDot({ status }: { status: "green" | "yellow" | "red" }) {
  return <span className={`status-dot status-${status}`} aria-label={status === "green" ? "Día verde" : status === "yellow" ? "Día amarillo" : "Día rojo"} />;
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="state-panel">
      <span className="state-symbol">◌</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && onAction ? <Button variant="ghost" onClick={onAction}>{action} <span aria-hidden="true">↗</span></Button> : null}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <EmptyState title="Algo no cargó" description="Probá otra vez. Este estado queda listo para conectarse al backend." action="Reintentar" onAction={onRetry} />;
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-grid" aria-label="Cargando contenido" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => <div className="skeleton-card" key={index}><span /><span /><span /><span /></div>)}
    </div>
  );
}

export function FormField({ label, value, onChange, placeholder, multiline = false, id, ...fieldProps }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id" | "placeholder" | "className"> & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "id" | "placeholder" | "className">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <label className="form-field" htmlFor={fieldId}>
      <span>{label}</span>
      {multiline ? <textarea id={fieldId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} {...fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>} /> : <input id={fieldId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} {...fieldProps as InputHTMLAttributes<HTMLInputElement>} />}
    </label>
  );
}

export function FormPanel({ children, title, description, onClose, onSubmit, eyebrow = "NUEVO REGISTRO" }: { children: ReactNode; title: string; description: string; onClose: () => void; onSubmit?: () => void; eyebrow?: string }) {
  const dialogClose = useContext(DialogCloseContext);
  return (
    <form className="form-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit?.(); }}>
      <div className="form-panel-heading">
        <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
        <IconButton label="Cerrar formulario" onClick={dialogClose ?? onClose}>×</IconButton>
      </div>
      {children}
    </form>
  );
}

export function Dialog({ children, onClose, ariaLabel, trackChanges = true }: { children: ReactNode; onClose: () => void; ariaLabel: string; trackChanges?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialog = useDialogHistory(onClose);
  const { requestClose } = dialog;
  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\")]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [requestClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={dialog.requestClose}>
      <DialogCloseContext.Provider value={dialog.requestClose}>
        <DialogDirtyContext.Provider value={trackChanges ? dialog.markDirty : null}>
        <div ref={dialogRef} className="modal-dialog" role="dialog" aria-modal="true" aria-label={ariaLabel} onMouseDown={(event) => event.stopPropagation()} onInputCapture={trackChanges ? dialog.markDirty : undefined} onChangeCapture={trackChanges ? dialog.markDirty : undefined} onDropCapture={trackChanges ? dialog.markDirty : undefined}>
          {children}
        </div>
        </DialogDirtyContext.Provider>
      </DialogCloseContext.Provider>
      {dialog.discardPromptOpen ? <DiscardChangesDialog onCancel={dialog.cancelDiscard} onConfirm={dialog.confirmDiscard} /> : null}
    </div>
  );
}

export function ConfirmDialog({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useDialogHistory(onCancel);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousActiveElement?.focus(); };
  }, []);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={dialog.requestClose}>
      <div ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="dialog-symbol">×</span>
        <span className="eyebrow">ACCIÓN DELICADA</span>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions"><Button variant="quiet" onClick={dialog.requestClose}>Cancelar</Button><Button variant="danger" onClick={onConfirm}>Eliminar</Button></div>
      </div>
    </div>
  );
}
