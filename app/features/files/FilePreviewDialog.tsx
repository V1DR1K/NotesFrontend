import { useEffect, useState } from "react";
import type { FileItem } from "../../lib/api/types";
import { api } from "../../lib/api/client";
import { Button, Dialog } from "../../ui/Primitives";
import { PdfCanvasPreview } from "./PdfCanvasPreview";
import type { FilePreviewKind } from "./filePreview";

type FilePreviewDialogProps = {
  file: FileItem;
  kind: Exclude<FilePreviewKind, "image" | null>;
  onClose: () => void;
  onDownload: () => void;
};

const kindLabel: Record<Exclude<FilePreviewKind, "image" | null>, string> = {
  pdf: "Documento PDF",
  audio: "Audio",
  video: "Video",
  text: "Texto",
};

export function FilePreviewDialog({ file, kind, onClose, onDownload }: FilePreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    void api.downloadFile(file, controller.signal).then(async (blob) => {
      if (controller.signal.aborted) return;
      if (kind === "pdf") {
        setPdfBlob(blob);
      } else if (kind === "text") {
        const contents = await blob.text();
        if (controller.signal.aborted) return;
        setText(contents);
      } else {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
      setLoading(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setLoading(false);
      setFailed(true);
    });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, kind]);

  return (
    <Dialog ariaLabel={`Previsualizar ${file.name}`} onClose={onClose} trackChanges={false}>
      <div className="file-preview-panel">
        <div className="file-preview-heading">
          <div>
            <span className="eyebrow">PREVISUALIZACIÓN</span>
            <h2 title={file.name}>{file.name}</h2>
            <p>{kindLabel[kind]}</p>
          </div>
          <button className="file-preview-close" type="button" onClick={onClose} aria-label="Cerrar previsualización">×</button>
        </div>

        <div className="file-preview-content">
          {loading ? <div className="file-preview-state" role="status" aria-live="polite"><span className="file-preview-spinner" aria-hidden="true" />Cargando archivo...</div> : null}
          {!loading && failed ? <div className="file-preview-state" role="alert"><strong>No se pudo cargar la previsualización.</strong><span>Podés descargar el archivo para abrirlo con otra aplicación.</span><Button variant="ghost" onClick={onDownload}>Descargar archivo <span aria-hidden="true">↗</span></Button></div> : null}
          {!loading && !failed && kind === "pdf" && pdfBlob ? <PdfCanvasPreview blob={pdfBlob} fileName={file.name} onDownload={onDownload} /> : null}
          {!loading && !failed && kind === "audio" && url ? <audio className="file-preview-audio" src={url} controls preload="metadata">Tu navegador no puede reproducir este audio.</audio> : null}
          {!loading && !failed && kind === "video" && url ? <video className="file-preview-video" src={url} controls preload="metadata">Tu navegador no puede reproducir este video.</video> : null}
          {!loading && !failed && kind === "text" && text !== null ? <pre className="file-preview-text">{text}</pre> : null}
        </div>

        <div className="file-preview-actions">
          <Button variant="quiet" onClick={onClose}>Cerrar</Button>
          <Button variant="ghost" onClick={onDownload}>Descargar <span aria-hidden="true">↗</span></Button>
        </div>
      </div>
    </Dialog>
  );
}
