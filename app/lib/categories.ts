export function sortCategoryOptions<T extends { label: string }>(categories: T[]): T[] {
  return [...categories].sort((left, right) =>
    left.label.localeCompare(right.label, "es", { sensitivity: "base" }) || left.label.localeCompare(right.label, "es"),
  );
}
