"use client";

import type { CalendarEvent, Task } from "../../lib/api/types";
import { dateLabel, todayIso } from "../../lib/presentation";
import { MonthCalendar } from "../../ui/Calendar";

function taskIsOverdue(task: Task) {
  return task.status !== "COMPLETED" && Boolean(task.dueDate && task.dueDate < todayIso());
}

export function EventsCalendar({ month, events, tasks, selectedDate, onMonthChange, onSelectDate }: { month: string; events: CalendarEvent[]; tasks: Task[]; selectedDate: string; onMonthChange: (month: string) => void; onSelectDate: (date: string) => void }) {
  const byDate = new Map<string, Array<{ kind: "event"; item: CalendarEvent } | { kind: "task"; item: Task }>>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), { kind: "event", item: event }]);
  for (const task of tasks) if (task.dueDate) byDate.set(task.dueDate, [...(byDate.get(task.dueDate) ?? []), { kind: "task", item: task }]);

  return <MonthCalendar month={month} onMonthChange={onMonthChange} label="Calendario de eventos y tareas" renderDay={(date, dayNumber, inMonth) => {
    const dayItems = byDate.get(date) ?? [];
    const eventCount = dayItems.filter((entry) => entry.kind === "event").length;
    const taskCount = dayItems.filter((entry) => entry.kind === "task").length;
    const description = dayItems.length ? `${dateLabel(date)}: ${eventCount ? `${eventCount} ${eventCount === 1 ? "evento" : "eventos"}` : ""}${eventCount && taskCount ? " y " : ""}${taskCount ? `${taskCount} ${taskCount === 1 ? "tarea" : "tareas"}` : ""}` : `${dateLabel(date)}: sin eventos ni tareas`;
    return <button type="button" className={`calendar-day events-calendar-day ${dayItems.length ? "events-calendar-day-has-events" : ""} ${selectedDate === date ? "calendar-day-selected" : ""}`} onClick={() => inMonth && onSelectDate(date)} disabled={!inMonth} aria-label={description} aria-pressed={selectedDate === date}>
      <span className="calendar-day-number">{dayNumber}</span>
      {dayItems.length ? <span className="event-day-list">{dayItems.slice(0, 2).map((entry) => entry.kind === "event"
        ? <span className="event-day-chip" key={`event-${entry.item.id}`} title={entry.item.description}>Evento · {entry.item.description}</span>
        : <span className={`task-day-chip ${entry.item.status === "COMPLETED" ? "task-day-chip-completed" : ""} ${taskIsOverdue(entry.item) ? "task-day-chip-overdue" : ""}`} key={`task-${entry.item.id}`} title={entry.item.title}>Tarea · {entry.item.title}</span>)}{dayItems.length > 2 ? <span className="event-day-more">+{dayItems.length - 2} más</span> : null}</span> : null}
    </button>;
  }} />;
}
