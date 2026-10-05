import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

export function NoteBody({ body }: { body: string }) {
  return (
    <div className="note-body note-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a className="note-link" href={href} rel="noopener noreferrer" target="_blank" title="Abrir enlace en una pestaña nueva">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
