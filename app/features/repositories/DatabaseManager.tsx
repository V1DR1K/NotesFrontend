"use client";

import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api/client";
import type { DatabaseColumn, DatabaseScriptResult, DatabaseTable, DatabaseTablePage, RepositoryBackup } from "../../lib/api/types";

type ProjectId = "scalegrams" | "whatplan" | "notes";
const projects: Array<{ id: ProjectId; label: string }> = [
  { id: "scalegrams", label: "ScaleGrams" }, { id: "whatplan", label: "Whatplan" }, { id: "notes", label: "Notes" },
];
const initialSql = "select table_name\nfrom information_schema.tables\nwhere table_schema = 'public'\norder by table_name;";

function showValue(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
function keyFor(row: Record<string, unknown>, columns: string[]) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}
function DatabaseSkeleton() {
  return <div className="db-skeleton" role="status" aria-label="Cargando gestor de datos"><span /><span /><span /><div><i /><i /><i /><i /><i /></div></div>;
}
function BackupAudit({ backup, pending, backupError, onRun }: { backup?: RepositoryBackup; pending: boolean; backupError: string; onRun: () => void }) {
  const attempt = backup?.lastAttempt;
  const success = backup?.lastSuccess;
  return <section className="db-backup-audit">
    <div className="db-backup-copy">
      <h3>Copias de seguridad</h3>
      <p>{backup?.running || attempt?.status === "in_progress" ? "Hay una copia ejecutándose." : attempt?.status === "success" ? "La última ejecución terminó correctamente." : attempt?.status === "failed" ? "La última ejecución falló." : "Todavía no hay un registro disponible."}</p>
      {attempt ? <span>Último intento · {new Date(attempt.startedAt).toLocaleString("es-AR")} · {attempt.status === "success" ? "Correcto" : attempt.status === "failed" ? "Fallido" : "En curso"}</span> : null}
      {success ? <span>Última copia correcta · {new Date(success.startedAt).toLocaleString("es-AR")}</span> : null}
      {attempt?.files?.length ? <span className="db-backup-files">Archivos · {attempt.files.join(" · ")}</span> : null}
      {attempt?.error ? <span className="db-backup-error">{attempt.error}</span> : null}
      {backupError ? <span className="db-backup-error">{backupError}</span> : null}
    </div>
    <button type="button" className="db-button db-button-quiet" disabled={pending || Boolean(backup?.running)} onClick={onRun}>
      {pending ? "Iniciando…" : backup?.running ? "En curso" : "Crear copia"}
    </button>
  </section>;
}

export function DatabaseManager() {
  const [project, setProject] = useState<ProjectId>("scalegrams");
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tablePage, setTablePage] = useState<DatabaseTablePage | null>(null);
  const [page, setPage] = useState(0);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [script, setScript] = useState(initialSql);
  const [mode, setMode] = useState<"read" | "write">("read");
  const [running, setRunning] = useState(false);
  const [scriptResult, setScriptResult] = useState<DatabaseScriptResult | null>(null);
  const [scriptError, setScriptError] = useState("");
  const [backups, setBackups] = useState<RepositoryBackup[]>([]);
  const [backupError, setBackupError] = useState("");
  const [backupPending, setBackupPending] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [inserting, setInserting] = useState(false);
  const extensions = useMemo(() => [sql({ dialect: PostgreSQL })], []);

  const loadTables = useCallback(async (signal?: AbortSignal) => {
    setLoadingTables(true); setError("");
    try {
      const result = await api.databaseTables(project, signal);
      if (signal?.aborted) return;
      setTables(result);
      setSelectedTable((current) => result.some((table) => table.name === current) ? current : result[0]?.name ?? "");
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las tablas.");
    } finally { if (!signal?.aborted) setLoadingTables(false); }
  }, [project]);

  const loadBackups = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.backupStatus();
      if (!signal?.aborted) { setBackups(data.projects ?? []); setBackupError(""); }
    } catch {
      if (!signal?.aborted) setBackupError("No se pudo consultar el estado de Google Drive.");
    }
  }, []);;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadTables(controller.signal); void loadBackups(controller.signal); }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [loadTables, loadBackups]);  const loadRows = useCallback(async (signal?: AbortSignal) => {
    if (!selectedTable) { setTablePage(null); return; }
    setLoadingRows(true); setError("");
    try {
      const result = await api.databaseRows(project, selectedTable, { page, pageSize: 100, filters }, signal);
      if (!signal?.aborted) setTablePage(result);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las filas.");
    } finally { if (!signal?.aborted) setLoadingRows(false); }
  }, [project, selectedTable, page, filters]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadRows(controller.signal); }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [loadRows]);  useEffect(() => { const timer = window.setInterval(() => { void loadBackups(); }, 15000); return () => window.clearInterval(timer); }, [loadBackups]);

  const currentBackup = backups.find((entry) => entry.id === project);
  const activeTable = tables.find((table) => table.name === selectedTable);
  const pageCount = tablePage ? Math.max(1, Math.ceil(tablePage.totalElements / tablePage.pageSize)) : 1;

  const resetGridState = () => { setPage(0); setFilters({}); setFilterColumn(""); setFilterValue(""); setEditingRow(null); setInserting(false); };
  const applyFilter = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setFilters(filterColumn && filterValue.trim() ? { [filterColumn]: filterValue.trim() } : {});
  };
  const runQuery = useCallback(async () => {
    if (running || !script.trim()) return;
    const confirmed = mode === "write" && window.confirm("Este script puede modificar o eliminar datos. Ejecutarlo en " + projects.find((item) => item.id === project)?.label + "? Se aplicará en una sola transacción.");
    if (mode === "write" && !confirmed) return;
    setRunning(true); setScriptError(""); setScriptResult(null);
    try {
      const result = await api.databaseQuery(project, { script, mode, confirmed: mode === "write" });
      setScriptResult(result);
    } catch (cause) { setScriptError(cause instanceof Error ? cause.message : "La consulta no se pudo completar. La transacción se revirtió."); }
    finally { setRunning(false); }
  }, [running, script, mode, project]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && event.target instanceof HTMLElement && event.target.closest(".db-sql-panel")) { event.preventDefault(); void runQuery(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runQuery]);
  const changeMode = (next: "read" | "write") => {
    if (next === "write" && !window.confirm("El modo escritura permite modificar el esquema y los datos. ¿Activarlo?")) return;
    setMode(next);
  };
  const saveRow = async (index: number | null) => {
    if (!activeTable) return;
    const action = index === null ? "insert" : "update";
    if (!window.confirm(action === "insert" ? "¿Insertar esta fila en " + selectedTable + "?" : "¿Guardar los cambios de esta fila?")) return;
    const fields = index === null ? activeTable.columns.filter((column) => !column.generated) : activeTable.columns.filter((column) => !column.primaryKey && !column.generated);
    const values = Object.fromEntries(fields.map((column) => [column.name, editValues[column.name] === "" && column.nullable ? null : editValues[column.name]]));
    const primaryKey = index === null ? {} : keyFor(tablePage?.rows[index] ?? {}, activeTable.primaryKey);
    try {
      await api.databaseMutate(project, selectedTable, { action, primaryKey, values, confirmed: true });
      setEditingRow(null); setInserting(false); await loadRows();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios."); }
  };
  const deleteRow = async (row: Record<string, unknown>) => {
    if (!activeTable || !window.confirm("¿Eliminar esta fila? Esta acción no se puede deshacer.")) return;
    try {
      await api.databaseMutate(project, selectedTable, { action: "delete", primaryKey: keyFor(row, activeTable.primaryKey), values: {}, confirmed: true });
      await loadRows();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la fila."); }
  };
  const runBackup = async () => {
    if (!window.confirm("Iniciar una copia de seguridad de " + projects.find((item) => item.id === project)?.label + " en Google Drive?")) return;
    setBackupPending(true);
    try { await api.startBackup(project); await loadBackups(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar la copia."); }
    finally { setBackupPending(false); }
  };

  return <div className="database-manager">
    <div className="db-toolbar">
      <label className="db-project-select"><span>Proyecto</span><select value={project} onChange={(event) => { resetGridState(); setProject(event.target.value as ProjectId); }}>{projects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <span className="db-connection"><i /> PostgreSQL · conexión segura</span>
      <span className="db-schema-label">public</span>
    </div>
    {error ? <div className="db-inline-error" role="alert">{error}<button type="button" onClick={() => { void loadTables(); void loadRows(); }}>Reintentar</button></div> : null}
    <div className="db-workbench">
      <aside className="db-explorer" aria-label="Explorador de tablas">
        <header><strong>Tablas</strong><span>{tables.length}</span></header>
        <div className="db-explorer-list">
          {loadingTables ? <><i className="db-table-skeleton" /><i className="db-table-skeleton" /><i className="db-table-skeleton" /></> :
            tables.map((table) => <button type="button" key={table.name} className={selectedTable === table.name ? "db-table-item active" : "db-table-item"} onClick={() => { resetGridState(); setSelectedTable(table.name); }}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="3.5" rx="5.5" ry="2" /><path d="M2.5 3.5v8.9c0 1.1 2.5 2.1 5.5 2.1s5.5-1 5.5-2.1V3.5M2.5 7.8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" /></svg>
              <span>{table.name}</span>{table.primaryKey.length ? <b aria-label="Tiene clave primaria">◆</b> : null}
            </button>)}
          {!loadingTables && tables.length === 0 ? <p className="db-empty">No hay tablas públicas.</p> : null}
        </div>
      </aside>
      <div className="db-workspace">
        <section className="db-sql-panel">
          <header className="db-panel-header">
            <div><h2>Editor SQL</h2><span>{mode === "read" ? "Sólo lectura" : "Escritura confirmada"}</span></div>
            <div className="db-sql-actions">
              <div className="db-mode-toggle" role="group" aria-label="Modo SQL">
                <button type="button" className={mode === "read" ? "selected" : ""} onClick={() => changeMode("read")}>Lectura</button>
                <button type="button" className={mode === "write" ? "selected write" : ""} onClick={() => changeMode("write")}>Escritura</button>
              </div>
              <button type="button" className="db-button db-button-run" disabled={running} onClick={() => void runQuery()}>{running ? "Ejecutando…" : "Ejecutar"}</button>
            </div>
          </header>
          <CodeMirror value={script} onChange={setScript} height="210px" theme={oneDark} extensions={extensions} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }} aria-label="Editor de sentencias SQL PostgreSQL" />
          <div className="db-sql-footer"><span>PostgreSQL · hasta 500 filas por resultado</span><span>Ctrl / ⌘ + Enter para ejecutar</span></div>
          <SqlOutput result={scriptResult} error={scriptError} />
        </section>

        <section className="db-data-panel">
          <header className="db-panel-header db-data-heading">
            <div><h2>{selectedTable || "Datos de tabla"}</h2><span>{tablePage ? tablePage.totalElements.toLocaleString("es-AR") + " filas" : activeTable?.columns.length + " columnas"}</span></div>
            {activeTable && !tablePage?.readOnly ? <button type="button" className="db-button db-button-quiet" onClick={() => { setInserting(true); setEditingRow(null); setEditValues(Object.fromEntries(activeTable.columns.filter((column) => !column.generated).map((column) => [column.name, ""]))); }}>Nueva fila</button> : null}
          </header>
          {activeTable ? <form className="db-filter" onSubmit={applyFilter}>
            <label><span>Filtrar</span><select aria-label="Columna del filtro" value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)}><option value="">Todas las columnas</option>{activeTable.columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
            <input aria-label="Texto de filtro" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="Buscar en esta tabla" />
            <button className="db-button db-button-quiet" type="submit">Aplicar</button>
          </form> : null}
          {loadingRows && !tablePage ? <DatabaseSkeleton /> : null}
          {tablePage ? <div className="db-grid-scroll">
            <table className="db-grid"><thead><tr>{tablePage.columns.map((column) => <th key={column.name}><span>{column.name}</span><small>{column.dataType}{column.primaryKey ? " · PK" : ""}</small></th>)}{!tablePage.readOnly ? <th className="db-actions-heading">Acciones</th> : null}</tr></thead>
              <tbody>
                {inserting && activeTable ? <EditableRow columns={activeTable.columns} values={editValues} onChange={setEditValues} onSave={() => void saveRow(null)} onCancel={() => setInserting(false)} /> : null}
                {tablePage.rows.map((row, index) => editingRow === index && activeTable ? <EditableRow key={index} columns={activeTable.columns} values={editValues} onChange={setEditValues} onSave={() => void saveRow(index)} onCancel={() => setEditingRow(null)} /> :
                  <tr key={index}>{tablePage.columns.map((column) => <td key={column.name} title={showValue(row[column.name])}>{showValue(row[column.name])}</td>)}{!tablePage.readOnly ? <td className="db-row-actions"><button type="button" onClick={() => { setEditingRow(index); setInserting(false); setEditValues({ ...row }); }}>Editar</button><button type="button" className="danger" onClick={() => void deleteRow(row)}>Eliminar</button></td> : null}</tr>)}
                {!inserting && tablePage.rows.length === 0 ? <tr><td className="db-grid-empty" colSpan={tablePage.columns.length + (tablePage.readOnly ? 0 : 1)}>No hay filas que coincidan.</td></tr> : null}
              </tbody>
            </table>
          </div> : !loadingTables && !selectedTable ? <p className="db-empty db-empty-main">Seleccioná una tabla para explorar sus datos.</p> : null}
          {tablePage ? <footer className="db-pagination"><span>Página {page + 1} de {pageCount}</span><div><button type="button" disabled={page === 0 || loadingRows} onClick={() => setPage((value) => Math.max(0, value - 1))}>Anterior</button><button type="button" disabled={page + 1 >= pageCount || loadingRows} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></footer> : null}
        </section>

        <BackupAudit backup={currentBackup} pending={backupPending} backupError={backupError} onRun={() => void runBackup()} />
      </div>
    </div>
  </div>;
}

function EditableRow({ columns, values, onChange, onSave, onCancel }: { columns: DatabaseColumn[]; values: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void; onSave: () => void; onCancel: () => void }) {
  return <tr className="db-editing-row">{columns.map((column) => <td key={column.name}>{column.generated ? <span className="db-generated">Generada</span> : column.primaryKey && Object.hasOwn(values, column.name) ? <code>{showValue(values[column.name])}</code> :
    <input aria-label={column.name} value={values[column.name] === null ? "" : String(values[column.name] ?? "")} placeholder={column.nullable ? "NULL" : column.dataType} onChange={(event) => onChange({ ...values, [column.name]: event.target.value })} />}</td>)}<td className="db-row-actions"><button type="button" onClick={onSave}>Guardar</button><button type="button" onClick={onCancel}>Cancelar</button></td></tr>;
}
function SqlOutput({ result, error }: { result: DatabaseScriptResult | null; error: string }) {
  if (error) return <div className="db-sql-error" role="alert">{error}</div>;
  if (!result) return null;
  return <div className="db-sql-output" aria-live="polite">
    <div className="db-output-status">{result.committed ? "Transacción confirmada" : "Sin cambios"} · {result.elapsedMilliseconds} ms · {result.results.length} sentencias</div>
    {result.results.map((item, index) => <div className="db-result-table" key={index}>
      {item.columns.length ? <div className="db-grid-scroll"><table className="db-grid"><thead><tr>{item.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{item.rows.map((row, rowIndex) => <tr key={rowIndex}>{item.columns.map((column) => <td key={column}>{showValue(row[column])}</td>)}</tr>)}</tbody></table></div> : <p>{item.affectedRows ?? 0} filas afectadas</p>}
      {item.truncated ? <span className="db-truncated">Se muestran las primeras 500 filas.</span> : null}
    </div>)}
  </div>;
}
