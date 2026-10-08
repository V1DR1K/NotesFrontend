"use client";

import { useState } from "react";

export type MarkdownPreviewHeading = { label: string; level: number; id: string };

type HeadingNode = MarkdownPreviewHeading & { children: HeadingNode[] };

function buildHeadingTree(headings: MarkdownPreviewHeading[]): HeadingNode[] {
  const roots: HeadingNode[] = [];
  const stack: { level: number; node: HeadingNode }[] = [];

  headings.forEach((heading) => {
    const node: HeadingNode = { ...heading, children: [] };
    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push({ level: heading.level, node });
  });

  return roots;
}

export function MarkdownPreviewIndex({ headings }: { headings: MarkdownPreviewHeading[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const tree = buildHeadingTree(headings);

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItems = (items: HeadingNode[]) => items.map((heading) => {
    const hasChildren = heading.children.length > 0;
    const isCollapsed = collapsed.has(heading.id);
    return (
      <li key={heading.id} data-level={heading.level}>
        <div className="markdown-preview-index-item">
          {hasChildren ? <button
            type="button"
            className={`markdown-preview-index-toggle${isCollapsed ? " markdown-preview-index-toggle-collapsed" : ""}`}
            aria-label={`${isCollapsed ? "Expandir" : "Contraer"} secciones de ${heading.label}`}
            aria-expanded={!isCollapsed}
            onClick={() => toggle(heading.id)}
          ><span aria-hidden="true">⌄</span></button> : <span className="markdown-preview-index-marker" aria-hidden="true" />}
          <a className="markdown-preview-index-link" href={`#${heading.id}`} onClick={(event) => {
            event.preventDefault();
            const target = document.getElementById(heading.id);
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          }}>{heading.label}</a>
        </div>
        {hasChildren && !isCollapsed ? <ol className="markdown-preview-index-children">{renderItems(heading.children)}</ol> : null}
      </li>
    );
  });

  return (
    <nav className="markdown-preview-index" aria-label="Índice del contenido">
      <span className="markdown-preview-index-title">EN ESTE TEXTO</span>
      <ol className="markdown-preview-index-list">{renderItems(tree)}</ol>
    </nav>
  );
}
