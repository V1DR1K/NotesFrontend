import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

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

export function NoteBody({ body, interactiveLinks = true }: { body: string; interactiveLinks?: boolean }) {
  const markdown = normalizeMarkdownLineBreaks(body);
  return (
    <div className="note-body note-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
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
}
