"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import { Button } from "../../ui/Primitives";

type PdfCanvasPreviewProps = {
  blob: Blob;
  fileName: string;
  onDownload: () => void;
};

export function PdfCanvasPreview({ blob, fileName, onDownload }: PdfCanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;

    const loadDocument = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        const loadingTask = pdfjs.getDocument({ data: await blob.arrayBuffer(), isOffscreenCanvasSupported: false });
        loadingTaskRef.current = loadingTask;
        const document = await loadingTask.promise;
        if (disposed) {
          await loadingTask.destroy();
          return;
        }
        documentRef.current = document;
        setPageCount(document.numPages);
        setLoading(false);
      } catch {
        if (!disposed) {
          setLoading(false);
          setRendering(false);
          setFailed(true);
        }
      }
    };

    void loadDocument();
    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const loadingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;
      documentRef.current = null;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [blob]);

  useEffect(() => {
    if (loading || failed || !pageCount) return;
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas) return;
    let disposed = false;

    const renderPage = async () => {
      try {
        renderTaskRef.current?.cancel();
        const pdfPage = await document.getPage(page);
        if (disposed) return;
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context unavailable");
        const renderTask = pdfPage.render({ canvas: null, canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!disposed) setRendering(false);
      } catch (error) {
        if (disposed || (error instanceof Error && error.name === "RenderingCancelledException")) return;
        setRendering(false);
        setFailed(true);
      }
    };

    void renderPage();
    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [failed, loading, page, pageCount]);

  const changePage = (nextPage: number) => {
    setRendering(true);
    setPage(nextPage);
  };

  return (
    <div className="pdf-preview-viewer" aria-busy={loading || rendering}>
      <div className="pdf-preview-toolbar">
        <span>{pageCount ? `PDF · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}` : "PDF"}</span>
        {pageCount > 1 ? <div className="pdf-preview-pagination"><button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1}>Anterior</button><span>{page} / {pageCount}</span><button type="button" onClick={() => changePage(page + 1)} disabled={page >= pageCount}>Siguiente</button></div> : null}
      </div>
      <div className="pdf-preview-canvas-wrap">
        {loading ? <div className="file-preview-state" role="status" aria-live="polite"><span className="file-preview-spinner" aria-hidden="true" />Preparando PDF...</div> : null}
        {!loading && failed ? <div className="file-preview-state" role="alert"><strong>No se pudo renderizar el PDF.</strong><span>Podés descargarlo para abrirlo con otra aplicación.</span><Button variant="ghost" onClick={onDownload}>Descargar archivo <span aria-hidden="true">↗</span></Button></div> : null}
        {!loading && !failed ? <canvas ref={canvasRef} className="pdf-preview-canvas" aria-label={`Página ${page} de ${fileName}`} /> : null}
        {!loading && !failed && rendering ? <div className="pdf-preview-rendering" role="status" aria-live="polite">Renderizando página...</div> : null}
      </div>
    </div>
  );
}
