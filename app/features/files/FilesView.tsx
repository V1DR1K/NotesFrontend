"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiConfig, FileItem } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { invalidateApiQueryCache, useMutationError } from "../../lib/api/hooks";
import { currentMonth, dateLabel, fieldError, monthBounds } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, PeriodRangeFilter, SectionHero, SelectField, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { AuthImage } from "./AuthImage";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { ImageLightbox } from "./ImageLightbox";
import { getFilePreviewKind, isImageFile } from "./filePreview";
import { useFilesData } from "./useFilesData";
import { useFocusTarget } from "../../lib/ui/useFocusTarget";

const kindIcon = (kind: string) => { const normalized = kind.toLowerCase(); if (normalized.includes("image") || normalized.includes("photo")) return "▧"; if (normalized.includes("sheet") || normalized.includes("spread")) return "▦"; if (normalized.includes("archive") || normalized.includes("zip")) return "⌁"; return "▤"; };
const kindLabel = (kind: string) => kind.replaceAll("_", " ").toLocaleLowerCase("es-AR");
const fileSize = (bytes: unknown) => { const size = Number(bytes); if (!Number.isFinite(size) || size <= 0) return "—"; return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; };
export function FilesView({ config, focusId, projectCode = "all", nested = false }: { config: ApiConfig; focusId?: string | null; projectCode?: string; nested?: boolean }) {
  const defaultRange = monthBounds(currentMonth());
  const [kind, setKind] = useState("all");
  const [folderId, setFolderId] = useState("all");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [folderComposerOpen, setFolderComposerOpen] = useState(false);
  const [uploadComposerOpen, setUploadComposerOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderProjectCode, setFolderProjectCode] = useState("personal");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadProjectCode, setUploadProjectCode] = useState("personal");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameFolderId, setRenameFolderId] = useState("");
  const [renameProjectCode, setRenameProjectCode] = useState("personal");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [focusedLightboxFile, setFocusedLightboxFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [infoFile, setInfoFile] = useState<FileItem | null>(null);
  const [focusError, setFocusError] = useState("");
  const pendingPreviewRename = useRef<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const data = useFilesData(page, kind, folderId, search, projectCode, from, to);
  const mutation = useMutationError();
  const files = data.data?.[0];
  const folders = data.data?.[1];
  const folderOptions = (selectedProject: string) => (folders?.content ?? []).filter((folder) => selectedProject === "all" || folder.projectCode === selectedProject).map((folder) => ({ value: folder.id, label: selectedProject === "all" ? `${folder.name} · ${config.projects.find((item) => item.code === folder.projectCode)?.label ?? folder.projectCode}` : folder.name }));
  const allFiles = files?.content ?? [];
  const imageFiles = allFiles.filter(isImageFile);
  const lightboxFiles = focusedLightboxFile ? [focusedLightboxFile] : imageFiles;
  const imageIndexMap = new Map(imageFiles.map((f, i) => [f.id, i]));
  const kinds = Array.from(new Set(allFiles.map((file) => file.kind))).filter(Boolean);
  const selectedFolder = folders?.content.find((folder) => folder.id === folderId);
  useFocusTarget(focusId, Boolean(data.data));
  useEffect(() => {
    if (!focusId) return;
    let cancelled = false;
    void api.getFile(focusId).then((file) => {
      if (cancelled) return;
      setFocusError("");
      if (file.uploadedAt) { const uploadedDate = file.uploadedAt.slice(0, 10); setFrom(uploadedDate); setTo(uploadedDate); setPage(0); }
      const previewKind = getFilePreviewKind(file);
      if (isImageFile(file) || previewKind === "image") {
        setFocusedLightboxFile(file);
        setLightboxIndex(0);
      } else if (previewKind) {
        setPreviewFile(file);
      } else {
        setInfoFile(file);
      }
    }).catch(() => {
      if (!cancelled) setFocusError("No pudimos abrir ese archivo. Puede que se haya eliminado o que ya no esté disponible.");
    });
    return () => { cancelled = true; };
  }, [focusId]);
  const prepareFile = (file: File) => { setSelectedFile(file); setUploadName(file.name); mutation.clearError(); };
  const closeUpload = () => { setUploadComposerOpen(false); setSelectedFile(null); setUploadName(""); setUploadFolderId(""); };
  const handleFile = async () => { if (!selectedFile || !uploadName.trim() || mutation.pending) return; try { await mutation.run(() => api.uploadFile(selectedFile, uploadFolderId || undefined, uploadName.trim(), uploadProjectCode)); closeUpload(); invalidateApiQueryCache(); data.reload(); } catch { /* shown in the dialog */ } };
  const createFolder = async () => { const cleanName = folderName.trim(); if (!cleanName || mutation.pending) return; try { const folder = await mutation.run(() => api.createFolder(cleanName, folderProjectCode)); setFolderName(""); setFolderComposerOpen(false); if (projectCode === "all" || folderProjectCode === projectCode) setFolderId(folder.id); invalidateApiQueryCache(); data.reload(); } catch { /* shown in the dialog */ } };
  const startRename = (file: FileItem) => { setRenameId(file.id); setRenameValue(file.name); setRenameFolderId(file.folder?.id ?? ""); setRenameProjectCode(file.projectCode); mutation.clearError(); };
  const saveRename = async () => { if (!renameId || !renameValue.trim() || mutation.pending) return; try { await mutation.run(() => api.updateFile(renameId, { name: renameValue.trim(), folderId: renameFolderId || undefined, projectCode: renameProjectCode })); setRenameId(null); invalidateApiQueryCache(); data.reload(); } catch { /* shown in the dialog */ } };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteFile(pendingDelete)); setPendingDelete(null); invalidateApiQueryCache(); data.reload(); } catch { /* keep confirmation open */ } };
  const download = async (file: FileItem) => { try { const blob = await api.downloadFile(file); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { mutation.captureError(reason); } };
  const openFilePreview = (file: FileItem, imageIndex: number | undefined, previewKind: ReturnType<typeof getFilePreviewKind>) => { if (typeof imageIndex === "number") setLightboxIndex(imageIndex); else if (previewKind) setPreviewFile(file); else setInfoFile(file); };
  const closeInfoPreview = () => { const file = pendingPreviewRename.current; pendingPreviewRename.current = null; setInfoFile(null); if (file) startRename(file); };

  return <div className="view module-view">
    {!nested ? <SectionHero section="files" rightSlot={<div className="form-actions finance-main-actions hero-sidecar-actions hero-sidecar-actions-files"><Button variant="ghost" onClick={() => { mutation.clearError(); setFolderProjectCode(projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode); setFolderComposerOpen(true); }}>+ Nueva carpeta</Button><Button onClick={() => { mutation.clearError(); setUploadProjectCode(projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode); setUploadComposerOpen(true); }}>Subir archivo <span aria-hidden="true">↗</span></Button></div>} /> : null}
    <PeriodRangeFilter from={from} to={to} defaultFrom={defaultRange.from} defaultTo={defaultRange.to} onFromChange={(value) => { setFrom(value); setPage(0); }} onToChange={(value) => { setTo(value); setPage(0); }} onReset={() => { setFrom(defaultRange.from); setTo(defaultRange.to); setPage(0); }} idPrefix="file-filter" />
    {nested ? <div className="form-actions finance-main-actions module-main-actions module-main-actions-files"><Button variant="ghost" onClick={() => { mutation.clearError(); setFolderProjectCode(projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode); setFolderComposerOpen(true); }}>+ Nueva carpeta</Button><Button onClick={() => { mutation.clearError(); setUploadProjectCode(projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode); setUploadComposerOpen(true); }}>Subir archivo <span aria-hidden="true">↗</span></Button></div> : null}
     <input ref={fileInputRef} className="visually-hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) prepareFile(file); event.target.value = ""; }} />
      {uploadComposerOpen ? <Dialog ariaLabel="Subir archivo" onClose={closeUpload}><FormPanel title="Subir archivo" description="El nombre será también el título para encontrarlo después. Por defecto usamos el nombre original." onClose={closeUpload} onSubmit={() => void handleFile()}><div className="form-grid"><SelectField label="Proyecto" value={uploadProjectCode} onChange={(value) => { setUploadProjectCode(value); setUploadFolderId(""); }} options={config.projects.filter((item) => item.active !== false || item.code === uploadProjectCode).map(({ code, label }) => ({ value: code, label }))} /><SelectField label="Carpeta" id="upload-folder" value={uploadFolderId} onChange={setUploadFolderId} options={[{ value: "", label: "Sin carpeta" }, ...folderOptions(uploadProjectCode)]} /><FormField label="Nombre del archivo" value={uploadName} onChange={setUploadName} placeholder="Ej. Fotos de vacaciones.jpg" /><div className="upload-modal-zone"><div className="dropzone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) prepareFile(file); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}><span className="dropzone-icon">↑</span><span><strong>{selectedFile ? selectedFile.name : "Soltá un archivo acá"}</strong><small>{selectedFile ? "Listo para subir" : "o hacé clic para buscarlo en tu dispositivo"}</small></span><span className="dropzone-meta">MULTIPART READY</span></div></div></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "file", "folderId", "name")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={closeUpload}>Cerrar</Button><Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Elegir archivo</Button><Button type="submit" disabled={mutation.pending || !selectedFile || !uploadName.trim()}>{mutation.pending ? "Subiendo..." : "Subir archivo"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {folderComposerOpen ? <Dialog ariaLabel="Crear carpeta" onClose={() => setFolderComposerOpen(false)}><FormPanel title="Crear carpeta" description="La carpeta quedará disponible dentro del proyecto elegido." onClose={() => setFolderComposerOpen(false)}><div className="form-grid"><SelectField label="Proyecto" value={folderProjectCode} onChange={setFolderProjectCode} options={config.projects.filter((item) => item.active !== false || item.code === folderProjectCode).map(({ code, label }) => ({ value: code, label }))} /><FormField label="Nombre de la carpeta" value={folderName} onChange={setFolderName} placeholder="Ej. Documentación" /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setFolderComposerOpen(false)}>Cancelar</Button><Button onClick={() => void createFolder()} disabled={!folderName.trim()}>Crear carpeta <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
       {renameId ? <Dialog ariaLabel="Editar archivo" onClose={() => setRenameId(null)}><FormPanel title="Editar archivo" description="El nombre es también el título con el que se muestra y se busca el archivo." onClose={() => setRenameId(null)} onSubmit={() => void saveRename()}><div className="form-grid"><SelectField label="Proyecto" value={renameProjectCode} onChange={(value) => { setRenameProjectCode(value); setRenameFolderId(""); }} options={config.projects.filter((item) => item.active !== false || item.code === renameProjectCode).map(({ code, label }) => ({ value: code, label }))} /><FormField label="Nombre del archivo" value={renameValue} onChange={setRenameValue} /><SelectField label="Carpeta" id="rename-folder" value={renameFolderId} onChange={setRenameFolderId} options={[{ value: "", label: "Sin carpeta" }, ...folderOptions(renameProjectCode)]} /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setRenameId(null)}>Cancelar</Button><Button type="submit" disabled={!renameValue.trim() || mutation.pending}>Guardar cambios <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
     <ModuleToolbar resultLabel={`${files?.totalElements ?? 0} archivos`}><FilterPills active={kind} onChange={(value) => { setKind(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...kinds.map((value) => ({ value, label: kindLabel(value) }))]} /><div className="file-filter-row"><label className="toolbar-search-field" htmlFor="file-search"><span>Buscar por título</span><input id="file-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Título o nombre..." /></label><SelectField label="Carpeta" id="file-folder-filter" compact value={folderId} onChange={(value) => { setFolderId(value); setPage(0); }} options={[{ value: "all", label: "Todas las carpetas" }, ...folderOptions(projectCode)]} /></div></ModuleToolbar>
      {focusError ? <div className="analysis-notice" role="alert">{focusError}</div> : null}
      {data.loading ? <SkeletonGrid count={4} /> : data.error ? <ErrorState onRetry={data.reload} /> : allFiles.length ? <div className="content-grid files-grid">{allFiles.map((file) => { const imgIdx = imageIndexMap.get(file.id); const previewKind = getFilePreviewKind(file); return <article id={`record-${file.id}`} className={`content-card file-card ${typeof imgIdx === "number" ? "file-card--image" : ""}`} key={file.id}><div className="content-card-top"><span className="mono-date">{dateLabel(file.uploadedAt, true)}</span><CardActions onEdit={() => startRename(file)} onDelete={() => setPendingDelete(file.id)} /></div><button type="button" className="content-card-preview-trigger" onClick={() => openFilePreview(file, imgIdx, previewKind)} aria-label={`Ver archivo ${file.name}`}>{typeof imgIdx === "number" ? <div className="file-card-preview"><AuthImage file={file} alt={file.name} loading="lazy" /></div> : <div className="file-card-heading"><VisualTile emoji={kindIcon(file.kind)} label={kindLabel(file.kind)} /><div><span className="file-kind">{kindLabel(file.kind)}</span><span className="file-size">{fileSize(file.sizeBytes)}</span></div></div>}<h2 title={file.name}>{file.name}</h2><div className="file-folder"><span>▱</span>{file.folder?.name ?? "Sin carpeta"} · {config.projects.find((item) => item.code === file.projectCode)?.label ?? file.projectCode}</div><div className="card-footer"><span className="eyebrow">{typeof imgIdx === "number" ? "VER FOTO" : previewKind ? "PREVISUALIZAR" : "DETALLES DEL ARCHIVO"}</span><span className="card-arrow">↗</span></div></button><div className="card-footer file-card-actions"><button type="button" className="eyebrow card-link-button" onClick={() => void download(file)}>DESCARGAR</button></div></article>; })}</div> : <EmptyState title="No encontramos archivos" description={selectedFolder ? `No hay archivos en ${selectedFolder.name}.` : "Probá con otra carpeta, tipo o nombre. Tu repositorio está listo para recibir el primero."} action="Subir archivo" onAction={() => { mutation.clearError(); setUploadProjectCode(projectCode === "all" ? config.projects.find((item) => item.active !== false)?.code ?? "personal" : projectCode); setUploadComposerOpen(true); }} />}
    <div className="module-bottom"><span className="bottom-caption">CARPETAS PRIMERO. CAOS, DESPUÉS NUNCA.</span><Pagination page={Math.min(page + 1, Math.max(1, files?.totalPages ?? 0))} pages={files?.totalPages ?? 0} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar este archivo?" description="El archivo y sus metadatos se eliminarán del repositorio." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
    {lightboxIndex !== null && lightboxFiles.length > 0 && <ImageLightbox images={lightboxFiles} startIndex={focusedLightboxFile ? 0 : lightboxIndex} onClose={() => { setLightboxIndex(null); setFocusedLightboxFile(null); }} />}
    {previewFile ? (() => { const kind = getFilePreviewKind(previewFile); return kind && kind !== "image" ? <FilePreviewDialog key={previewFile.id} file={previewFile} kind={kind} onClose={() => setPreviewFile(null)} onDownload={() => void download(previewFile)} /> : null; })() : null}
    {infoFile ? <Dialog ariaLabel={`Vista previa del archivo ${infoFile.name}`} trackChanges={false} onClose={closeInfoPreview}><FormPanel mode="preview" eyebrow="VISTA PREVIA · ARCHIVO" title={infoFile.name} description={`${kindLabel(infoFile.kind)} · ${config.projects.find((item) => item.code === infoFile.projectCode)?.label ?? infoFile.projectCode}`} onClose={closeInfoPreview} onEdit={() => { pendingPreviewRename.current = infoFile; }}><div className="record-preview-meta"><span><strong>Tamaño</strong>{fileSize(infoFile.sizeBytes)}</span><span><strong>Carpeta</strong>{infoFile.folder?.name ?? "Sin carpeta"}</span><span><strong>Tipo</strong>{infoFile.mimeType ?? infoFile.extension ?? kindLabel(infoFile.kind)}</span></div><p className="record-preview-copy multiline-copy">{infoFile.description || "Este archivo no tiene una descripción adicional."}</p></FormPanel></Dialog> : null}
  </div>;
}
