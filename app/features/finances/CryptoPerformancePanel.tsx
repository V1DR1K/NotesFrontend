"use client";

import type { CryptoPerformance } from "../../lib/api/types";
import { asNumber, dateLabel, formatUSD } from "../../lib/presentation";

export function CryptoPerformancePanel({ performance }: { performance: CryptoPerformance }) {
  const days = performance.evolution;
  const values = [0, ...days.map((day) => asNumber(day.cumulativeProfitUsd))];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const y = (value: number) => 122 - ((value - low) / span) * 92;
  const points = values
    .map((value, index) => `${36 + (index / Math.max(1, values.length - 1)) * 648},${y(value)}`)
    .join(" ");
  const realizedProfit = days.reduce((sum, day) => sum + asNumber(day.realizedProfitUsd), 0);
  const percent = performance.realizedReturnPercent == null
    ? "Sin ventas"
    : `${asNumber(performance.realizedReturnPercent).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;

  return <section className="crypto-performance pie-panel" aria-labelledby="crypto-performance-title">
    <div className="analytics-panel-heading">
      <h3 id="crypto-performance-title">Rendimiento y evolución</h3>
    </div>
    <div className="crypto-performance-content">
      {days.length ? <figure className="crypto-profit-chart">
        <figcaption>Ganancia acumulada · {dateLabel(days[0].date)} – {dateLabel(days[days.length - 1].date)}</figcaption>
        <svg viewBox="0 0 720 150" role="img" aria-label={`Ganancia acumulada: ${formatUSD(days[days.length - 1].cumulativeProfitUsd)}`}>
          <line x1="36" x2="684" y1={y(0)} y2={y(0)} className="crypto-profit-zero" />
          <polyline points={points} fill="none" className="crypto-profit-line" />
        </svg>
        <div className="crypto-profit-scale" aria-hidden="true"><span>{formatUSD(low)}</span><span>{formatUSD(high)}</span></div>
      </figure> : <p className="analytics-empty crypto-performance-empty">Las métricas aparecerán al registrar ventas.</p>}
      <dl className="crypto-performance-metrics">
        <div>
          <dt>Ganancia realizada</dt>
          <dd className={realizedProfit < 0 ? "crypto-loss" : "crypto-profit"}>{formatUSD(realizedProfit)}</dd>
        </div>
        <div>
          <dt>ROI realizado</dt>
          <dd>{percent}</dd>
        </div>
      </dl>
    </div>
  </section>;
}
