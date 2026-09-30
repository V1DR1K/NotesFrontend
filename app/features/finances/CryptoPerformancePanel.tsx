"use client";

import type { CryptoPerformance } from "../../lib/api/types";
import { asNumber, dateLabel, formatUSD } from "../../lib/presentation";

export function CryptoPerformancePanel({ performance }: { performance: CryptoPerformance }) {
  const days = performance.evolution;
  const values = [0, ...days.map((day) => asNumber(day.cumulativeProfitUsd))];
  const low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  const y = (value: number) => 150 - (value - low) / span * 120;
  const points = values.map((value, index) => `${40 + index / Math.max(1, values.length - 1) * 640},${y(value)}`).join(" ");
  const percent = performance.realizedReturnPercent == null ? "Sin ventas" : `${asNumber(performance.realizedReturnPercent).toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`;
  return <section className="crypto-performance" aria-labelledby="crypto-performance-title">
    <h3 id="crypto-performance-title">Rendimiento y evolución</h3>
    <p>Historial completo de ventas activas. Ganancia = dólares recibidos − costo de las unidades vendidas.</p>
    <dl className="crypto-performance-totals">
      <div><dt>Capital en Bitget</dt><dd>{formatUSD(performance.capitalUsd)}</dd><small>Disponible + posiciones al costo</small></div>
      <div><dt>Recibido en ventas</dt><dd>{formatUSD(performance.saleProceedsUsd)}</dd><small>{performance.salesCount} {performance.salesCount === 1 ? "venta" : "ventas"}</small></div>
      <div><dt>Costo vendido</dt><dd>{formatUSD(performance.soldCostBasisUsd)}</dd><small>Costo de compra proporcional</small></div>
      <div><dt>Rendimiento realizado</dt><dd>{percent}</dd><small>Ganancia / costo vendido</small></div>
    </dl>
    {days.length ? <>
      <figure className="crypto-profit-chart">
        <figcaption>Ganancia acumulada en USD · {days[0].date} a {days[days.length - 1].date}</figcaption>
        <svg viewBox="0 0 720 190" role="img" aria-label={`Ganancia acumulada: ${formatUSD(days[days.length - 1].cumulativeProfitUsd)}. Detalle por fecha debajo.`}>
          <line x1="40" x2="680" y1={y(0)} y2={y(0)} className="crypto-profit-zero" />
          <polyline points={points} fill="none" className="crypto-profit-line" />
          <text x="40" y="180">{formatUSD(low)}</text><text x="680" y="180" textAnchor="end">{formatUSD(high)}</text>
        </svg>
      </figure>
      <div className="crypto-performance-table"><table><caption>Resultados de venta por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Recibido</th><th scope="col">Costo</th><th scope="col">Ganancia</th><th scope="col">Acumulada</th></tr></thead><tbody>{days.map((day) => <tr key={day.date}><th scope="row">{dateLabel(day.date)}</th><td>{formatUSD(day.proceedsUsd)}</td><td>{formatUSD(day.costBasisUsd)}</td><td className={asNumber(day.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{formatUSD(day.realizedProfitUsd)}</td><td>{formatUSD(day.cumulativeProfitUsd)}</td></tr>)}</tbody></table></div>
      <div className="crypto-performance-assets">{performance.assets.map((asset) => <p key={asset.assetCode}><strong>{asset.assetLabel}</strong><span className={asNumber(asset.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{formatUSD(asset.realizedProfitUsd)} de ganancia realizada</span></p>)}</div>
    </> : <p className="analytics-empty">La evolución aparecerá cuando registres una venta. Tus posiciones abiertas se muestran a costo de compra; no incluyen ganancias de mercado sin realizar.</p>}
  </section>;
}
