export const NOTE_CATEGORY_OPTIONS = [
  { value: "ideas", label: "Ideas" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Trabajo" },
] as const;

export type NoteCategory = typeof NOTE_CATEGORY_OPTIONS[number]["value"];
