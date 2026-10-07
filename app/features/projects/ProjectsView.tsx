"use client";

import { useState } from "react";
import type { ApiConfig } from "../../lib/api/types";
import { SectionHero, SelectField } from "../../ui/Primitives";
import { TasksView } from "../tasks/TasksView";
import { NotesView } from "../notes/NotesView";
import { FilesView } from "../files/FilesView";

export type ProjectTab = "tasks" | "notes" | "files";
const tabs: { id: ProjectTab; label: string }[] = [
  { id: "tasks", label: "Tareas" },
  { id: "notes", label: "Notas" },
  { id: "files", label: "Archivos" },
];

export function ProjectsView({ config, tab, onTabChange, focusId, editId }: { config: ApiConfig; tab: ProjectTab; onTabChange: (tab: ProjectTab) => void; focusId?: string | null; editId?: string | null }) {
  const [projectCode, setProjectCode] = useState("all");
  const visibleProjects = config.projects.filter((item) => item.active !== false || item.code === projectCode);
  const projectOptions = visibleProjects.map(({ code, label }) => ({ value: code, label }));

  return <div className="projects-view">
    <SectionHero section="projects" title="Proyecto" description="Un lugar para tus tareas, notas y archivos." compact rightSlot={<div className="hero-project-filter"><SelectField label="Proyecto" id="project-filter" value={projectCode} onChange={setProjectCode} options={[{ value: "all", label: "Todos los proyectos" }, ...projectOptions]} /></div>} />
    <div className="projects-navigation">
      <div className="projects-tabs" role="tablist" aria-label="Contenido del proyecto">
        {tabs.map((item, index) => <button key={item.id} id={`project-tab-${item.id}`} type="button" role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`project-panel-${item.id}`} className={tab === item.id ? "projects-tab projects-tab-active" : "projects-tab"} onClick={() => onTabChange(item.id)} onKeyDown={(event) => {
          const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
          if (nextIndex < 0) return;
          event.preventDefault();
          onTabChange(tabs[nextIndex].id);
          document.getElementById(`project-tab-${tabs[nextIndex].id}`)?.focus();
        }}>{item.label}</button>)}
      </div>
    </div>
    <div id={`project-panel-${tab}`} role="tabpanel" aria-labelledby={`project-tab-${tab}`}>
      {tab === "tasks" ? <TasksView key={`tasks:${projectCode}`} config={config} projectCode={projectCode} focusId={focusId} editId={editId} nested /> : tab === "notes" ? <NotesView key={`notes:${projectCode}`} config={config} projectCode={projectCode} focusId={focusId} nested /> : <FilesView key={`files:${projectCode}`} config={config} projectCode={projectCode} focusId={focusId} nested />}
    </div>
  </div>;
}
