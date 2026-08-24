"use client";

import type { ReactNode } from "react";
import { monthBounds, shiftMonth } from "../lib/presentation";

function calendarDays(month: string) {
  const { to } = monthBounds(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = Number(to.slice(-2));
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const leadingDays = (firstDay + 6) % 7;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    const inMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    return {
      date: inMonth ? `${month}-${String(dayNumber).padStart(2, "0")}` : "",
      dayNumber: inMonth ? dayNumber : 0,
      inMonth,
    };
  });
}

export function MonthCalendar({
  month,
  onMonthChange,
  renderDay,
  label,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  renderDay: (date: string, dayNumber: number, inMonth: boolean) => ReactNode;
  label: string;
}) {
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
  const days = calendarDays(month);
  return <section className="calendar-panel" aria-label={label}>
    <div className="calendar-heading">
      <div><span className="eyebrow">CALENDARIO</span><h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2></div>
      <div className="calendar-nav" aria-label="Cambiar mes">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="Mes anterior">←</button>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="Mes siguiente">→</button>
      </div>
    </div>
    <div className="calendar-weekdays" aria-hidden="true">{["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid" role="grid" aria-label={monthLabel}>
      {days.map((day, index) => <div className={`calendar-cell ${day.inMonth ? "" : "calendar-cell-outside"}`} role="gridcell" key={`${day.date}-${index}`}>{renderDay(day.date, day.dayNumber, day.inMonth)}</div>)}
    </div>
  </section>;
}
