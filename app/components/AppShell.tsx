"use client";

import type { CSSProperties, ReactNode } from "react";
import { NAV_ITEMS, SECTION_META, type SectionKey } from "../config/sections";

export function AppShell({ activeSection, onNavigate, children, style }: { activeSection: SectionKey; onNavigate: (section: SectionKey) => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="app-frame" data-section={activeSection} style={style}>
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => onNavigate("overview")} aria-label="Volver al inicio">
          <span className="brand-symbol">✦</span>
          <span><strong>Cuaderno</strong><small>PERSONAL / 01</small></span>
        </button>

        <div className="sidebar-section-label">ESPACIOS</div>
        <nav className="main-nav" aria-label="Secciones principales">
          {NAV_ITEMS.map((item) => {
            const meta = SECTION_META[item.key];
            return (
              <button className={`nav-item ${activeSection === item.key ? "nav-item-active" : ""}`} type="button" onClick={() => onNavigate(item.key)} key={item.key}>
                <span className="nav-icon" aria-hidden="true">{meta.icon}</span>
                <span>{item.short}</span>
                {activeSection === item.key ? <span className="nav-active-dot" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="sidebar-note-mark">↘</span>
          <p>Lo que se escribe, se vuelve más liviano.</p>
          <span className="mono-caption">MODO OFFLINE / FRONTEND</span>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">TC</div>
          <div><strong>Tomás</strong><span>Mi espacio</span></div>
          <button type="button" className="more-button" aria-label="Más opciones">•••</button>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-symbol">✦</span><strong>Cuaderno</strong></div>
          <div className="breadcrumb"><span>CUADERNO</span><i>/</i><strong>{SECTION_META[activeSection].label.toUpperCase()}</strong></div>
          <div className="topbar-tools">
            <span className="sync-status"><span className="sync-dot" /> TODO EN ORDEN</span>
            <span className="topbar-date">JUE 20 AGO 2026</span>
            <button type="button" className="search-button" aria-label="Buscar"><span>⌕</span><kbd>⌘ K</kbd></button>
          </div>
        </header>
        <div className="mobile-nav" aria-label="Secciones principales">
          {NAV_ITEMS.map((item) => <button className={activeSection === item.key ? "mobile-nav-active" : ""} type="button" onClick={() => onNavigate(item.key)} key={item.key}>{SECTION_META[item.key].icon} {item.short}</button>)}
        </div>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
