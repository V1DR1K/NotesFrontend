"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api/client";
import type { RepositoryComponent, RepositoryPipeline, RepositoryStatuses } from "../../lib/api/types";
import { SectionHero } from "../../ui/Primitives";
import { DatabaseManager } from "./DatabaseManager";

const relativeTime = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

function timeAgo(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Sin fecha";
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  const amount = seconds;
  for (const [limit, unit] of ranges) {
    if (Math.abs(amount) < limit) {
      const divisor = unit === "second" ? 1 : unit === "minute" ? 60 : unit === "hour" ? 3600 : unit === "day" ? 86400 : unit === "week" ? 604800 : unit === "month" ? 2629800 : 31557600;
      return relativeTime.format(Math.round(seconds / divisor), unit);
    }
  }
  return relativeTime.format(Math.round(seconds / 31557600), "year");
}

function pipelineText(pipeline: RepositoryPipeline): string {
  if (!pipeline.available || pipeline.status === "unavailable") return "Sin datos";
  if (pipeline.status === "no_runs") return "Sin ejecuciones";
  if (pipeline.status === "in_progress") return "En curso";
  if (pipeline.status === "queued" || pipeline.status === "waiting" || pipeline.status === "requested") return "En cola";
  if (pipeline.status !== "completed") return pipeline.status.replaceAll("_", " ");
  switch (pipeline.conclusion) {
    case "success": return "Correcta";
    case "failure": return "Fallida";
    case "cancelled": return "Cancelada";
    case "timed_out": return "Agotó el tiempo";
    case "skipped": return "Omitida";
    case "action_required": return "Requiere atención";
    default: return "Completada";
  }
}

function pipelineTone(pipeline: RepositoryPipeline): string {
  if (!pipeline.available || pipeline.status === "no_runs") return "repository-tone-muted";
  if (pipeline.status === "in_progress" || pipeline.status === "queued" || pipeline.status === "waiting" || pipeline.status === "requested") return "repository-tone-progress";
  if (pipeline.status === "completed" && pipeline.conclusion === "success") return "repository-tone-success";
  if (pipeline.status === "completed" && pipeline.conclusion && pipeline.conclusion !== "skipped") return "repository-tone-failure";
  return "repository-tone-muted";
}

function deploymentText(component: RepositoryComponent): string {
  const { state, health } = component.deployment;
  if (state !== "running") return state === "unknown" ? "Sin datos" : state.replaceAll("_", " ");
  if (health === "healthy") return "Activa · saludable";
  if (health === "unhealthy") return "Activa · revisar";
  if (health === "starting") return "Iniciando";
  return "Activa";
}

function imageDigest(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("sha256:") ? value.slice(0, 19) + "…" : value;
}

function RepositoryComponentCard({ component }: { component: RepositoryComponent }) {
  const pipeline = component.pipeline;
  const deployment = component.deployment;
  const runAt = pipeline.updatedAt ?? pipeline.startedAt;
  const pipelineLabel = pipelineText(pipeline);
  const deploymentLabel = deploymentText(component);
  return (
    <article className="repository-component">
      <header className="repository-component-header">
        <div>
          <span className="repository-component-kind">{component.label}</span>
          <a className="repository-name" href={"https://github.com/" + component.fullName} target="_blank" rel="noreferrer">{component.fullName}<span aria-hidden="true"> ↗</span></a>
        </div>
        <span className={"repository-status-pill " + pipelineTone(pipeline)}>{pipelineLabel}</span>
      </header>

      <div className="repository-run">
        <span className="repository-field-label">ÚLTIMA PIPELINE</span>
        <div className="repository-run-main">
          {pipeline.url ? <a href={pipeline.url} target="_blank" rel="noreferrer">{pipeline.workflowName || "Ver ejecución"}{pipeline.runNumber ? " · #" + pipeline.runNumber : ""} ↗</a> : <span>{pipeline.workflowName || "Ejecución sin enlace"}</span>}
          <span>{timeAgo(runAt)}</span>
        </div>
        {pipeline.sha ? (
          <a className="repository-sha" href={"https://github.com/" + component.fullName + "/commit/" + pipeline.sha} target="_blank" rel="noreferrer" title={pipeline.sha}>
            <span className="repository-field-label">COMMIT</span><code>{pipeline.sha}</code>
          </a>
        ) : <span className="repository-sha repository-sha-empty">Commit no disponible</span>}
        {pipeline.stale ? <p className="repository-stale-note">GitHub no respondió; se muestra la última ejecución guardada.</p> : null}
      </div>

      <div className="repository-deployment">
        <div className="repository-deployment-heading">
          <span className="repository-field-label">EN LA VPS</span>
          <span className={deployment.state === "running" ? "repository-running" : "repository-not-running"}><i aria-hidden="true" />{deploymentLabel}</span>
        </div>
        {deployment.image ? <code className="repository-image" title={deployment.image}>{deployment.image}</code> : <span className="repository-image-empty">Imagen no registrada</span>}
        <div className="repository-deployment-meta">
          <span>{deployment.startedAt ? "Activa desde " + timeAgo(deployment.startedAt) : "Inicio sin registro"}</span>
          {deployment.imageId ? <code title={deployment.imageId}>{imageDigest(deployment.imageId)}</code> : null}
        </div>
      </div>
    </article>
  );
}

function RepositorySkeleton() {
  return (
    <div className="repository-skeleton-list" role="status" aria-busy="true" aria-label="Cargando pipelines e imágenes de los repositorios">
      {["ScaleGrams", "Whatplan", "Notes"].map((project) => (
        <section className="repository-project repository-skeleton-project" aria-hidden="true" key={project}>
          <header className="repository-project-header">
            <div className="repository-skeleton-project-heading">
              <span className="repository-skeleton-line repository-skeleton-project-index" />
              <span className="repository-skeleton-line repository-skeleton-project-name" />
            </div>
            <span className="repository-skeleton-line repository-skeleton-service-count" />
          </header>
          <div className="repository-components">
            {["Frontend", "Backend"].map((service) => (
              <article className="repository-component repository-component-skeleton" key={service}>
                <div className="repository-component-header">
                  <div className="repository-skeleton-component-heading">
                    <span className="repository-skeleton-line repository-skeleton-kind" />
                    <span className="repository-skeleton-line repository-skeleton-repository" />
                  </div>
                  <span className="repository-skeleton-line repository-skeleton-status" />
                </div>
                <div className="repository-run">
                  <span className="repository-skeleton-line repository-skeleton-label" />
                  <span className="repository-skeleton-line repository-skeleton-workflow" />
                  <span className="repository-skeleton-line repository-skeleton-commit" />
                </div>
                <div className="repository-deployment">
                  <span className="repository-skeleton-line repository-skeleton-label" />
                  <span className="repository-skeleton-line repository-skeleton-image" />
                  <span className="repository-skeleton-line repository-skeleton-age" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function RepositoriesView({ role = "USER" }: { role?: string }) {
  const [activeTab, setActiveTab] = useState<"pipelines" | "datos">("pipelines");
  const canManageData = role.toUpperCase() === "ADMIN";
  const [data, setData] = useState<RepositoryStatuses | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api.repositories(signal);
      setData(result);
      setError("");
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el estado de los repositorios.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshGithub = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await api.refreshRepositories();
      setData(result);
      setError("");
      setNow(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la consulta a GitHub.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => { void load(controller.signal); }, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    if (!data?.refreshAvailableAt) return;
    const refreshAt = Date.parse(data.refreshAvailableAt);
    if (!Number.isFinite(refreshAt)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, Math.max(0, refreshAt - Date.now()) + 1000);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [data?.refreshAvailableAt, load]);

  const checkedAt = data?.checkedAt ? Date.parse(data.checkedAt) : NaN;
  const manualRefreshAt = data?.manualRefreshAvailableAt ? Date.parse(data.manualRefreshAvailableAt) : NaN;
  const manualRefreshAvailable = !Number.isFinite(manualRefreshAt) || now >= manualRefreshAt;
  const refreshAt = data?.refreshAvailableAt ? Date.parse(data.refreshAvailableAt) : NaN;
  const nextCheck = Number.isFinite(refreshAt) && refreshAt > now ? timeAgo(new Date(refreshAt).toISOString()) : null;

  useEffect(() => {
    if (!Number.isFinite(manualRefreshAt)) return;
    const delay = manualRefreshAt - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), delay + 25);
    return () => window.clearTimeout(timer);
  }, [manualRefreshAt]);

  return (
    <div className="repositories-view">
      <SectionHero
        section="repositories"
        rightSlot={
          <div className="repository-refresh-card">
            <span className="repository-field-label">ÚLTIMA CONSULTA A GITHUB</span>
            <strong>{Number.isFinite(checkedAt) ? timeAgo(data?.checkedAt) : loading ? "Consultando…" : "Todavía sin datos"}</strong>
            <span className="repository-refresh-note">
              {!manualRefreshAvailable
                ? "Consulta manual disponible " + timeAgo(new Date(manualRefreshAt).toISOString()) + "."
                : nextCheck
                  ? "Próxima consulta automática " + nextCheck
                  : "Se actualiza automáticamente cada 10 minutos."}
            </span>
            <button
              type="button"
              className="repository-refresh-button"
              disabled={loading || refreshing || !manualRefreshAvailable}
              onClick={() => void refreshGithub()}
              aria-busy={refreshing}
              aria-label={refreshing ? "Consultando GitHub" : "Actualizar consulta a GitHub"}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.1 6A5.2 5.2 0 0 0 3.4 4.8L2 6.2m0-3v3h3m-2.1 3.8A5.2 5.2 0 0 0 12.6 11l1.4-1.4m0 3v-3h-3" /></svg>
              <span>{refreshing ? "Consultando GitHub…" : manualRefreshAvailable ? "Actualizar ahora" : "Disponible " + timeAgo(new Date(manualRefreshAt).toISOString())}</span>
            </button>
          </div>
        }
      />

      <nav className="repository-tabs" role="tablist" aria-label="Secciones de repositorios">
        <button type="button" role="tab" aria-selected={activeTab === "pipelines"} className={activeTab === "pipelines" ? "active" : ""} onClick={() => setActiveTab("pipelines")}>Pipelines</button>
        {canManageData ? <button type="button" role="tab" aria-selected={activeTab === "datos"} className={activeTab === "datos" ? "active" : ""} onClick={() => setActiveTab("datos")}>Datos</button> : null}
      </nav>
      {activeTab === "pipelines" && error && !data ? (
        <section className="repository-message repository-error" role="alert">
          <strong>No pudimos consultar los repositorios</strong>
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }}>Reintentar</button>
        </section>
      ) : null}

      {activeTab === "pipelines" && loading && !data ? <RepositorySkeleton /> : null}

      {activeTab === "pipelines" && data ? (
        <div className="repository-project-list" aria-live="polite">
          {data.projects.map((project) => (
            <section className="repository-project" key={project.id}>
              <header className="repository-project-header">
                <div><span className="repository-project-index">{project.id.toUpperCase()}</span><h2>{project.name}</h2></div>
                <span>{project.components.length} servicios</span>
              </header>
              <div className="repository-components">
                {project.components.map((component) => <RepositoryComponentCard key={component.id} component={component} />)}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {activeTab === "pipelines" && error && data ? <p className="repository-inline-error" role="status">No se pudo actualizar. Se conservan los datos cargados. <button type="button" onClick={() => { setLoading(true); void load(); }}>Reintentar</button></p> : null}
      {activeTab === "datos" && canManageData ? <DatabaseManager /> : null}
    </div>
  );
}
