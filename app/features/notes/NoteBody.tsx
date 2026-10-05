import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

export function NoteBody({ body, interactiveLinks = true }: { body: string; interactiveLinks?: boolean }) {
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
        {body}
      </Markdown>
    </div>
  );
}
