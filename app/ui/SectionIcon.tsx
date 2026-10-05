import { SECTION_META, type SectionKey } from "../config/sections";

export function SectionIcon({ section }: { section: SectionKey }) {
  if (section !== "repositories") return SECTION_META[section].icon;

  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 6v4a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v2" />
      <path d="M7 10v8" />
      <circle cx="7" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
    </svg>
  );
}
