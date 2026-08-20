import type { DayStatus } from "./section-settings/mi-dia";
import type { FinanceBucket, FinanceCategory, FinanceConcept } from "./section-settings/finanzas";
import type { FileKind } from "./section-settings/archivos";
import type { NoteCategory } from "./section-settings/notas";

export type { DayStatus } from "./section-settings/mi-dia";
export type { FinanceBucket, FinanceCategory, FinanceConcept } from "./section-settings/finanzas";
export type { FileKind } from "./section-settings/archivos";
export type { NoteCategory } from "./section-settings/notas";

export type DayEntry = {
  id: string;
  date: string;
  dateLabel: string;
  status: DayStatus;
  feeling: string;
  description: string;
  mood: string;
};

export const INITIAL_DAYS: DayEntry[] = [
  {
    id: "day-20",
    date: "2026-08-20",
    dateLabel: "Jueves 20 ago",
    status: "green",
    feeling: "Concentrado y liviano",
    description: "Entrené temprano y pude avanzar con el proyecto antes de cursar. Hoy todo fluyó un poco más.",
    mood: "☀",
  },
  {
    id: "day-19",
    date: "2026-08-19",
    dateLabel: "Miércoles 19 ago",
    status: "yellow",
    feeling: "Con la cabeza llena",
    description: "Muchas cosas abiertas al mismo tiempo. Igual pude cerrar una tarea importante y descansar mejor.",
    mood: "◌",
  },
  {
    id: "day-18",
    date: "2026-08-18",
    dateLabel: "Martes 18 ago",
    status: "green",
    feeling: "En ritmo",
    description: "Día simple, de esos que no hacen ruido. Cociné, estudié un rato y tuve tiempo para mí.",
    mood: "↗",
  },
  {
    id: "day-17",
    date: "2026-08-17",
    dateLabel: "Lunes 17 ago",
    status: "red",
    feeling: "Necesitaba bajar un cambio",
    description: "Dormí poco y todo costó más de lo esperado. Mañana conviene arrancar con menos exigencia.",
    mood: "—",
  },
];

export type FinanceEntry = {
  id: string;
  date: string;
  dateLabel: string;
  bucket: FinanceBucket;
  category: FinanceCategory;
  concept: FinanceConcept;
  amount: number;
  note?: string;
};

export const INITIAL_FINANCES: FinanceEntry[] = [
  { id: "fin-1", date: "2026-08-20", dateLabel: "Hoy · 09:42", bucket: "income", category: "work", concept: "monthly_payment", amount: 480000, note: "Cuenta principal" },
  { id: "fin-2", date: "2026-08-20", dateLabel: "Hoy · 08:10", bucket: "expense", category: "food", concept: "weekly_purchase", amount: 38500, note: "Supermercado" },
  { id: "fin-3", date: "2026-08-18", dateLabel: "18 ago", bucket: "invested", category: "dollars", concept: "usd_purchase", amount: 160000, note: "Ahorro de largo plazo" },
  { id: "fin-4", date: "2026-08-15", dateLabel: "15 ago", bucket: "expense", category: "mobility", concept: "fuel", amount: 24500, note: "Moto" },
  { id: "fin-5", date: "2026-08-10", dateLabel: "10 ago", bucket: "income", category: "extra", concept: "freelance", amount: 85000, note: "Entrega de agosto" },
  { id: "fin-6", date: "2026-08-01", dateLabel: "01 ago", bucket: "invested", category: "market", concept: "investment_fund", amount: 90000, note: "Reserva" },
];

export type FileEntry = {
  id: string;
  name: string;
  kind: FileKind;
  folder: string;
  dateLabel: string;
  size: string;
};

export const INITIAL_FILES: FileEntry[] = [
  { id: "file-1", name: "presupuesto-agosto.xlsx", kind: "sheet", folder: "Finanzas", dateLabel: "Hoy · 08:33", size: "84 KB" },
  { id: "file-2", name: "documentación-moto.pdf", kind: "document", folder: "Moto", dateLabel: "Ayer · 17:20", size: "2.4 MB" },
  { id: "file-3", name: "fotos-service-01.jpg", kind: "image", folder: "Moto", dateLabel: "12 ago", size: "1.8 MB" },
  { id: "file-4", name: "ideas-para-el-proyecto.zip", kind: "archive", folder: "Proyectos", dateLabel: "08 ago", size: "12.1 MB" },
];

export type NoteEntry = {
  id: string;
  title: string;
  body: string;
  category: NoteCategory;
  dateLabel: string;
  date: string;
};

export const INITIAL_NOTES: NoteEntry[] = [
  { id: "note-1", title: "La idea del tablero", body: "Separar lo urgente de lo importante y dejar que cada módulo tenga su propio ritmo.", category: "ideas", dateLabel: "Hoy · 10:12", date: "2026-08-20" },
  { id: "note-2", title: "Cosas para revisar", body: "Revisar la estructura de componentes, dejar tokens documentados y preparar el contrato del backend.", category: "work", dateLabel: "Ayer · 21:08", date: "2026-08-19" },
  { id: "note-3", title: "Recordatorio amable", body: "No hace falta resolver todo hoy. Una cosa bien hecha también es avanzar.", category: "personal", dateLabel: "16 ago", date: "2026-08-16" },
  { id: "note-4", title: "Próximo paso", body: "Definir la API de archivos multipart y la estrategia de carpetas antes de conectar persistencia.", category: "work", dateLabel: "14 ago", date: "2026-08-14" },
];

export const USD_RATE = 1320;
