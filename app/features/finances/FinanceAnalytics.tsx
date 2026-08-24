"use client";

import type { ApiOption, FinanceAnalytics as FinanceAnalyticsData } from "../../lib/api/types";
import { asNumber, formatARS } from "../../lib/presentation";
import { MonthCalendar } from "../../ui/Calendar";

const chartColors = ["#e5b86f", "#c78f4c", "#f1d59f", "#9f7543", "#d8c39a", "#80603d"];

function PieChart({ title, categories, options }: { title: string; categories: FinanceAnalyticsData["incomeCategories"]; options: ApiOption[] }) {
  const values = categories.map((category) => ({ ...category, value: asNumber(category.total), label: options.find((option) => option.code === category.itemCode)?.label ?? category.itemCode })).filter((category) => category.value > 0);
  const total = values.reduce((sum, category) => sum + category.value, 0);
  const stops = values.map((category, index) => {
    const start = values.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * 100, 0);
    const end = start + (category.value / total) * 100;
    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });
  return <article className="pie-panel">
    <div className="analytics-panel-heading"><div><span className="eyebrow">POR CLASIFICACIÓN</span><h3>{title}</h3></div><span className="analytics-total">{formatARS(total)}</span></div>
    {total ? <div className="pie-content"><div className="pie-chart" role="img" aria-label={`${title}: ${formatARS(total)} distribuidos por clasificación`} style={{ background: `conic-gradient(${stops.join(", ")})` }}><span>{values.length}<small>categorías</small></span></div><div className="pie-legend">{values.map((category, index) => <div className="pie-legend-row" key={category.itemCode}><span className="pie-swatch" style={{ background: chartColors[index % chartColors.length] }} /><span>{category.label}</span><strong>{formatARS(category.value)}</strong><small>{Math.round((category.value / total) * 100)}%</small></div>)}</div></div> : <p className="analytics-empty">No hay movimientos en este rango.</p>}
  </article>;
}

export function FinanceAnalytics({ month, from, to, analytics, options, onMonthChange }: { month: string; from: string; to: string; analytics: FinanceAnalyticsData | null; options: ApiOption[]; onMonthChange: (month: string) => void }) {
  const dailyByDate = new Map((analytics?.daily ?? []).map((day) => [day.date, day]));
  const range = { from, to };
  return <section className="finance-analytics" aria-label="Resumen visual de finanzas">
    <MonthCalendar month={month} onMonthChange={onMonthChange} label="Calendario de Finanzas" renderDay={(date, dayNumber, inMonth) => {
      const day = dailyByDate.get(date);
      const inRange = inMonth && date >= range.from && date <= range.to;
      return <div className={`calendar-day finance-calendar-day ${inRange ? "" : "calendar-day-muted"}`} aria-label={inRange ? `${date}: ingresos ${formatARS(day?.income)}, egresos ${formatARS(day?.expense)}` : undefined}>
        <span className="calendar-day-number">{dayNumber}</span>
        {inRange && day && asNumber(day.income) > 0 ? <span className="finance-day-income">+ {formatARS(day.income)}</span> : null}
        {inRange && day && asNumber(day.expense) > 0 ? <span className="finance-day-expense">− {formatARS(day.expense)}</span> : null}
      </div>;
    }} />
    <div className="pie-grid"><PieChart title="Ingresos" categories={analytics?.incomeCategories ?? []} options={options} /><PieChart title="Egresos" categories={analytics?.expenseCategories ?? []} options={options} /></div>
  </section>;
}
