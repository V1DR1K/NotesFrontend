export const FINANCE_BUCKET_OPTIONS = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Egreso" },
  { value: "invested", label: "Invertido" },
  { value: "cash", label: "Caja" },
] as const;

export const FINANCE_CONCEPT_OPTIONS = [
  { value: "monthly_payment", label: "Pago mensual" },
  { value: "freelance", label: "Trabajo freelance" },
  { value: "weekly_purchase", label: "Compra semanal" },
  { value: "fuel", label: "Nafta" },
  { value: "usd_purchase", label: "Compra de USD" },
  { value: "investment_fund", label: "Fondo común" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
] as const;

export const FINANCE_CATEGORY_OPTIONS = [
  { value: "work", label: "Trabajo" },
  { value: "extra", label: "Extra" },
  { value: "food", label: "Comida" },
  { value: "mobility", label: "Movilidad" },
  { value: "dollars", label: "Dólares" },
  { value: "market", label: "Mercado" },
  { value: "home", label: "Casa" },
  { value: "leisure", label: "Ocio" },
  { value: "health", label: "Salud" },
  { value: "other", label: "Otro" },
] as const;

export type FinanceBucket = typeof FINANCE_BUCKET_OPTIONS[number]["value"];
export type FinanceConcept = typeof FINANCE_CONCEPT_OPTIONS[number]["value"];
export type FinanceCategory = typeof FINANCE_CATEGORY_OPTIONS[number]["value"];
