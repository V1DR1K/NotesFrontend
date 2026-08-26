import { Fragment, type ReactNode } from "react";

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/;

function linkifyLine(line: string, lineIndex: number): ReactNode[] {
  const content: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const index = match.index ?? 0;
    const trailing = rawUrl.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    if (index > cursor) content.push(line.slice(cursor, index));
    if (url) {
      content.push(
        <a
          className="note-link"
          href={/^www\./i.test(url) ? `https://${url}` : url}
          key={`${lineIndex}-${index}`}
          rel="noopener noreferrer"
          target="_blank"
          title="Abrir enlace en una pestaña nueva"
        >
          {url}
        </a>,
      );
    }
    if (trailing) content.push(trailing);
    cursor = index + rawUrl.length;
  }

  if (cursor < line.length) content.push(line.slice(cursor));
  return content;
}

export function NoteBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);

  return (
    <p className="note-body">
      {lines.map((line, index) => (
        <Fragment key={index}>
          {linkifyLine(line, index)}
          {index < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </p>
  );
}
