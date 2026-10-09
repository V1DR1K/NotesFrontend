"use client";

import type { CryptoInvestment, CryptoSale, CryptoSummary } from "../../lib/api/types";
import { asNumber, formatARS, formatUSD } from "../../lib/presentation";
import { CryptoPerformancePanel } from "./CryptoPerformancePanel";
import { Button } from "../../ui/Primitives";

function units(value: number | string | null | undefined) {
  if (value == null) return "Sin unidades registradas";
  return Number(value).toLocaleString("es-AR", { maximumFractionDigits: 18 });
}

function unitPrice(value: number | string) {
  return `US$ ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 12 })}`;
}

export function CryptoInvestmentPanel({ summary, onInvest, onSell, onCompletePrice, onVoidPurchase, onVoidSale }: {
  summary?: CryptoSummary | null;
  onInvest: () => void;
  onSell: (investment: CryptoInvestment) => void;
  onCompletePrice: (investment: CryptoInvestment) => void;
  onVoidPurchase: (investment: CryptoInvestment) => void;
  onVoidSale: (investment: CryptoInvestment, sale: CryptoSale) => void;
}) {
  return <section className="crypto-investment-panel" aria-labelledby="crypto-investment-title">
    <div className="crypto-panel-heading"><div><span className="eyebrow">INVERSION CRIPTO</span><h2 id="crypto-investment-title">Tus posiciones, sin perder el hilo.</h2><p>Registrá cada compra por lote y seguí sus ventas, unidades restantes y ganancia realizada.</p></div><Button onClick={onInvest}>Comprar <span aria-hidden="true">↗</span></Button></div>
    <div className="crypto-summary-grid">
      <div><span>INVERSIÓN ABIERTA</span><strong>{summary ? formatUSD(summary.invested.usd) : "—"}</strong><small>{summary ? formatARS(summary.invested.ars) : "Cargando..."}</small></div>
      <div><span>DISPONIBLE EN BITGET</span><strong>{summary ? formatUSD(summary.available.usd) : "—"}</strong><small>Dólares libres para comprar cripto</small></div>
      <div><span>GANANCIA REALIZADA</span><strong className={asNumber(summary?.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{summary ? formatUSD(summary.realizedProfitUsd) : "—"}</strong><small>Ventas cerradas o parciales</small></div>
    </div>
    {summary?.legacyBalanceEstimated ? <p className="analysis-notice">El saldo inicial en USD se estimó con la última cotización registrada. Usá «Corregir saldo» en Cripto para indicar tu total real de Bitget; los registros anteriores se conservan.</p> : null}
    {summary?.performance ? <CryptoPerformancePanel performance={summary.performance} /> : null}
    {summary?.positions.length ? <div className="crypto-position-grid" aria-label="Posiciones abiertas">{summary.positions.map((position) => <article className="crypto-position" key={position.assetCode}>
      <div className="crypto-position-heading"><div><span className="crypto-symbol">{position.assetCode.replace(/USDT$/, "")}</span><span className="crypto-pair"> / USDT</span></div><span className="crypto-position-lots">{position.purchases} {position.purchases === 1 ? "lote abierto" : "lotes abiertos"}</span></div>
      <div className="crypto-position-quantity"><span>UNIDADES DISPONIBLES</span><strong>{position.quantity === null ? "Precio pendiente" : units(position.quantity)}</strong></div>
      <div className="crypto-position-cost"><span>Balance abierto</span><strong>{formatUSD(position.investedUsd)}</strong></div>
    </article>)}</div> : <p className="analytics-empty">Todavía no hay compras registradas. El saldo disponible de Cripto queda listo para asignar.</p>}
    {summary?.investments.length ? <div className="crypto-history"><span className="eyebrow">HISTORIAL DE COMPRAS Y VENTAS</span><div className="crypto-lot-list">{summary.investments.map((investment) => {
      const hasActiveSales = investment.sales.some((sale) => !sale.voided);
      const canSell = !investment.voided && investment.remainingQuantity !== null && asNumber(investment.remainingQuantity) > 0;
      return <article className={`crypto-lot ${investment.voided ? "crypto-lot-voided" : ""}`} key={investment.id}>
        <div className="crypto-lot-heading"><div><span className="crypto-operation-kind">COMPRA · {investment.date}</span><strong>{investment.assetLabel}</strong></div><div className="crypto-lot-actions" role="group" aria-label={`Acciones del lote ${investment.assetLabel} del ${investment.date}`}>
          {canSell ? <Button className="crypto-action-sell" onClick={() => onSell(investment)}>Vender</Button> : null}
          {!investment.voided && !hasActiveSales ? <Button className="crypto-action-edit" variant="ghost" onClick={() => onCompletePrice(investment)}>{investment.unitPriceUsd == null ? "Completar precio" : "Editar precio"}</Button> : null}
          {!investment.voided && !hasActiveSales ? <Button className="crypto-action-void" variant="danger" ariaLabel={`Anular compra ${investment.assetLabel}`} onClick={() => onVoidPurchase(investment)}>Anular</Button> : null}
          {investment.voided ? <span className="crypto-voided-label">ANULADA</span> : null}
        </div></div>
        <div className="crypto-lot-kpis">
          <div className="crypto-kpi"><span>Precio de entrada</span><strong>{investment.unitPriceUsd == null ? "Pendiente" : unitPrice(investment.unitPriceUsd)}</strong><small>por unidad</small></div>
          <div className="crypto-kpi"><span>Balance invertido</span><strong>{formatUSD(investment.amount.usd)}</strong><small>monto de la compra</small></div>
          <div className="crypto-kpi"><span>Unidades compradas</span><strong>{units(investment.quantity)}</strong><small>cantidad total</small></div>
          <div className="crypto-kpi crypto-kpi--important"><span>Unidades restantes</span><strong>{units(investment.remainingQuantity)}</strong><small>disponibles para vender</small></div>
          <div className="crypto-kpi crypto-kpi--important"><span>Costo abierto</span><strong>{formatUSD(investment.remainingCostBasis.usd)}</strong><small>balance aún invertido</small></div>
        </div>
        {investment.note ? <p className="crypto-lot-note">{investment.note}</p> : null}
        {investment.sales.map((sale) => <div className={`crypto-sale-row ${sale.voided ? "crypto-sale-voided" : ""}`} key={sale.id}>
          <div className="crypto-sale-heading">
            <div><span className="crypto-operation-kind">VENTA · {sale.date}{sale.voided ? " · ANULADA" : ""}</span><strong>{units(sale.quantity)} unidades vendidas</strong></div>
            {!sale.voided ? <Button className="crypto-action-void" variant="danger" ariaLabel={`Anular venta ${investment.assetLabel} del ${sale.date}`} onClick={() => onVoidSale(investment, sale)}>Anular venta</Button> : null}
          </div>
          <div className="crypto-sale-kpis">
            <div className="crypto-kpi"><span>Precio de salida</span><strong>{unitPrice(sale.unitPriceUsd)}</strong><small>por unidad</small></div>
            <div className="crypto-kpi"><span>Balance recibido</span><strong>{formatUSD(sale.proceedsUsd)}</strong><small>total de la venta</small></div>
            <div className={`crypto-kpi ${asNumber(sale.realizedProfitUsd) < 0 ? "crypto-kpi--loss" : "crypto-kpi--profit"}`}><span>Ganancia realizada</span><strong className={asNumber(sale.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{formatUSD(sale.realizedProfitUsd)}</strong><small>sobre el costo vendido</small></div>
          </div>
          {sale.note ? <small className="crypto-sale-note">{sale.note}</small> : null}
        </div>)}
      </article>;
    })}</div></div> : null}
  </section>;
}
