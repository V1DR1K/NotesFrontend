export const FILE_KIND_OPTIONS = [
  { value: "document", label: "Documentos", icon: "▤" },
  { value: "image", label: "Imágenes", icon: "▧" },
  { value: "sheet", label: "Planillas", icon: "▦" },
  { value: "archive", label: "Comprimidos", icon: "⌁" },
] as const;

export const FILE_FOLDER_OPTIONS = ["Finanzas", "Moto", "Proyectos"] as const;

export type FileKind = typeof FILE_KIND_OPTIONS[number]["value"];
