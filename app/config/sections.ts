import type { CSSProperties } from "react";

export type SectionKey = "overview" | "day" | "calendar" | "finances" | "files" | "notes" | "settings";

export type SectionTokens = {
  accent: string;
  contrast: string;
  shadow: string;
  surface: string;
  soft: string;
};

// The only color values a section owns. Components consume these through CSS vars.
export const SECTION_TOKENS: Record<SectionKey, SectionTokens> = {
  overview: {
    accent: "#d5c4ff",
    contrast: "#1b1231",
    shadow: "rgba(213, 196, 255, 0.22)",
    surface: "rgba(213, 196, 255, 0.12)",
    soft: "#efe9ff",
  },
  day: {
    accent: "#9bd7b3",
    contrast: "#13261d",
    shadow: "rgba(155, 215, 179, 0.22)",
    surface: "rgba(155, 215, 179, 0.12)",
    soft: "#d8f0e0",
  },
  calendar: {
    accent: "#f0b58a",
    contrast: "#321b10",
    shadow: "rgba(240, 181, 138, 0.22)",
    surface: "rgba(240, 181, 138, 0.12)",
    soft: "#f6dfcf",
  },
  finances: {
    accent: "#e5b86f",
    contrast: "#2b1f0d",
    shadow: "rgba(229, 184, 111, 0.22)",
    surface: "rgba(229, 184, 111, 0.12)",
    soft: "#f3dcad",
  },
  files: {
    accent: "#a8b9ff",
    contrast: "#111a3d",
    shadow: "rgba(168, 185, 255, 0.22)",
    surface: "rgba(168, 185, 255, 0.12)",
    soft: "#dce3ff",
  },
  notes: {
    accent: "#e8a9d3",
    contrast: "#35192c",
    shadow: "rgba(232, 169, 211, 0.22)",
    surface: "rgba(232, 169, 211, 0.12)",
    soft: "#f4d8e9",
  },
  settings: {
    accent: "#b6c6c8",
    contrast: "#142022",
    shadow: "rgba(182, 198, 200, 0.2)",
    surface: "rgba(182, 198, 200, 0.1)",
    soft: "#dce7e8",
  },
};

export const SECTION_META: Record<SectionKey, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  action: string;
}> = {
  overview: {
    label: "Resumen",
    eyebrow: "CUADERNO PERSONAL / 01",
    title: "Ordená el ruido.",
    description: "Un lugar tranquilo para dejar registro de lo que pasa, lo que importa y lo que querés recordar.",
    icon: "✦",
    action: "Abrir un módulo",
  },
  day: {
    label: "Mi día",
    eyebrow: "REGISTRO DIARIO / 02",
    title: "¿Cómo estuvo hoy?",
    description: "Poné en palabras el día, elegí un color y dejá que el registro haga memoria por vos.",
    icon: "☀",
    action: "Anotar el día",
  },
  calendar: {
    label: "Calendario",
    eyebrow: "FECHAS Y PENDIENTES / 03",
    title: "Que nada importante se te escape.",
    description: "Una agenda simple para guardar tus eventos, encontrarlos por fecha y mantener cada pendiente en su lugar.",
    icon: "▦",
    action: "Agregar evento",
  },
  finances: {
    label: "Finanzas",
    eyebrow: "MOVIMIENTO DE DINERO / 03",
    title: "Que cada peso tenga un lugar.",
    description: "Ingresos, egresos, caja e inversiones en una sola vista, con el dólar siempre a mano.",
    icon: "$",
    action: "Cargar movimiento",
  },
  files: {
    label: "Archivos",
    eyebrow: "REPOSITORIO PERSONAL / 04",
    title: "Todo lo importante, cerca.",
    description: "Guardá archivos, armá carpetas y encontrá cada cosa sin perder tiempo buscándola.",
    icon: "↗",
    action: "Subir archivo",
  },
  notes: {
    label: "Notas",
    eyebrow: "IDEAS Y APUNTES / 05",
    title: "Pensamientos que merecen quedarse.",
    description: "Notas simples, rápidas y ordenadas para cuando una idea aparece y no querés dejarla escapar.",
    icon: "✎",
    action: "Escribir nota",
  },
  settings: {
    label: "Configuración",
    eyebrow: "ORDEN Y PREFERENCIAS / 06",
    title: "Hacé tuyo el sistema.",
    description: "Administrá las opciones que aparecen en tus registros y filtros cotidianos.",
    icon: "⚙",
    action: "Agregar una opción",
  },
};

export const NAV_ITEMS: Array<{ key: SectionKey; short: string }> = [
  { key: "overview", short: "Inicio" },
  { key: "day", short: "Mi día" },
  { key: "calendar", short: "Agenda" },
  { key: "finances", short: "Finanzas" },
  { key: "files", short: "Archivos" },
  { key: "notes", short: "Notas" },
];

export function tokenStyle(section: SectionKey): CSSProperties {
  const tokens = SECTION_TOKENS[section];
  return {
    "--section-accent": tokens.accent,
    "--section-contrast": tokens.contrast,
    "--section-shadow": tokens.shadow,
    "--section-surface": tokens.surface,
    "--section-soft": tokens.soft,
  } as CSSProperties;
}

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === "string" && value in SECTION_META;
}
