import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Children, createElement, isValidElement, type ReactNode } from "react";

type MarkdownHeading = { label: string; level: number; id: string };
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function plainHeadingText(source: string) {
  return source
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function headingSlug(source: string) {
  return plainHeadingText(source)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || "seccion";
}

function collectHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.split("\n");
  const headings: MarkdownHeading[] = [];
  const occurrences = new Map<string, number>();
  let fence: { marker: string; length: number } | null = null;
  const addHeading = (rawLabel: string, level: number) => {
    const label = plainHeadingText(rawLabel);
    if (!label) return;
    const slug = headingSlug(label);
    const occurrence = occurrences.get(slug) ?? 0;
    occurrences.set(slug, occurrence + 1);
    headings.push({ label, level, id: `note-heading-${slug}-${occurrence + 1}` });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      const closingFence = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (closingFence && closingFence[1][0] === fence.marker && closingFence[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length };
      continue;
    }

    const atx = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*?)\s*$/);
    if (atx) {
      addHeading(atx[2].replace(/[ \t]+#+[ \t]*$/, ""), atx[1].length);
      continue;
    }

    const setext = lines[index + 1]?.match(/^ {0,3}(=+|-+)[ \t]*$/);
    if (setext && line.trim()) {
      addHeading(line.trim(), setext[1][0] === "=" ? 1 : 2);
      index += 1;
    }
  }

  return headings;
}

function textFromChildren(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return textFromChildren(child.props.children);
    return "";
  }).join("");
}

function normalizeMarkdownLineBreaks(source: string) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let fence: { marker: "`" | "~"; length: number } | null = null;

  return lines.map((line) => {
    const fenceLine = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (fenceLine && fenceLine[1][0] === fence.marker && fenceLine[1].length >= fence.length) fence = null;
      return line;
    }
    if (fenceLine) {
      fence = { marker: fenceLine[1][0] as "`" | "~", length: fenceLine[1].length };
      return line;
    }

    const segments = line.split(/(`+[^`]*`+)/g);
    return segments.map((segment, index) => index % 2 === 0 ? segment.replace(/\\r\\n|\\n|\\r/g, "\n") : segment).join("");
  }).join("\n");
}

export function NoteBody({ body, interactiveLinks = true, withContentsIndex = false }: { body: string; interactiveLinks?: boolean; withContentsIndex?: boolean }) {
  const markdown = normalizeMarkdownLineBreaks(body);
  const headings = withContentsIndex ? collectHeadings(markdown) : [];
  const hasIndex = headings.length > 1;
  const headingOccurrences = new Map<string, number>();
  const renderHeading = (tag: HeadingTag) => {
    function MarkdownHeadingRenderer({ children }: { children?: ReactNode }) {
      const slug = headingSlug(textFromChildren(children));
      const occurrence = headingOccurrences.get(slug) ?? 0;
      headingOccurrences.set(slug, occurrence + 1);
      return createElement(tag, { id: hasIndex ? `note-heading-${slug}-${occurrence + 1}` : undefined, tabIndex: hasIndex ? -1 : undefined }, children);
    }
    return MarkdownHeadingRenderer;
  };
  const markdownContent = (
    <div className="note-body note-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: renderHeading("h1"),
          h2: renderHeading("h2"),
          h3: renderHeading("h3"),
          h4: renderHeading("h4"),
          h5: renderHeading("h5"),
          h6: renderHeading("h6"),
          a: ({ href, children }) => interactiveLinks
            ? <a className="note-link" href={href} rel="noopener noreferrer" target="_blank" title="Abrir enlace en una pestaña nueva">{children}</a>
            : <span className="note-link">{children}</span>,
          input: ({ checked }) => <span className="note-task-checkbox" aria-hidden="true">{checked ? "☑" : "☐"}</span>,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );

  if (!withContentsIndex) return markdownContent;

  return (
    <div className={`markdown-preview-layout${hasIndex ? " markdown-preview-layout--indexed" : ""}`}>
      {hasIndex ? <nav className="markdown-preview-index" aria-label="Índice del contenido">
        <span className="markdown-preview-index-title">EN ESTE TEXTO</span>
        <ol>
          {headings.map((heading) => <li key={heading.id} data-level={heading.level}><a href={`#${heading.id}`} onClick={(event) => {
            event.preventDefault();
            const target = document.getElementById(heading.id);
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          }}>{heading.label}</a></li>)}
        </ol>
      </nav> : null}
      {markdownContent}
    </div>
  );
}
