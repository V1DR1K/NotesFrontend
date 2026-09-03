"use client";

import type { CryptoSummary } from "../../lib/api/types";
import { formatARS, formatUSD } from "../../lib/presentation";
import { Button } from "../../ui/Primitives";

export function CryptoInvestmentPanel({ summary, onInvest, onDelete }: { summary?: CryptoSummary | null; onInvest: () => void; onDelete: (id: string) => void }) {
  return <section className="crypto-investment-panel" aria-labelledby="crypto-investment-title">
    <div className="crypto-panel-heading"><div><span className="eyebrow">INVERSION CRIPTO</span><h2 id="crypto-investment-title">Tus posiciones, sin perder el hilo.</h2><p>Registrá cada compra en dólares. La conversión a pesos queda guardada con la cotización del día.</p></div><Button onClick={onInvest}>Invertir <span aria-hidden="true">↗</span></Button></div>
    <div className="crypto-summary-grid">
      <div><span>INVERTIDO</span><strong>{summary ? formatUSD(summary.invested.usd) : "—"}</strong><small>{summary ? formatARS(summary.invested.ars) : "Cargando..."}</small></div>
      <div><span>DISPONIBLE EN CRIPTO</span><strong>{summary ? formatUSD(summary.available.usd) : "—"}</strong><small>{summary ? formatARS(summary.available.ars) : "Cargando..."}</small></div>
      <div><span>RENDIMIENTO</span><strong>—</strong><small>Disponible al conectar cotizaciones cripto</small></div>
    </div>
    {summary?.positions.length ? <div className="crypto-position-grid">{summary.positions.map((position) => <article className="crypto-position" key={position.assetCode}><div><span className="crypto-symbol">{position.assetCode.replace("USDT", "")}</span><span className="crypto-pair">/ USDT</span></div><strong>{formatUSD(position.investedUsd)}</strong><small>{formatARS(position.investedArs)} · {position.purchases} {position.purchases === 1 ? "compra" : "compras"}</small></article>)}</div> : <p className="analytics-empty">Todavía no hay compras registradas. El saldo disponible de Cripto queda listo para asignar.</p>}
    {summary?.investments.length ? <div className="crypto-history"><span className="eyebrow">HISTORIAL DE COMPRAS</span>{summary.investments.slice(0, 6).map((investment) => <div className="crypto-history-row" key={investment.id}><span>{investment.date}</span><strong>{investment.assetLabel}</strong><span>{formatUSD(investment.amount.usd)}</span><small>{formatARS(investment.amount.ars)} <Button variant="quiet" ariaLabel={`Eliminar compra ${investment.assetLabel}`} onClick={() => onDelete(investment.id)}>×</Button></small></div>)}</div> : null}
  </section>;
}
