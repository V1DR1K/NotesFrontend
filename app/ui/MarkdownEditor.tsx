"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useDialogDirty } from "./Primitives";

type TextRange = { start: number; end: number };
type MarkdownTool =
  | { label: string; name: string; type: "wrap"; before: string; after: string; placeholder: string }
  | { label: string; name: string; type: "line"; prefix: string };

const MARKDOWN_TOOLS: MarkdownTool[] = [
  { label: "B", name: "Negrita", type: "wrap", before: "**", after: "**", placeholder: "texto" },
  { label: "I", name: "Cursiva", type: "wrap", before: "*", after: "*", placeholder: "texto" },
  { label: "H2", name: "Título", type: "line", prefix: "## " },
  { label: "•", name: "Lista con viñetas", type: "line", prefix: "- " },
  { label: "1.", name: "Lista numerada", type: "line", prefix: "1. " },
  { label: "❝", name: "Cita", type: "line", prefix: "> " },
  { label: "↗", name: "Enlace", type: "wrap", before: "[", after: "](https://enlace)", placeholder: "texto del enlace" },
  { label: "</>", name: "Código", type: "wrap", before: "`", after: "`", placeholder: "código" },
];

export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder,
  preview,
  emptyPreview = "Escribí algo para ver la vista previa.",
  assistant,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  preview: ReactNode;
  emptyPreview?: string;
  assistant?: ReactNode;
}) {
  const [mobileView, setMobileView] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<TextRange | null>(null);
  const markDirty = useDialogDirty();

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const textarea = textareaRef.current;
    if (!selection || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  const insertTool = (tool: MarkdownTool) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    let nextValue: string;

    if (tool.type === "line") {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const selectedEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
      const nextLineBreak = value.indexOf("\n", selectedEnd);
      const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
      const block = value.slice(lineStart, lineEnd);
      const formatted = block.split("\n").map((line) => `${tool.prefix}${line}`).join("\n");
      nextValue = `${value.slice(0, lineStart)}${formatted}${value.slice(lineEnd)}`;
      pendingSelection.current = { start: lineStart, end: lineStart + formatted.length };
    } else {
      const selectedText = value.slice(start, end) || tool.placeholder;
      const inserted = `${tool.before}${selectedText}${tool.after}`;
      nextValue = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
      pendingSelection.current = { start: start + tool.before.length, end: start + tool.before.length + selectedText.length };
    }

    markDirty?.();
    onChange(nextValue);
  };

  return (
    <div className="markdown-editor" data-mobile-view={mobileView}>
      <div className="markdown-editor-mobile-tabs" role="group" aria-label="Vista del editor Markdown">
        <button className={mobileView === "write" ? "markdown-editor-tab markdown-editor-tab-active" : "markdown-editor-tab"} type="button" aria-pressed={mobileView === "write"} onClick={() => setMobileView("write")}>Escribir</button>
        <button className={mobileView === "preview" ? "markdown-editor-tab markdown-editor-tab-active" : "markdown-editor-tab"} type="button" aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")}>Vista previa</button>
      </div>
      <div className="markdown-editor-layout">
        <section className="markdown-editor-source" aria-label="Editor de Markdown">
          <div className="markdown-editor-toolbar" role="toolbar" aria-label="Formato Markdown">
            <div className="markdown-editor-tools">
              {MARKDOWN_TOOLS.map((tool) => <button className="markdown-editor-tool" type="button" key={tool.name} aria-label={tool.name} title={tool.name} onMouseDown={(event) => event.preventDefault()} onClick={() => insertTool(tool)}>{tool.label}</button>)}
            </div>
            {assistant}
          </div>
          <label className="form-field markdown-editor-field">
            <span>{label}</span>
            <textarea ref={textareaRef} className="markdown-editor-textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={12} />
          </label>
        </section>
        <section className="markdown-editor-preview" aria-label="Vista previa del contenido">
          <span className="markdown-editor-preview-label eyebrow">VISTA PREVIA</span>
          <div className="markdown-editor-preview-content">
            {value.trim() ? preview : <p className="note-markdown-empty">{emptyPreview}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
