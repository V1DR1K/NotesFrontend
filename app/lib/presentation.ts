export const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export function dateLabel(value?: string, includeTime = false) {
  if (!value) return "Sin fecha";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "");
  return includeTime && value.length > 10 ? `${label} · ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : label;
}

export function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatARS(value: unknown) {
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(asNumber(value))}`;
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
