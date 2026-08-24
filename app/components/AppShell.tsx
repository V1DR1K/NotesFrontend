"use client";

import type { CSSProperties, ReactNode } from "react";
import { NAV_ITEMS, SECTION_META, type SectionKey } from "../config/sections";
import type { AuthUser } from "../lib/api/types";

export function AppShell({ activeSection, onNavigate, onOpenSearch, onOpenSettings, children, style, user, onLogout, logoutPending }: { activeSection: SectionKey; onNavigate: (section: SectionKey) => void; onOpenSearch: () => void; onOpenSettings: () => void; children: ReactNode; style?: CSSProperties; user: AuthUser; onLogout: () => void; logoutPending?: boolean }) {
  const displayName = user.username || "Mi espacio";
  const initials = displayName.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
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
              <button className={`nav-item ${activeSection === item.key ? "nav-item-active" : ""}`} type="button" onClick={() => onNavigate(item.key)} aria-current={activeSection === item.key ? "page" : undefined} key={item.key}>
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
           <div className="avatar">{initials}</div>
           <div><strong>{displayName}</strong><span>Mi espacio</span></div>
           <button type="button" className="more-button" onClick={onLogout} disabled={logoutPending} aria-label="Cerrar sesión">{logoutPending ? "..." : "Salir"}</button>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-symbol">✦</span><strong>Cuaderno</strong></div>
          <div className="breadcrumb"><span>CUADERNO</span><i>/</i><strong>{SECTION_META[activeSection].label.toUpperCase()}</strong></div>
          <div className="topbar-tools">
            <span className="sync-status"><span className="sync-dot" /> SESIÓN ACTIVA</span>
             <span className="topbar-date">{new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date()).toUpperCase()}</span>
              <button type="button" className={`settings-button ${activeSection === "settings" ? "settings-button-active" : ""}`} onClick={onOpenSettings} aria-label="Abrir configuración" aria-current={activeSection === "settings" ? "page" : undefined}>⚙</button>
             <button type="button" className="search-button" onClick={onOpenSearch} aria-label="Buscar"><span>⌕</span><kbd>⌘ K</kbd></button>
             <button type="button" className="mobile-logout" onClick={onLogout} disabled={logoutPending} aria-label="Cerrar sesión">{logoutPending ? "..." : "Salir"}</button>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
        <nav className="mobile-nav" aria-label="Secciones principales">
          {NAV_ITEMS.map((item) => <button className={activeSection === item.key ? "mobile-nav-active" : ""} type="button" onClick={() => onNavigate(item.key)} aria-current={activeSection === item.key ? "page" : undefined} key={item.key}>
            <span className="mobile-nav-icon" aria-hidden="true">{SECTION_META[item.key].icon}</span>
            <span>{item.short}</span>
          </button>)}
        </nav>
      </main>
    </div>
  );
}
