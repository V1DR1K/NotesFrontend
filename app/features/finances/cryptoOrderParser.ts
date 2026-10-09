import type { CryptoAssetCode } from "../../lib/api/types";

export type CryptoOrderSide = "BUY" | "SELL";

export type CryptoOrderOcrResult = {
  side: CryptoOrderSide | null;
  assetCode: CryptoAssetCode | null;
  date: string | null;
  quantity: string | null;
  unitPriceUsd: string | null;
  amountUsd: string | null;
  proceedsUsd: string | null;
  note: string;
};

type NumberField = { value: string; currency: string | null };

const numericWithCurrency = /([0-9][0-9\s.,]*[0-9]|[0-9])\s*(USDT|USD|BTC|ETH|SOL|PEPE)?/i;

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function decimalValue(raw: string) {
  let value = raw.replace(/\s/g, "");
  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    value = value.replace(grouping, "").replace(decimal, ".");
  } else if (comma >= 0) {
    const decimals = value.length - comma - 1;
    value = decimals === 3 ? value.replace(/,/g, "") : value.replace(",", ".");
  }
  return value.replace(/[^0-9.]/g, "");
}

function fieldAfterLabel(text: string, labels: string[]): NumberField | null {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const normalized = normalizeText(`${lines[index]} ${lines[index + 1] ?? ""}`).replace(/\s+/g, " ");
    const label = labels.find((candidate) => normalized.includes(candidate));
    if (!label) continue;
    const offset = normalized.indexOf(label) + label.length;
    const candidates = [normalized.slice(offset), normalizeText(lines[index + 2] ?? "")];
    for (const candidate of candidates) {
      const match = candidate.match(numericWithCurrency);
      if (!match) continue;
      const value = decimalValue(match[1]);
      if (!value || !Number.isFinite(Number(value))) continue;
      return { value, currency: match[2]?.toUpperCase() ?? null };
    }
  }
  return null;
}

function dateFromText(text: string) {
  const orderTimestamp = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\s+\d{1,2}:\d{2}(?::\d{2})?\b/);
  const dates = Array.from(text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g));
  const match = orderTimestamp ?? dates.at(-1);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function assetFromText(text: string): CryptoAssetCode | null {
  const match = text.match(/\b((?=[A-Z0-9]{1,15}\b)(?=[A-Z0-9]*[A-Z])[A-Z0-9]+)\s*(?:\/\s*)?USDT\b/i);
  return match ? `${match[1].toUpperCase()}USDT` : null;
}

function currencyIsQuote(currency: string | null) {
  return currency === "USD" || currency === "USDT";
}

function safeUsd(value: number) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : null;
}

export function parseCryptoOrderText(text: string): CryptoOrderOcrResult {
  const normalized = normalizeText(text);
  const side = /\b(venta|sell)\b/.test(normalized) ? "SELL" : /\b(compra|buy)\b/.test(normalized) ? "BUY" : null;
  const assetCode = assetFromText(text);
  const date = dateFromText(text);
  const quantity = fieldAfterLabel(text, ["cantidad completada", "filled quantity", "executed quantity", "filled qty", "cantidad de la orden", "order quantity"]);
  const averagePrice = fieldAfterLabel(text, ["precio completado promedio", "precio completado", "average completed price", "completed price", "average filled price", "filled avg price", "avg. price", "average price"])
    ?? fieldAfterLabel(text, ["precio de la orden", "order price"]);
  const orderPrice = fieldAfterLabel(text, ["precio de la orden", "order price"]);
  const executionValue = fieldAfterLabel(text, ["valor de ejecucion", "execution value", "executed value", "filled value"]);
  const commission = fieldAfterLabel(text, ["comision", "commission"]);
  const timestamp = text.match(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0];
  const gross = executionValue?.value
    ?? (quantity && averagePrice ? safeUsd(Number(quantity.value) * Number(averagePrice.value)) : null);
  const fee = commission && currencyIsQuote(commission.currency) ? Number(commission.value) : 0;
  const investedUsd = gross === null ? null : safeUsd(Number(gross) + (side === "BUY" ? fee : 0));
  const receivedUsd = gross === null ? null : safeUsd(Number(gross) - (side === "SELL" ? fee : 0));

  const orderType = /\bmarket\b|\bmercado\b/.test(normalized) ? "Market" : /\blimit\b|\blimite\b/.test(normalized) ? "Limit" : null;
  const statusLine = text.split(/\r?\n/).find((line) => /estado|\bstatus\b/i.test(normalizeText(line)));
  const status = statusLine?.replace(/.*(?:estado|status)\s*:?\s*/i, "").trim();
  const noteParts = [
    side ? `Orden OCR ${side === "BUY" ? "de compra" : "de venta"}` : "Orden OCR",
    orderType,
    orderPrice ? `precio de orden ${orderPrice.value} ${orderPrice.currency ?? "USDT"}` : null,
    averagePrice ? `precio promedio ${averagePrice.value} USD` : null,
    executionValue ? `ejecución ${executionValue.value} ${executionValue.currency ?? "USDT"}` : null,
    commission ? `comisión ${commission.value} ${commission.currency ?? ""}`.trim() : null,
    status ? `estado ${status}` : null,
    timestamp ? `hora ${timestamp}` : null,
  ].filter(Boolean);

  return {
    side,
    assetCode,
    date,
    quantity: quantity?.value ?? null,
    unitPriceUsd: averagePrice?.value ?? null,
    amountUsd: side === "BUY" ? investedUsd : null,
    proceedsUsd: side === "SELL" ? receivedUsd : null,
    note: noteParts.join(" · ").slice(0, 1000),
  };
}
