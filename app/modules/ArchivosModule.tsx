"use client";

import { useMemo, useRef, useState } from "react";
import { INITIAL_FILES, type FileEntry, type FileKind } from "../config/mock-data";
import { FILE_FOLDER_OPTIONS, FILE_KIND_OPTIONS } from "../config/section-settings/archivos";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, VisualTile } from "../ui/Primitives";

const kindLabels = Object.fromEntries(FILE_KIND_OPTIONS.map((option) => [option.value, option.label])) as Record<FileKind, string>;
const kindIcons = Object.fromEntries(FILE_KIND_OPTIONS.map((option) => [option.value, option.icon])) as Record<FileKind, string>;
const pageSize = 3;

const getFileKind = (name: string): FileKind => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(extension ?? "")) return "image";
  if (["xls", "xlsx", "csv", "ods"].includes(extension ?? "")) return "sheet";
  if (["zip", "rar", "7z"].includes(extension ?? "")) return "archive";
  return "document";
};

const formatFileSize = (size: number) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;

export function ArchivosModule() {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [folders, setFolders] = useState([...FILE_FOLDER_OPTIONS]);
  const [filter, setFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [folderComposerOpen, setFolderComposerOpen] = useState(false);
  const [uploadComposerOpen, setUploadComposerOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = useMemo(() => files.filter((file) => (filter === "all" || file.kind === filter) && (folderFilter === "all" || file.folder === folderFilter)), [files, filter, folderFilter]);
  const pages = Math.max(1, Math.ceil(filteredFiles.length / pageSize));
  const visibleFiles = filteredFiles.slice((page - 1) * pageSize, page * pageSize);
  const countFor = (value: string) => value === "all" ? files.length : files.filter((file) => file.kind === value).length;

  const handleFile = (file: File) => {
    const newFile: FileEntry = { id: `file-${Date.now()}`, name: file.name, kind: getFileKind(file.name), folder: "Sin carpeta", dateLabel: "Hoy · ahora", size: formatFileSize(file.size) };
    setFiles((current) => [newFile, ...current]);
    setPage(1);
    setUploadComposerOpen(false);
  };

  const createFolder = () => {
    const cleanName = folderName.trim();
    if (!cleanName || folders.includes(cleanName)) return;
    setFolders((current) => [...current, cleanName]);
    setFolderName("");
    setFolderComposerOpen(false);
  };

  const startRename = (file: FileEntry) => { setRenameId(file.id); setRenameValue(file.name); };
  const saveRename = () => {
    if (!renameId || !renameValue.trim()) return;
    setFiles((current) => current.map((file) => file.id === renameId ? { ...file, name: renameValue.trim() } : file));
    setRenameId(null);
  };
  const deleteFile = () => {
    if (!pendingDelete) return;
    setFiles((current) => current.filter((file) => file.id !== pendingDelete));
    setPendingDelete(null);
  };
  const updateFilter = (value: string) => { setFilter(value); setPage(1); };
  const updateFolder = (value: string) => { setFolderFilter(value); setPage(1); };

  return (
    <div className="view module-view">
      <SectionHero section="files" onAction={() => setUploadComposerOpen(true)} rightSlot={<div className="storage-card"><div className="storage-card-top"><span className="eyebrow">ESPACIO USADO</span><strong>36%</strong></div><div className="storage-bar"><span /></div><small>3.6 GB de 10 GB · almacenamiento preparado</small><Button variant="ghost" onClick={() => setFolderComposerOpen(true)}>+ Nueva carpeta</Button></div>} />
      <input ref={fileInputRef} className="visually-hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFile(file); event.target.value = ""; }} />

      {uploadComposerOpen ? <Dialog ariaLabel="Subir archivo" onClose={() => setUploadComposerOpen(false)}><FormPanel title="Subir archivo" description="Elegí un archivo o soltalo en el área. Después podrá guardarse como multipartfile en el backend." onClose={() => setUploadComposerOpen(false)}><div className="upload-modal-zone"><div className="dropzone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) handleFile(file); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}><span className="dropzone-icon">↑</span><span><strong>Soltá un archivo acá</strong><small>o hacé clic para buscarlo en tu dispositivo</small></span><span className="dropzone-meta">MULTIPART READY</span></div></div><div className="form-actions"><Button variant="quiet" onClick={() => fileInputRef.current?.click()}>Elegir archivo</Button><Button variant="ghost" onClick={() => setUploadComposerOpen(false)}>Cerrar</Button></div></FormPanel></Dialog> : null}
      {folderComposerOpen ? <Dialog ariaLabel="Crear carpeta" onClose={() => setFolderComposerOpen(false)}><FormPanel title="Crear carpeta" description="Las carpetas funcionan como categorías y después podrán mapearse al repositorio." onClose={() => setFolderComposerOpen(false)}><div className="form-grid"><FormField label="Nombre de la carpeta" value={folderName} onChange={setFolderName} placeholder="Ej. Documentación" /></div><div className="form-actions"><Button variant="quiet" onClick={() => setFolderComposerOpen(false)}>Cancelar</Button><Button onClick={createFolder} disabled={!folderName.trim()}>Crear carpeta <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
      {renameId ? <Dialog ariaLabel="Renombrar archivo" onClose={() => setRenameId(null)}><FormPanel title="Renombrar archivo" description="El nombre se actualiza solo en esta vista hasta conectar el backend." onClose={() => setRenameId(null)}><div className="form-grid"><FormField label="Nombre" value={renameValue} onChange={setRenameValue} /></div><div className="form-actions"><Button variant="quiet" onClick={() => setRenameId(null)}>Cancelar</Button><Button onClick={saveRename} disabled={!renameValue.trim()}>Guardar nombre <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}

      <ModuleToolbar resultLabel={`${filteredFiles.length} archivos`}>
        <FilterPills active={filter} onChange={updateFilter} options={[{ value: "all", label: "Todos", count: countFor("all") }, ...FILE_KIND_OPTIONS.map(({ value, label }) => ({ value, label, count: countFor(value) }))]} />
        <SelectField label="Carpeta" compact value={folderFilter} onChange={updateFolder} options={[{ value: "all", label: "Todas las carpetas" }, ...folders.map((folder) => ({ value: folder, label: folder }))]} />
      </ModuleToolbar>

      {visibleFiles.length ? <div className="content-grid files-grid">{visibleFiles.map((file) => <article className="content-card file-card" key={file.id}>
        <div className="content-card-top"><span className="mono-date">{file.dateLabel}</span><CardActions onEdit={() => startRename(file)} onDelete={() => setPendingDelete(file.id)} /></div>
        <div className="file-card-heading"><VisualTile emoji={kindIcons[file.kind]} label={kindLabels[file.kind]} /><div><span className="file-kind">{kindLabels[file.kind]}</span><span className="file-size">{file.size}</span></div></div>
        <h2 title={file.name}>{file.name}</h2><div className="file-folder"><span>▱</span>{file.folder}</div>
        <div className="card-footer"><span className="eyebrow">ARCHIVO / {file.name.split(".").pop()?.toUpperCase()}</span><span className="card-arrow">↗</span></div>
      </article>)}</div> : <EmptyState title="No encontramos archivos" description="Probá con otra carpeta o tipo de archivo. Tu repositorio está listo para recibir el primero." action="Subir archivo" onAction={() => setUploadComposerOpen(true)} />}
      <div className="module-bottom"><span className="bottom-caption">CARPETAS PRIMERO. CAOS, DESPUÉS NUNCA.</span><Pagination page={Math.min(page, pages)} pages={pages} onChange={setPage} /></div>
      {pendingDelete ? <ConfirmDialog title="¿Eliminar este archivo?" description="Se quitará de la lista local. El almacenamiento multipart se conectará en la siguiente etapa." onCancel={() => setPendingDelete(null)} onConfirm={deleteFile} /> : null}
    </div>
  );
}
