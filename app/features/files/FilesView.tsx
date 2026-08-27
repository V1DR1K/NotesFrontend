"use client";

import { useRef, useState } from "react";
import type { FileItem } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { useMutationError } from "../../lib/api/hooks";
import { dateLabel, fieldError } from "../../lib/presentation";
import { Button, CardActions, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterPills, FormField, FormPanel, ModuleToolbar, Pagination, SectionHero, SelectField, SkeletonGrid, VisualTile } from "../../ui/Primitives";
import { AuthImage } from "./AuthImage";
import { ImageLightbox } from "./ImageLightbox";
import { useFilesData } from "./useFilesData";

const kindIcon = (kind: string) => { const normalized = kind.toLowerCase(); if (normalized.includes("image") || normalized.includes("photo")) return "▧"; if (normalized.includes("sheet") || normalized.includes("spread")) return "▦"; if (normalized.includes("archive") || normalized.includes("zip")) return "⌁"; return "▤"; };
const kindLabel = (kind: string) => kind.replaceAll("_", " ").toLocaleLowerCase("es-AR");
const fileSize = (bytes: unknown) => { const size = Number(bytes); if (!Number.isFinite(size) || size <= 0) return "—"; return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; };
const isImageFile = (f: FileItem) => f.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);

export function FilesView() {
  const [kind, setKind] = useState("all");
  const [folderId, setFolderId] = useState("all");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [folderComposerOpen, setFolderComposerOpen] = useState(false);
  const [uploadComposerOpen, setUploadComposerOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const data = useFilesData(page, kind, folderId, search);
  const mutation = useMutationError();
  const files = data.data?.[0];
  const folders = data.data?.[1];
  const allFiles = files?.content ?? [];
  const imageFiles = allFiles.filter(isImageFile);
  const imageIndexMap = new Map(imageFiles.map((f, i) => [f.id, i]));
  const kinds = Array.from(new Set(allFiles.map((file) => file.kind))).filter(Boolean);
  const selectedFolder = folders?.content.find((folder) => folder.id === folderId);
  const prepareFile = (file: File) => { setSelectedFile(file); setUploadName(file.name); mutation.clearError(); };
  const closeUpload = () => { setUploadComposerOpen(false); setSelectedFile(null); setUploadName(""); setUploadFolderId(""); };
  const handleFile = async () => { if (!selectedFile || !uploadName.trim() || mutation.pending) return; try { await mutation.run(() => api.uploadFile(selectedFile, uploadFolderId || undefined, uploadName.trim())); closeUpload(); data.reload(); } catch { /* shown in the dialog */ } };
  const createFolder = async () => { const cleanName = folderName.trim(); if (!cleanName || mutation.pending) return; try { const folder = await mutation.run(() => api.createFolder(cleanName)); setFolderName(""); setFolderComposerOpen(false); setFolderId(folder.id); data.reload(); } catch { /* shown in the dialog */ } };
  const startRename = (file: FileItem) => { setRenameId(file.id); setRenameValue(file.name); mutation.clearError(); };
  const saveRename = async () => { if (!renameId || !renameValue.trim() || mutation.pending) return; try { await mutation.run(() => api.updateFile(renameId, { name: renameValue.trim() })); setRenameId(null); data.reload(); } catch { /* shown in the dialog */ } };
  const remove = async () => { if (!pendingDelete || mutation.pending) return; try { await mutation.run(() => api.deleteFile(pendingDelete)); setPendingDelete(null); data.reload(); } catch { /* keep confirmation open */ } };
  const download = async (file: FileItem) => { try { const blob = await api.downloadFile(file); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { mutation.captureError(reason); } };

  return <div className="view module-view">
    <SectionHero section="files" onAction={() => { mutation.clearError(); setUploadComposerOpen(true); }} rightSlot={<div className="storage-card"><div className="storage-card-top"><span className="eyebrow">ESPACIO USADO</span><strong>—</strong></div><div className="storage-bar"><span /></div><small>El uso se calculará con el almacenamiento del backend</small><Button variant="ghost" onClick={() => { mutation.clearError(); setFolderComposerOpen(true); }}>+ Nueva carpeta</Button></div>} />
     <input ref={fileInputRef} className="visually-hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) prepareFile(file); event.target.value = ""; }} />
      {uploadComposerOpen ? <Dialog ariaLabel="Subir archivo" onClose={closeUpload}><FormPanel title="Subir archivo" description="El nombre será también el título para encontrarlo después. Por defecto usamos el nombre original." onClose={closeUpload} onSubmit={() => void handleFile()}><div className="form-grid"><SelectField label="Carpeta" id="upload-folder" value={uploadFolderId} onChange={setUploadFolderId} options={[{ value: "", label: "Sin carpeta" }, ...(folders?.content ?? []).map((folder) => ({ value: folder.id, label: folder.name }))]} /><FormField label="Nombre del archivo" value={uploadName} onChange={setUploadName} placeholder="Ej. Fotos de vacaciones.jpg" /><div className="upload-modal-zone"><div className="dropzone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) prepareFile(file); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}><span className="dropzone-icon">↑</span><span><strong>{selectedFile ? selectedFile.name : "Soltá un archivo acá"}</strong><small>{selectedFile ? "Listo para subir" : "o hacé clic para buscarlo en tu dispositivo"}</small></span><span className="dropzone-meta">MULTIPART READY</span></div></div></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message || fieldError(mutation.error, "file", "folderId", "name")}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={closeUpload}>Cerrar</Button><Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Elegir archivo</Button><Button type="submit" disabled={mutation.pending || !selectedFile || !uploadName.trim()}>{mutation.pending ? "Subiendo..." : "Subir archivo"} <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
    {folderComposerOpen ? <Dialog ariaLabel="Crear carpeta" onClose={() => setFolderComposerOpen(false)}><FormPanel title="Crear carpeta" description="Las carpetas se guardan en tu repositorio personal." onClose={() => setFolderComposerOpen(false)}><div className="form-grid"><FormField label="Nombre de la carpeta" value={folderName} onChange={setFolderName} placeholder="Ej. Documentación" /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setFolderComposerOpen(false)}>Cancelar</Button><Button onClick={() => void createFolder()} disabled={!folderName.trim()}>Crear carpeta <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
      {renameId ? <Dialog ariaLabel="Editar archivo" onClose={() => setRenameId(null)}><FormPanel title="Editar archivo" description="El nombre es también el título con el que se muestra y se busca el archivo." onClose={() => setRenameId(null)} onSubmit={() => void saveRename()}><div className="form-grid"><FormField label="Nombre del archivo" value={renameValue} onChange={setRenameValue} /></div>{mutation.error ? <div className="inline-error" role="alert" aria-live="polite">{mutation.error.message}</div> : null}<div className="form-actions"><Button variant="quiet" onClick={() => setRenameId(null)}>Cancelar</Button><Button type="submit" disabled={!renameValue.trim() || mutation.pending}>Guardar cambios <span aria-hidden="true">↗</span></Button></div></FormPanel></Dialog> : null}
     <ModuleToolbar resultLabel={`${files?.totalElements ?? 0} archivos`}><FilterPills active={kind} onChange={(value) => { setKind(value); setPage(0); }} options={[{ value: "all", label: "Todos" }, ...kinds.map((value) => ({ value, label: kindLabel(value) }))]} /><div className="file-filter-row"><label className="toolbar-search-field" htmlFor="file-search"><span>Buscar por título</span><input id="file-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Título o nombre..." /></label><SelectField label="Carpeta" id="file-folder-filter" compact value={folderId} onChange={(value) => { setFolderId(value); setPage(0); }} options={[{ value: "all", label: "Todas las carpetas" }, ...(folders?.content ?? []).map((folder) => ({ value: folder.id, label: folder.name }))]} /></div></ModuleToolbar>
     {data.loading ? <SkeletonGrid count={4} /> : data.error ? <ErrorState onRetry={data.reload} /> : allFiles.length ? <div className="content-grid files-grid">{allFiles.map((file) => { const imgIdx = imageIndexMap.get(file.id); return <article className={`content-card file-card ${typeof imgIdx === "number" ? "file-card--image" : ""}`} key={file.id}><div className="content-card-top"><span className="mono-date">{dateLabel(file.uploadedAt, true)}</span><CardActions onEdit={() => startRename(file)} onDelete={() => setPendingDelete(file.id)} /></div>{typeof imgIdx === "number" ? <button type="button" className="file-card-preview" onClick={() => setLightboxIndex(imgIdx)} aria-label={`Ver foto: ${file.name}`}><AuthImage file={file} alt={file.name} loading="lazy" /></button> : <div className="file-card-heading"><VisualTile emoji={kindIcon(file.kind)} label={kindLabel(file.kind)} /><div><span className="file-kind">{kindLabel(file.kind)}</span><span className="file-size">{fileSize(file.sizeBytes)}</span></div></div>}<h2 title={file.name}>{file.name}</h2><div className="file-folder"><span>▱</span>{file.folder?.name ?? "Sin carpeta"}</div><div className="card-footer">{typeof imgIdx === "number" ? <><button type="button" className="eyebrow card-link-button" onClick={() => setLightboxIndex(imgIdx)}>VER FOTO</button><button type="button" className="eyebrow card-link-button" onClick={() => void download(file)}>DESCARGAR</button></> : <button type="button" className="eyebrow card-link-button" onClick={() => void download(file)}>DESCARGAR</button>}<span className="card-arrow">↗</span></div></article>; })}</div> : <EmptyState title="No encontramos archivos" description={selectedFolder ? `No hay archivos en ${selectedFolder.name}.` : "Probá con otra carpeta, tipo o nombre. Tu repositorio está listo para recibir el primero."} action="Subir archivo" onAction={() => { mutation.clearError(); setUploadComposerOpen(true); }} />}
    <div className="module-bottom"><span className="bottom-caption">CARPETAS PRIMERO. CAOS, DESPUÉS NUNCA.</span><Pagination page={Math.min(page + 1, Math.max(1, files?.totalPages ?? 0))} pages={files?.totalPages ?? 0} onChange={(next) => setPage(next - 1)} /></div>{pendingDelete ? <ConfirmDialog title="¿Eliminar este archivo?" description="El archivo y sus metadatos se eliminarán del repositorio." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
    {lightboxIndex !== null && imageFiles.length > 0 && <ImageLightbox images={imageFiles} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
  </div>;
}
