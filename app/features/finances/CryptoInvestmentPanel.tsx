"use client";

import type { CryptoInvestment, CryptoSale, CryptoSummary } from "../../lib/api/types";
import { asNumber, formatARS, formatUSD } from "../../lib/presentation";
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
      <div><span>DISPONIBLE EN CRIPTO</span><strong>{summary ? formatUSD(summary.available.usd) : "—"}</strong><small>{summary ? formatARS(summary.available.ars) : "Cargando..."}</small></div>
      <div><span>GANANCIA REALIZADA</span><strong className={asNumber(summary?.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{summary ? formatUSD(summary.realizedProfitUsd) : "—"}</strong><small>Ventas cerradas o parciales</small></div>
    </div>
    {summary?.positions.length ? <div className="crypto-position-grid">{summary.positions.map((position) => <article className="crypto-position" key={position.assetCode}><div><span className="crypto-symbol">{position.assetCode.replace("USDT", "")}</span><span className="crypto-pair"> / USDT</span></div><strong>{position.quantity === null ? "Precio pendiente" : units(position.quantity)}</strong><small>{formatUSD(position.investedUsd)} de costo abierto · {position.purchases} {position.purchases === 1 ? "lote" : "lotes"}</small></article>)}</div> : <p className="analytics-empty">Todavía no hay compras registradas. El saldo disponible de Cripto queda listo para asignar.</p>}
    {summary?.investments.length ? <div className="crypto-history"><span className="eyebrow">HISTORIAL DE COMPRAS Y VENTAS</span><div className="crypto-lot-list">{summary.investments.map((investment) => {
      const hasActiveSales = investment.sales.some((sale) => !sale.voided);
      const canSell = !investment.voided && investment.remainingQuantity !== null && asNumber(investment.remainingQuantity) > 0;
      return <article className={`crypto-lot ${investment.voided ? "crypto-lot-voided" : ""}`} key={investment.id}>
        <div className="crypto-lot-heading"><div><span className="crypto-operation-kind">COMPRA · {investment.date}</span><strong>{investment.assetLabel}</strong></div><div className="crypto-lot-actions">
          {!investment.voided && investment.unitPriceUsd == null ? <Button variant="quiet" onClick={() => onCompletePrice(investment)}>Completar precio</Button> : null}
          {canSell ? <Button variant="quiet" onClick={() => onSell(investment)}>Vender</Button> : null}
          {!investment.voided && !hasActiveSales ? <Button variant="quiet" ariaLabel={`Anular compra ${investment.assetLabel}`} onClick={() => onVoidPurchase(investment)}>Anular</Button> : null}
          {investment.voided ? <span className="crypto-voided-label">ANULADA</span> : null}
        </div></div>
        <div className="crypto-lot-details"><span>Invertido <strong>{formatUSD(investment.amount.usd)}</strong></span><span>Precio de compra <strong>{investment.unitPriceUsd == null ? "Pendiente" : `${unitPrice(investment.unitPriceUsd)} / unidad`}</strong></span><span>Compradas <strong>{units(investment.quantity)}</strong></span><span>Restantes <strong>{units(investment.remainingQuantity)}</strong></span><span>Costo abierto <strong>{formatUSD(investment.remainingCostBasis.usd)}</strong></span></div>
        {investment.note ? <p className="crypto-lot-note">{investment.note}</p> : null}
        {investment.sales.map((sale) => <div className={`crypto-sale-row ${sale.voided ? "crypto-sale-voided" : ""}`} key={sale.id}>
          <div><span className="crypto-operation-kind">VENTA · {sale.date}{sale.voided ? " · ANULADA" : ""}</span><strong>{units(sale.quantity)} unidades × {unitPrice(sale.unitPriceUsd)}</strong></div>
          <div><span>Recibido</span><strong>{formatUSD(sale.proceedsUsd)}</strong></div>
          <div><span>Ganancia</span><strong className={asNumber(sale.realizedProfitUsd) < 0 ? "crypto-loss" : "crypto-profit"}>{formatUSD(sale.realizedProfitUsd)}</strong></div>
          {!sale.voided ? <Button variant="quiet" ariaLabel={`Anular venta ${investment.assetLabel} del ${sale.date}`} onClick={() => onVoidSale(investment, sale)}>Anular venta</Button> : null}
          {sale.note ? <small className="crypto-sale-note">{sale.note}</small> : null}
        </div>)}
      </article>;
    })}</div></div> : null}
  </section>;
}
