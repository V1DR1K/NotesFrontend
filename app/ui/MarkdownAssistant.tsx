"use client";

import { useEffect, useRef, useState } from "react";
import type { MarkdownKind } from "../lib/api/types";
import { api } from "../lib/api/client";
import { Button } from "./Primitives";

export function MarkdownAssistant({ kind, title, content, onGenerated }: {
  kind: MarkdownKind;
  title: string;
  content: string;
  onGenerated: (markdown: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ signature: string; message: string } | null>(null);
  const sourceRef = useRef({ kind, title, content });
  useEffect(() => { sourceRef.current = { kind, title, content }; }, [kind, title, content]);
  const signature = JSON.stringify([kind, title, content]);
  const error = failure?.signature === signature ? failure.message : "";

  const generate = async () => {
    if (!content.trim() || pending) return;
    setFailure(null);
    setPending(true);
    try {
      const markdown = await api.formatMarkdown({ kind, title: title.trim(), content });
      const latest = sourceRef.current;
      if (latest.kind !== kind || latest.title !== title || latest.content !== content) {
        setFailure({ signature: JSON.stringify([latest.kind, latest.title, latest.content]), message: "El texto cambió mientras Gemini lo organizaba. Volvé a intentarlo para incluir esos cambios." });
        return;
      }
      onGenerated(markdown);
    } catch (reason) {
      setFailure({ signature, message: reason instanceof Error ? reason.message : "No se pudo organizar el contenido. Intentá de nuevo." });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="markdown-assistant">
      <Button variant="quiet" onClick={() => void generate()} disabled={pending || !content.trim()}>
        {pending ? "Organizando…" : "Organizar con Gemini"}
      </Button>
      <p className="markdown-assistant-hint">Gemini propone títulos y secciones; no reescribe el contenido.</p>
      {error ? <p className="markdown-assistant-error" role="alert">{error}</p> : null}
    </div>
  );
}
