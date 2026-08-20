"use client";

import { SECTION_META, tokenStyle, type SectionKey } from "../config/sections";
import { Button, MetricCard, SectionHero, VisualTile } from "../ui/Primitives";

const moduleCards: Array<{ section: Exclude<SectionKey, "overview">; count: string; detail: string; emoji: string; accentText: string }> = [
  { section: "day", count: "12 registros", detail: "Último: hoy, 09:12", emoji: "☀", accentText: "Estado de ánimo" },
  { section: "finances", count: "$ 481.200", detail: "Caja disponible", emoji: "$", accentText: "Este mes" },
  { section: "files", count: "28 archivos", detail: "En 4 carpetas", emoji: "↗", accentText: "Repositorio" },
  { section: "notes", count: "16 notas", detail: "3 actualizadas hoy", emoji: "✎", accentText: "Pensamientos" },
];

export function HomeView({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  return (
    <div className="view view-overview">
      <SectionHero
        section="overview"
        onAction={() => onNavigate("day")}
        actionLabel="Empezar a anotar"
        rightSlot={
          <div className="hero-note-card">
            <span className="eyebrow">UNA PREGUNTA PARA HOY</span>
            <p>¿Qué te gustaría que tu yo de mañana recuerde de este día?</p>
            <span className="hero-note-footer">JUEVES / 20.08.26 <span>✦</span></span>
          </div>
        }
      />

      <section className="overview-section">
        <div className="section-heading-row">
          <div><span className="eyebrow">TUS ESPACIOS</span><h2>Todo en su lugar.</h2></div>
          <span className="heading-meta">04 MÓDULOS ACTIVOS <span>·</span> FRONTEND V1</span>
        </div>
        <div className="module-grid">
          {moduleCards.map((card) => {
            const meta = SECTION_META[card.section];
            return (
              <button className="module-card" style={tokenStyle(card.section)} data-section={card.section} type="button" onClick={() => onNavigate(card.section)} key={card.section}>
                <div className="module-card-top"><VisualTile emoji={card.emoji} label={meta.label} /><span className="module-card-arrow">↗</span></div>
                <div className="module-card-copy"><span className="eyebrow">{meta.eyebrow.split(" /")[0]}</span><h3>{meta.label}</h3><p>{card.detail}</p></div>
                <div className="module-card-bottom"><strong>{card.count}</strong><span>{card.accentText}</span></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overview-lower">
        <article className="focus-panel">
          <div className="panel-heading"><div><span className="eyebrow">FOCO DE HOY</span><h2>Una cosa a la vez.</h2></div><span className="panel-index">01</span></div>
          <p>Tu espacio no tiene que estar perfecto. Solo tiene que ser un lugar al que te den ganas de volver.</p>
          <div className="focus-line"><span className="focus-check">✓</span><span>Registrar cómo estuvo el día</span><span className="focus-tag">SUGERIDO</span></div>
          <Button variant="ghost" onClick={() => onNavigate("day")}>Abrir Mi día <span aria-hidden="true">↗</span></Button>
        </article>
        <article className="activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">ACTIVIDAD RECIENTE</span><h2>Lo último.</h2></div><span className="panel-index">02</span></div>
          <div className="activity-list">
            <button type="button" onClick={() => onNavigate("notes")}><span className="activity-icon activity-notes">✎</span><span><strong>Nota actualizada</strong><small>“La idea del tablero” · hace 18 min</small></span><span className="activity-arrow">→</span></button>
            <button type="button" onClick={() => onNavigate("finances")}><span className="activity-icon activity-finances">$</span><span><strong>Movimiento registrado</strong><small>Compra semanal · hace 1 h</small></span><span className="activity-arrow">→</span></button>
            <button type="button" onClick={() => onNavigate("files")}><span className="activity-icon activity-files">↗</span><span><strong>Archivo agregado</strong><small>presupuesto-agosto.xlsx · hoy</small></span><span className="activity-arrow">→</span></button>
          </div>
        </article>
      </section>

      <section className="metric-grid overview-metrics">
        <MetricCard label="REGISTROS DEL MES" value="32" detail="+8 vs. julio" icon="↗" />
        <MetricCard label="DÍAS EN VERDE" value="74%" detail="17 de 23 días" icon="☀" />
        <MetricCard label="NOTAS SIN LEER" value="03" detail="Hay ideas esperando" icon="✎" />
      </section>
    </div>
  );
}
