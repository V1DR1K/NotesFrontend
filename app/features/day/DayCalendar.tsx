"use client";

import type { DayEntry } from "../../lib/api/types";
import { dateLabel } from "../../lib/presentation";
import { MonthCalendar } from "../../ui/Calendar";

function statusTone(code?: string) {
  const normalized = code?.toLowerCase();
  return normalized === "green" || normalized === "yellow" || normalized === "red" ? normalized : "pending";
}

export function DayCalendar({ month, entries, selectedDate, onMonthChange, onSelectDate }: { month: string; entries: DayEntry[]; selectedDate: string; onMonthChange: (month: string) => void; onSelectDate: (date: string) => void }) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  return <MonthCalendar month={month} onMonthChange={onMonthChange} label="Calendario de Mi día" renderDay={(date, dayNumber, inMonth) => {
    const entry = byDate.get(date);
    const tone = statusTone(entry?.status?.code);
    const description = entry ? `${dateLabel(date)}: ${entry.analysisStatus === "COMPLETED" ? entry.status?.label ?? "Día analizado" : "Análisis pendiente"}` : `${dateLabel(date)}: sin registro`;
    return <button type="button" className={`calendar-day day-calendar-day ${entry ? `day-calendar-${tone}` : ""} ${selectedDate === date ? "calendar-day-selected" : ""}`} onClick={() => inMonth && onSelectDate(date)} disabled={!inMonth} aria-label={description} aria-pressed={selectedDate === date}>
      <span className="calendar-day-number">{dayNumber}</span>
      {entry ? <span className={`calendar-status-mark calendar-status-${tone}`} aria-hidden="true">{entry.status?.emoji ?? (entry.analysisStatus === "COMPLETED" ? "•" : "◌")}</span> : null}
    </button>;
  }} />;
}
