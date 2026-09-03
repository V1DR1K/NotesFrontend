export const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function currentMonth() {
  return todayIso().slice(0, 7);
}

export function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dateLabel(value?: string, includeTime = false) {
  if (!value) return "Sin fecha";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "");
  return includeTime && value.length > 10 ? `${label} · ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : label;
}

export function weekdayLabel(value?: string) {
  if (!value) return "Sin día";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("es-AR", { weekday: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatARSInput(value: string) {
  const sanitized = value.replace(/\s/g, "").replace(/[^\d,]/g, "");
  if (!sanitized) return "";

  const commaIndex = sanitized.indexOf(",");
  const integerPart = (commaIndex >= 0 ? sanitized.slice(0, commaIndex) : sanitized).replace(/\D/g, "");
  const fractionPart = commaIndex >= 0 ? sanitized.slice(commaIndex + 1).replace(/\D/g, "").slice(0, 2) : "";
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || (commaIndex >= 0 ? "0" : "");
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return commaIndex >= 0 ? `${groupedInteger},${fractionPart}` : groupedInteger;
}

export function formatARSInputNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(number) : "";
}

export function parseARSInput(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.endsWith(",") || !/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(normalized)) return null;

  const number = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function parseUSDInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized || !/^\d+(?:\.\d{1,8})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function formatARS(value: unknown) {
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(asNumber(value))}`;
}

export function formatUSD(value: unknown) {
  return `US$ ${asNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function optionLabel(options: Array<{ code: string; label: string }>, code: string) {
  return options.find((option) => option.code === code)?.label ?? code;
}

export function fieldError(error: { fieldErrors?: Record<string, string> } | null, ...fields: string[]) {
  if (!error?.fieldErrors) return "";
  for (const field of fields) if (error.fieldErrors[field]) return error.fieldErrors[field];
  return "";
}
