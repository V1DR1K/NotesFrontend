"use client";

import { SECTION_META, type SectionKey } from "../../config/sections";
import type { Dashboard as DashboardData } from "../../lib/api/types";
import { dateLabel, formatARS, formatUSD, weekdayLabel } from "../../lib/presentation";
import { Button, ErrorState, SectionHero, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { useDashboardData } from "./useDashboardData";

type DashboardActivity = NonNullable<DashboardData["recentActivity"]>[number];

function moneyARS(value: { ars?: number | string } | number | string | undefined) {
  return formatARS(typeof value === "object" && value !== null ? value.ars : value);
}

function moneyUSD(value: { usd?: number | string } | undefined) {
  return value?.usd === undefined ? "Conversión pendiente" : formatUSD(value.usd);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function activityIcon(section: DashboardActivity["section"]) { return SECTION_META[section].icon; }

export function DashboardView({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  const { data, loading, error, reload } = useDashboardData();
  const today = data?.dayStats?.today;
  const dayStats = data?.dayStats;
  const finance = data?.financeSnapshot;
  const upcomingEvents = data?.upcomingEvents ?? [];
  const activities = data?.recentActivity ?? [];
  const storage = data?.storageUsage;
  const storagePercent = storage && storage.quotaBytes > 0 ? Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100) : 0;
  const todayCopy = today ? today.analysisStatus === "COMPLETED" ? today.status?.label ?? "Día analizado" : "Análisis pendiente" : "Todavía no registraste hoy";
  const nextEvent = upcomingEvents[0];

  return <div className="view view-overview">
    <SectionHero section="overview" onAction={() => onNavigate(today ? "calendar" : "day")} actionLabel={today ? "Ver agenda" : "Registrar mi día"} rightSlot={<div className="hero-note-card dashboard-hero-card"><span className="eyebrow">UNA MIRADA PARA HOY</span><p>{today ? `${weekdayLabel(today.date)} quedó guardado como ${todayCopy.toLowerCase()}.` : "Dale un lugar a lo que pasó y a lo que viene."}</p><span className="hero-note-footer">{new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toUpperCase()} <span>✦</span></span></div>} />
    {loading ? <SkeletonGrid count={4} /> : error ? <ErrorState onRetry={reload} /> : <>
      <section className="dashboard-signal-grid" aria-label="Resumen de hoy">
        <button type="button" className="dashboard-signal dashboard-signal-day" onClick={() => onNavigate("day")}><span className="eyebrow">HOY</span><strong>{today ? todayCopy : "Sin registro"}</strong><span>{today ? weekdayLabel(today.date) : "Mi día está esperando"}</span><span className="dashboard-signal-icon">☀</span></button>
        <button type="button" className="dashboard-signal dashboard-signal-calendar" onClick={() => onNavigate("calendar")}><span className="eyebrow">PRÓXIMO EVENTO</span><strong>{nextEvent?.description ?? "Agenda despejada"}</strong><span>{nextEvent ? `${dateLabel(nextEvent.date)} · ${nextEvent.category.label}` : "No hay eventos en los próximos 14 días"}</span><span className="dashboard-signal-icon">▦</span></button>
        <button type="button" className="dashboard-signal dashboard-signal-finance" onClick={() => onNavigate("finances")}><span className="eyebrow">CAJA ACTUAL</span><strong>{moneyARS(finance?.currentCash)}</strong><span>{moneyUSD(finance?.currentCash)}</span><span className="dashboard-signal-icon">$</span></button>
        <button type="button" className="dashboard-signal dashboard-signal-pending" onClick={() => onNavigate("day")}><span className="eyebrow">PENDIENTES</span><strong>{dayStats?.pendingAnalysis ?? 0}</strong><span>{dayStats?.pendingAnalysis === 1 ? "día por analizar" : "días por analizar"}</span><span className="dashboard-signal-icon">◌</span></button>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-agenda-panel"><div className="panel-heading"><div><span className="eyebrow">CALENDARIO / PRÓXIMOS 14 DÍAS</span><h2>Lo que viene.</h2></div><button type="button" className="panel-link" onClick={() => onNavigate("calendar")}>Ver todo ↗</button></div>{upcomingEvents.length ? <div className="dashboard-event-list">{upcomingEvents.slice(0, 4).map((event) => <button type="button" className="dashboard-event-row" key={event.id} onClick={() => onNavigate("calendar")}><span className="dashboard-event-date"><strong>{new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(new Date(`${event.date}T12:00:00`))}</strong><small>{new Intl.DateTimeFormat("es-AR", { month: "short" }).format(new Date(`${event.date}T12:00:00`)).replace(".", "")}</small></span><span className="dashboard-event-copy"><strong>{event.description}</strong><small>{event.category.label}</small></span><span className="activity-arrow">→</span></button>)}</div> : <p className="dashboard-empty-copy">No hay eventos próximos. Tu agenda tiene espacio para algo importante.</p>}<Button variant="ghost" onClick={() => onNavigate("calendar")}>Abrir Calendario <span aria-hidden="true">↗</span></Button></article>
        <article className="dashboard-panel dashboard-finance-panel"><div className="panel-heading"><div><span className="eyebrow">FINANZAS / MES ACTUAL</span><h2>El dinero, claro.</h2></div><button type="button" className="panel-link" onClick={() => onNavigate("finances")}>Abrir ↗</button></div><div className="dashboard-finance-balance"><span>Patrimonio registrado</span><strong>{moneyARS(finance?.currentCash) + " + " + moneyARS(finance?.currentInvested)}</strong><small>caja + inversiones</small></div><div className="dashboard-finance-stats"><div><span>Ingresos</span><strong>{moneyARS(finance?.monthIncome)}</strong></div><div><span>Egresos</span><strong>{moneyARS(finance?.monthExpense)}</strong></div></div><span className="dashboard-finance-rate">DÓLAR PROMEDIO · {finance?.exchangeRate ? moneyARS(finance.exchangeRate.average) : "Sin cotización"}</span></article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="dashboard-panel dashboard-focus-panel"><div className="panel-heading"><div><span className="eyebrow">FOCO DE HOY</span><h2>{today ? "Tu día ya tiene una marca." : "Una cosa a la vez."}</h2></div><span className="panel-index">01</span></div><p>{today ? today.description : "Tu espacio no tiene que estar perfecto. Solo tiene que ser un lugar al que te den ganas de volver."}</p><div className="focus-line"><span className="focus-check">{today ? "✓" : "→"}</span><span>{today ? todayCopy : "Registrar cómo estuvo el día"}</span><span className="focus-tag">{today ? "GUARDADO" : "SUGERIDO"}</span></div><Button variant="ghost" onClick={() => onNavigate("day")}>{today ? "Revisar Mi día" : "Abrir Mi día"} <span aria-hidden="true">↗</span></Button></article>
        <article className="dashboard-panel dashboard-activity-panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVIDAD RECIENTE</span><h2>Lo último.</h2></div><span className="panel-index">02</span></div>{activities.length ? <div className="activity-list">{activities.slice(0, 6).map((activity) => <button type="button" onClick={() => onNavigate(activity.section)} key={`${activity.section}-${activity.id}`}><span className="activity-icon">{activityIcon(activity.section)}</span><span className="activity-copy"><strong>{activity.title}</strong><small>{activity.detail}</small></span><span className="activity-date">{dateLabel(activity.date)}</span><span className="activity-arrow">→</span></button>)}</div> : <p className="activity-empty">Todavía no hay actividad reciente.</p>}</article>
      </section>

      <section className="dashboard-spaces"><div className="section-heading-row"><div><span className="eyebrow">TUS CINCO ESPACIOS</span><h2>Todo en su lugar.</h2></div><span className="heading-meta">DATOS REALES <span>·</span> ACCESOS RÁPIDOS</span></div><div className="dashboard-space-grid">
        <button type="button" className="dashboard-space-card dashboard-space-day" onClick={() => onNavigate("day")}><VisualTile emoji={SECTION_META.day.icon} label={SECTION_META.day.label} /><span><small>MI DÍA</small><strong>{dayStats?.monthEntries ?? data?.counters?.days ?? 0}</strong><em>registros este mes</em></span><b>↗</b></button>
        <button type="button" className="dashboard-space-card dashboard-space-calendar" onClick={() => onNavigate("calendar")}><VisualTile emoji={SECTION_META.calendar.icon} label={SECTION_META.calendar.label} /><span><small>CALENDARIO</small><strong>{upcomingEvents.length}</strong><em>eventos próximos</em></span><b>↗</b></button>
        <button type="button" className="dashboard-space-card dashboard-space-finances" onClick={() => onNavigate("finances")}><VisualTile emoji={SECTION_META.finances.icon} label={SECTION_META.finances.label} /><span><small>FINANZAS</small><strong>{moneyARS(finance?.currentInvested)}</strong><em>invertido</em></span><b>↗</b></button>
        <button type="button" className="dashboard-space-card dashboard-space-files" onClick={() => onNavigate("files")}><VisualTile emoji={SECTION_META.files.icon} label={SECTION_META.files.label} /><span><small>ARCHIVOS</small><strong>{data?.counters?.files ?? 0}</strong><em>{storage ? `${formatBytes(storage.usedBytes)} de ${formatBytes(storage.quotaBytes)}` : "archivos guardados"}</em></span><b>↗</b></button>
        <button type="button" className="dashboard-space-card dashboard-space-notes" onClick={() => onNavigate("notes")}><VisualTile emoji={SECTION_META.notes.icon} label={SECTION_META.notes.label} /><span><small>NOTAS</small><strong>{data?.counters?.notes ?? 0}</strong><em>{data?.recentNotes?.[0]?.title ?? "ideas guardadas"}</em></span><b>↗</b></button>
      </div>{storage ? <div className="dashboard-storage"><span>USO DEL REPOSITORIO</span><div className="storage-bar"><span style={{ width: `${storagePercent}%` }} /></div><strong>{Math.round(storagePercent)}%</strong></div> : null}</section>
    </>}
  </div>;
}
