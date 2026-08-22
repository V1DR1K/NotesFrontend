"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { SearchResult } from "../lib/api/types";
import { api } from "../lib/api/client";
import { dateLabel } from "../lib/presentation";
import { Dialog } from "../ui/Primitives";
import type { SectionKey } from "../config/sections";

const sectionLabels: Record<SearchResult["section"], string> = { day: "Mi día", finances: "Finanzas", files: "Archivos", notes: "Notas" };

export function SearchPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (section: SectionKey) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const cleanQuery = deferredQuery.trim().slice(0, 120);
  const loading = cleanQuery.length >= 2 && resolvedQuery !== cleanQuery;
  const visibleError = resolvedQuery === cleanQuery ? error : "";

  useEffect(() => {
    if (cleanQuery.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => { void api.search(cleanQuery).then((next) => { if (!cancelled) { setResults(next); setError(""); setResolvedQuery(cleanQuery); } }).catch((reason) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : "No se pudo buscar."); setResolvedQuery(cleanQuery); } }); }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [cleanQuery]);

  const select = (result: SearchResult) => {
    onClose();
    queueMicrotask(() => onNavigate(result.section));
  };

  return <Dialog ariaLabel="Buscar en tu cuaderno" trackChanges={false} onClose={onClose}>
    <section className="search-dialog">
      <div className="search-dialog-heading"><div><span className="eyebrow">BUSCAR EN TODO</span><h2>Encontrá lo que necesitás.</h2></div><span className="search-dialog-mark">⌕</span></div>
      <label className="search-input-field" htmlFor="global-search"><span className="visually-hidden">Buscar</span><input id="global-search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Notas, días, movimientos, archivos..." /></label>
      <div className="search-results" aria-live="polite">
        {query.trim().length < 2 ? <p className="search-state">Escribí al menos dos caracteres para buscar.</p> : loading ? <p className="search-state">Buscando en tu cuaderno...</p> : visibleError ? <p className="search-state search-state-error">{visibleError}</p> : results.length ? results.map((result) => <button type="button" className="search-result" onClick={() => select(result)} key={`${result.section}-${result.id}`}><span className="search-result-icon">{result.section === "notes" ? "✎" : result.section === "day" ? "☀" : result.section === "finances" ? "$" : "↗"}</span><span className="search-result-copy"><strong>{result.title}</strong><small>{sectionLabels[result.section]}{result.date ? ` · ${dateLabel(result.date, true)}` : ""}</small><span>{result.detail}</span></span><span className="search-result-arrow">→</span></button>) : <p className="search-state">No encontramos resultados para “{query.trim()}”.</p>}
      </div>
    </section>
  </Dialog>;
}
