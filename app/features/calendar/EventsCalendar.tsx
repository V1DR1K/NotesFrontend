"use client";

import type { CalendarEvent } from "../../lib/api/types";
import { dateLabel } from "../../lib/presentation";
import { MonthCalendar } from "../../ui/Calendar";

export function EventsCalendar({ month, events, selectedDate, onMonthChange, onSelectDate }: { month: string; events: CalendarEvent[]; selectedDate: string; onMonthChange: (month: string) => void; onSelectDate: (date: string) => void }) {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  return <MonthCalendar month={month} onMonthChange={onMonthChange} label="Calendario de eventos" renderDay={(date, dayNumber, inMonth) => {
    const dayEvents = byDate.get(date) ?? [];
    const description = dayEvents.length ? `${dateLabel(date)}: ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : `${dateLabel(date)}: sin eventos`;
    return <button type="button" className={`calendar-day events-calendar-day ${dayEvents.length ? "events-calendar-day-has-events" : ""} ${selectedDate === date ? "calendar-day-selected" : ""}`} onClick={() => inMonth && onSelectDate(date)} disabled={!inMonth} aria-label={description} aria-pressed={selectedDate === date}>
      <span className="calendar-day-number">{dayNumber}</span>
      {dayEvents.length ? <span className="event-day-list">{dayEvents.slice(0, 2).map((event) => <span className="event-day-chip" key={event.id} title={event.description}>{event.description}</span>)}{dayEvents.length > 2 ? <span className="event-day-more">+{dayEvents.length - 2} más</span> : null}</span> : null}
    </button>;
  }} />;
}
