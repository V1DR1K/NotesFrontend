export function sortCategoryOptions<T extends { label: string }>(categories: T[]): T[] {
  return [...categories].sort((left, right) =>
    left.label.localeCompare(right.label, "es", { sensitivity: "base" }) || left.label.localeCompare(right.label, "es"),
  );
}

export function defaultCategoryCode<T extends { code: string; label: string; projectCode?: string; active?: boolean }>(categories: T[], projectCode: string): string {
  return sortCategoryOptions(categories).find((category) => category.projectCode === projectCode && category.active !== false)?.code ?? "";
}

export function resolveCategoryScope(value: string): { projectCode: string; categoryCode: string } {
  if (value === "all") return { projectCode: "all", categoryCode: "all" };

  const separator = value.indexOf(":");
  if (separator < 0) return { projectCode: "all", categoryCode: value };

  return {
    projectCode: value.slice(0, separator),
    categoryCode: value.slice(separator + 1),
  };
}
