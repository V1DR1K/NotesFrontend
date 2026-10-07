"use client";

import type { Dispatch, SetStateAction } from "react";
import type { CryptoAssetCode, CryptoInvestment } from "../../lib/api/types";
import { asNumber, formatUSD, parseCryptoDecimal, parseCryptoPrice, parseUSDInput } from "../../lib/presentation";
import { Button, ConfirmDialog, Dialog, FormField, FormPanel, SelectField } from "../../ui/Primitives";
import { CryptoOrderOcr } from "./CryptoOrderOcr";
import type { CryptoOrderOcrResult } from "./cryptoOrderParser";

export type CryptoInvestmentDraft = { date: string; assetCode: CryptoAssetCode; amountUsd: string; unitPriceUsd: string; quantity: string; note: string };
export type CryptoSaleDraft = { investment: CryptoInvestment; date: string; quantity: string; proceedsUsd: string; note: string; sellAll: boolean; totalQuantity: string | null; totalCostBasisUsd: number | string };
export type CryptoVoidDraft = { kind: "purchase"; investmentId: string; label: string } | { kind: "sale"; investmentId: string; saleId: string; label: string };

function units(value: number | string | null | undefined) {
  if (value == null) return "0";
  return Number(value).toLocaleString("es-AR", { maximumFractionDigits: 18 });
}

function unitPrice(value: number | string) {
  return `US$ ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 12 })}`;
}

type Props = {
  availableUsd: number | null;
  investmentOpen: boolean;
  setInvestmentOpen: (open: boolean) => void;
  investmentDraft: CryptoInvestmentDraft;
  setInvestmentDraft: Dispatch<SetStateAction<CryptoInvestmentDraft>>;
  onApplyPurchaseOrder: (order: CryptoOrderOcrResult) => void;
  onSaveInvestment: () => void;
  saleDraft: CryptoSaleDraft | null;
  setSaleDraft: Dispatch<SetStateAction<CryptoSaleDraft | null>>;
  onApplySaleOrder: (order: CryptoOrderOcrResult) => void;
  onSaveSale: () => void;
  legacyPriceTarget: CryptoInvestment | null;
  setLegacyPriceTarget: (investment: CryptoInvestment | null) => void;
  legacyUnitPrice: string;
  setLegacyUnitPrice: (value: string) => void;
  onSaveLegacyPrice: () => void;
  pendingVoid: CryptoVoidDraft | null;
  setPendingVoid: (operation: CryptoVoidDraft | null) => void;
  onVoid: () => void;
  error: string | null;
  pending: boolean;
};

export function CryptoInvestmentDialogs(props: Props) {
  const amountUsd = parseUSDInput(props.investmentDraft.amountUsd);
  const purchasePrice = parseCryptoPrice(props.investmentDraft.unitPriceUsd);
  const enteredPurchaseQuantity = parseCryptoDecimal(props.investmentDraft.quantity);
  const purchaseQuantity = enteredPurchaseQuantity ?? (amountUsd && purchasePrice ? amountUsd / purchasePrice : null);
  const saleQuantity = parseCryptoDecimal(props.saleDraft?.quantity ?? "");
  const saleProceeds = parseUSDInput(props.saleDraft?.proceedsUsd ?? "");
  const saleUnitPrice = saleQuantity && saleProceeds ? saleProceeds / saleQuantity : null;
  const saleCost = saleQuantity && props.saleDraft
    ? props.saleDraft.sellAll
      ? asNumber(props.saleDraft.totalCostBasisUsd)
      : saleQuantity * asNumber(props.saleDraft.investment.remainingCostBasis.usd) / asNumber(props.saleDraft.investment.remainingQuantity)
    : null;
  const saleProfit = saleProceeds !== null && saleCost !== null ? saleProceeds - saleCost : null;
  const oldCost = asNumber(props.legacyPriceTarget?.amount.usd);
  const oldPrice = parseCryptoPrice(props.legacyUnitPrice);
  const saleOpenQuantity = asNumber(props.saleDraft?.investment.remainingQuantity);

  return <>
    {props.investmentOpen ? <Dialog ariaLabel="Registrar compra de cripto" onClose={() => props.setInvestmentOpen(false)}>
      <FormPanel title="Registrar compra" description={props.availableUsd === null ? "Actualizando el disponible de Bitget..." : `Usá los dólares que ya tenés en Bitget. Disponible: ${formatUSD(props.availableUsd)}. La compra no mueve dinero desde Mercado Pago.`} onClose={() => props.setInvestmentOpen(false)} onSubmit={props.onSaveInvestment} eyebrow="NUEVO LOTE">
        <CryptoOrderOcr expectedSide="BUY" onApply={props.onApplyPurchaseOrder} />
        <div className="form-grid crypto-form-grid">
          <label className="form-field" htmlFor="crypto-investment-date"><span>Fecha</span><input id="crypto-investment-date" type="date" value={props.investmentDraft.date} onChange={(event) => props.setInvestmentDraft({ ...props.investmentDraft, date: event.target.value })} required /></label>
          <SelectField label="Cripto" id="crypto-investment-asset" value={props.investmentDraft.assetCode} onChange={(value) => props.setInvestmentDraft({ ...props.investmentDraft, assetCode: value as CryptoAssetCode })} options={[{ value: "BTCUSDT", label: "BTC / USDT" }, { value: "SOLUSDT", label: "SOL / USDT" }, { value: "ETHUSDT", label: "ETH / USDT" }, { value: "PEPEUSDT", label: "PEPE / USDT" }]} />
          <label className="form-field" htmlFor="crypto-investment-amount"><span>Invertido en USD</span><input id="crypto-investment-amount" inputMode="decimal" value={props.investmentDraft.amountUsd} onChange={(event) => props.setInvestmentDraft({ ...props.investmentDraft, amountUsd: event.target.value })} placeholder="500.00" required /></label>
          <label className="form-field" htmlFor="crypto-investment-price"><span>Precio por unidad (USD)</span><input id="crypto-investment-price" inputMode="decimal" value={props.investmentDraft.unitPriceUsd} onChange={(event) => props.setInvestmentDraft({ ...props.investmentDraft, unitPriceUsd: event.target.value })} placeholder="1.00" required /></label>
          <label className="form-field" htmlFor="crypto-investment-quantity"><span>Unidades recibidas (opcional)</span><input id="crypto-investment-quantity" inputMode="decimal" value={props.investmentDraft.quantity} onChange={(event) => props.setInvestmentDraft({ ...props.investmentDraft, quantity: event.target.value })} placeholder="Se calcula con el precio si queda vacío" /></label>
        </div>
        {purchaseQuantity !== null && Number.isFinite(purchaseQuantity) ? <div className="crypto-conversion-preview"><span>Unidades que comprás</span><strong>{units(purchaseQuantity)}</strong><small>{formatUSD(amountUsd ?? 0)} invertidos · {unitPrice(purchasePrice ?? 0)} por unidad</small></div> : null}
        <FormField label="Nota (opcional)" value={props.investmentDraft.note} onChange={(note) => props.setInvestmentDraft({ ...props.investmentDraft, note })} placeholder="Ej. Compra inicial" multiline />
        {props.error ? <div className="inline-error" role="alert">{props.error}</div> : null}
        <div className="form-actions"><Button variant="quiet" onClick={() => props.setInvestmentOpen(false)}>Cancelar</Button><Button type="submit" disabled={amountUsd === null || amountUsd <= 0 || purchasePrice === null || purchasePrice <= 0 || (props.investmentDraft.quantity.trim() !== "" && (enteredPurchaseQuantity === null || enteredPurchaseQuantity <= 0)) || props.availableUsd === null || amountUsd > props.availableUsd || props.pending}>{props.pending ? "Guardando..." : "Guardar compra"} <span aria-hidden="true">↗</span></Button></div>
      </FormPanel>
    </Dialog> : null}

    {props.saleDraft ? <Dialog ariaLabel={`Vender ${props.saleDraft.investment.assetLabel}`} onClose={() => props.setSaleDraft(null)}>
      <FormPanel title={`Vender ${props.saleDraft.investment.assetLabel}`} description={props.saleDraft.sellAll ? `Se cerrarán todos los lotes abiertos de ${props.saleDraft.investment.assetLabel}. Total: ${units(props.saleDraft.totalQuantity)} unidades.` : `Lote del ${props.saleDraft.investment.date} · ${units(props.saleDraft.investment.remainingQuantity)} unidades disponibles`} onClose={() => props.setSaleDraft(null)} onSubmit={props.onSaveSale} eyebrow={props.saleDraft.sellAll ? "VENTA DE POSICIÓN COMPLETA" : "VENTA DE LOTE"}>
        <CryptoOrderOcr expectedSide="SELL" expectedAssetCode={props.saleDraft.investment.assetCode as CryptoAssetCode} onApply={props.onApplySaleOrder} />
        <div className="crypto-sale-quick-action">
          {props.saleDraft.sellAll
            ? <><span>Venta completa · {units(props.saleDraft.totalQuantity)} unidades</span><Button variant="quiet" onClick={() => props.setSaleDraft((draft) => draft ? { ...draft, sellAll: false, quantity: "" } : null)}>Vender una parte</Button></>
            : <><span>Incluye todos los lotes abiertos de esta moneda</span><Button variant="quiet" disabled={!props.saleDraft.totalQuantity || asNumber(props.saleDraft.totalQuantity) <= 0 || props.pending} onClick={() => props.setSaleDraft((draft) => draft ? { ...draft, sellAll: true, quantity: draft.totalQuantity ?? "" } : null)}>Usar toda la posición · {units(props.saleDraft.totalQuantity)}</Button></>}
        </div>
        <div className="form-grid crypto-form-grid">
          <label className="form-field" htmlFor="crypto-sale-date"><span>Fecha</span><input id="crypto-sale-date" type="date" value={props.saleDraft.date} onChange={(event) => props.setSaleDraft({ ...props.saleDraft!, date: event.target.value })} required /></label>
          <label className="form-field" htmlFor="crypto-sale-quantity"><span>{props.saleDraft.sellAll ? "Unidades de la posición completa" : "Unidades vendidas"}</span><input id="crypto-sale-quantity" inputMode="decimal" max={String(props.saleDraft.sellAll ? props.saleDraft.totalQuantity ?? "" : props.saleDraft.investment.remainingQuantity ?? "")} value={props.saleDraft.quantity} readOnly={props.saleDraft.sellAll} onChange={(event) => props.setSaleDraft({ ...props.saleDraft!, quantity: event.target.value })} placeholder="0.00" required /></label>
          <label className="form-field" htmlFor="crypto-sale-proceeds"><span>Total recibido en USD</span><input id="crypto-sale-proceeds" inputMode="decimal" value={props.saleDraft.proceedsUsd} onChange={(event) => props.setSaleDraft({ ...props.saleDraft!, proceedsUsd: event.target.value })} placeholder="700.00" required /></label>
        </div>
        {saleUnitPrice !== null && saleProfit !== null ? <div className="crypto-conversion-preview"><span>Precio de venta / unidad</span><strong>{unitPrice(saleUnitPrice)}</strong><small>Ganancia realizada {saleProfit >= 0 ? "+" : ""}{formatUSD(saleProfit)} · costo vendido {formatUSD(saleCost ?? 0)}</small></div> : null}
        <FormField label="Nota (opcional)" value={props.saleDraft.note} onChange={(note) => props.setSaleDraft({ ...props.saleDraft!, note })} placeholder="Orden, comisión u otro dato" multiline />
        {props.error ? <div className="inline-error" role="alert">{props.error}</div> : null}
        <div className="form-actions"><Button variant="quiet" onClick={() => props.setSaleDraft(null)}>Cancelar</Button><Button type="submit" disabled={saleQuantity === null || saleQuantity <= 0 || (!props.saleDraft.sellAll && saleQuantity > saleOpenQuantity) || (props.saleDraft.sellAll && !props.saleDraft.totalQuantity) || saleProceeds === null || saleProceeds <= 0 || props.pending}>{props.pending ? "Guardando..." : "Registrar venta"} <span aria-hidden="true">↗</span></Button></div>
      </FormPanel>
    </Dialog> : null}

    {props.legacyPriceTarget ? <Dialog ariaLabel={`Editar precio de compra ${props.legacyPriceTarget.assetLabel}`} onClose={() => props.setLegacyPriceTarget(null)}>
      <FormPanel title="Precio de compra" description={`Compra de ${formatUSD(oldCost)} del ${props.legacyPriceTarget.date}. Indicá el precio unitario real para calcular sus unidades. El importe invertido se conserva.`} onClose={() => props.setLegacyPriceTarget(null)} onSubmit={props.onSaveLegacyPrice} eyebrow="PRECIO HISTÓRICO">
        <label className="form-field" htmlFor="crypto-legacy-price"><span>Precio de compra por unidad (USD)</span><input id="crypto-legacy-price" inputMode="decimal" value={props.legacyUnitPrice} onChange={(event) => props.setLegacyUnitPrice(event.target.value)} placeholder="Precio histórico" required /></label>
        {oldPrice !== null && oldPrice > 0 ? <div className="crypto-conversion-preview"><span>Unidades que se calcularán</span><strong>{units(oldCost / oldPrice)}</strong><small>{unitPrice(oldPrice)} por unidad</small></div> : null}
        {props.error ? <div className="inline-error" role="alert">{props.error}</div> : null}
        <div className="form-actions"><Button variant="quiet" onClick={() => props.setLegacyPriceTarget(null)}>Cancelar</Button><Button type="submit" disabled={oldPrice === null || oldPrice <= 0 || props.pending}>{props.pending ? "Guardando..." : "Guardar precio"} <span aria-hidden="true">↗</span></Button></div>
      </FormPanel>
    </Dialog> : null}

    {props.pendingVoid ? <ConfirmDialog title={`¿Anular ${props.pendingVoid.kind === "purchase" ? "compra" : "venta"} de ${props.pendingVoid.label}?`} description={props.pendingVoid.kind === "purchase" ? "La compra quedará en el historial y su costo dejará de contar en tus posiciones." : "La venta quedará en el historial; se restaurarán las unidades y el saldo del lote."} onCancel={() => props.setPendingVoid(null)} onConfirm={props.onVoid} confirmLabel={props.pending ? "Anulando..." : "Anular movimiento"} confirmDisabled={props.pending} error={props.error} /> : null}
  </>;
}
