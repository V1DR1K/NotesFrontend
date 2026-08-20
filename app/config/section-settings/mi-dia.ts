export const DAY_STATUS_OPTIONS = [
  { value: "green", label: "Verde", shortLabel: "Bien", emoji: "☀" },
  { value: "yellow", label: "Amarillo", shortLabel: "Regular", emoji: "◌" },
  { value: "red", label: "Rojo", shortLabel: "Difícil", emoji: "—" },
] as const;

export type DayStatus = typeof DAY_STATUS_OPTIONS[number]["value"];
