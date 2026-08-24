"use client";

import { SECTION_META, type SectionKey } from "../../config/sections";
import { dateLabel, formatARS } from "../../lib/presentation";
import { Button, ErrorState, MetricCard, SectionHero, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { useDashboardData } from "./useDashboardData";

export function DashboardView({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  const { data, loading, error, reload } = useDashboardData();
  const counters = data?.counters ?? {};
  const counter = (...names: string[]) => { for (const name of names) if (counters[name] !== undefined) return counters[name]; return "—"; };
  const recentNote = data?.recentNotes?.[0];
  const activities = [
    recentNote ? { section: "notes" as const, title: "Nota actualizada", detail: `${recentNote.title} · ${dateLabel(recentNote.date, true)}` } : null,
    data?.recentMovements?.[0] ? { section: "finances" as const, title: "Movimiento registrado", detail: `${data.recentMovements[0].item?.label ?? data.recentMovements[0].itemCode} · ${dateLabel(data.recentMovements[0].date, true)}` } : null,
    data?.recentFiles?.[0] ? { section: "files" as const, title: "Archivo agregado", detail: `${data.recentFiles[0].name} · ${dateLabel(data.recentFiles[0].uploadedAt, true)}` } : null,
  ].filter(Boolean) as Array<{ section: Exclude<SectionKey, "overview" | "day">; title: string; detail: string }>;
  const summary = data?.financeSummary;
  const cash = typeof summary?.cash === "object" && summary.cash !== null ? summary.cash.ars : summary?.cash;
  return <div className="view view-overview">
    <SectionHero section="overview" onAction={() => onNavigate("day")} actionLabel="Empezar a anotar" rightSlot={<div className="hero-note-card"><span className="eyebrow">UNA PREGUNTA PARA HOY</span><p>¿Qué te gustaría que tu yo de mañana recuerde de este día?</p><span className="hero-note-footer">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit", year: "2-digit" }).toUpperCase()} <span>✦</span></span></div>} />
    {loading ? <SkeletonGrid count={4} /> : error ? <ErrorState onRetry={reload} /> : <>
      <section className="overview-section"><div className="section-heading-row"><div><span className="eyebrow">TUS ESPACIOS</span><h2>Todo en su lugar.</h2></div><span className="heading-meta">04 MÓDULOS ACTIVOS <span>·</span> DATOS REALES</span></div><div className="module-grid">
         {[{ section: "day" as const, count: counter("days", "dayEntries", "dayCount"), detail: data?.recentDays?.[0] ? `Último: ${dateLabel(data.recentDays[0].date)}` : "Sin registros todavía", accentText: "Estado de ánimo" }, { section: "finances" as const, count: cash !== undefined ? formatARS(cash) : counter("movements", "movementCount"), detail: "Caja disponible", accentText: "Este mes" }, { section: "files" as const, count: counter("files", "fileCount"), detail: data?.recentFiles?.[0]?.name ?? "Sin archivos todavía", accentText: "Repositorio" }, { section: "notes" as const, count: counter("notes", "noteCount"), detail: data?.recentNotes?.[0]?.title ?? "Sin notas todavía", accentText: "Pensamientos" }].map((card) => <button className="module-card" type="button" onClick={() => onNavigate(card.section)} key={card.section}><div className="module-card-top"><VisualTile emoji={SECTION_META[card.section].icon} label={SECTION_META[card.section].label} /><span className="module-card-arrow">↗</span></div><div className="module-card-copy"><span className="eyebrow">{card.accentText}</span><h3>{SECTION_META[card.section].label}</h3><p>{card.detail}</p></div><div className="module-card-bottom"><strong>{String(card.count)}</strong><span>{card.accentText}</span></div></button>)}
      </div></section>
      <section className="overview-lower"><article className="focus-panel"><div className="panel-heading"><div><span className="eyebrow">FOCO DE HOY</span><h2>Una cosa a la vez.</h2></div><span className="panel-index">01</span></div><p>Tu espacio no tiene que estar perfecto. Solo tiene que ser un lugar al que te den ganas de volver.</p><div className="focus-line"><span className="focus-check">✓</span><span>Registrar cómo estuvo el día</span><span className="focus-tag">SUGERIDO</span></div><Button variant="ghost" onClick={() => onNavigate("day")}>Abrir Mi día <span aria-hidden="true">↗</span></Button></article><article className="activity-panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVIDAD RECIENTE</span><h2>Lo último.</h2></div><span className="panel-index">02</span></div><div className="activity-list">{activities.length ? activities.map((activity) => <button type="button" onClick={() => onNavigate(activity.section)} key={`${activity.section}-${activity.detail}`}><span className="activity-icon">{activity.icon}</span><span><strong>{activity.title}</strong><small>{activity.detail}</small></span><span className="activity-arrow">→</span></button>) : <p className="activity-empty">Todavía no hay actividad reciente.</p>}</div></article></section>
      <section className="metric-grid overview-metrics"><MetricCard label="REGISTROS DEL MES" value={String(counter("records", "recordCount"))} detail="Desde tu cuaderno" icon="↗" /><MetricCard label="DÍAS EN VERDE" value={String(counter("greenDays", "greenDayCount"))} detail="Según tus registros" icon="☀" /><MetricCard label="NOTAS SIN LEER" value={String(counter("unreadNotes", "unreadNoteCount"))} detail="Ideas esperando" icon="✎" /></section>
    </>}
  </div>;
}
