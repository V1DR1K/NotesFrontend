import { useEffect, useRef, useState, createPortal } from "react";
import type { FileItem } from "../../lib/api/types";

type ImageLightboxProps = {
  images: FileItem[];
  startIndex: number;
  onClose: () => void;
};

export function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps) {
  const [selected, setSelected] = useState(startIndex);
  const touchStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const photo = images[selected];

  const next = () => setSelected((i) => (i + 1) % images.length);
  const prev = () => setSelected((i) => (i - 1 + images.length) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!photo) return null;

  const src = photo.downloadUrl || `/files/${encodeURIComponent(photo.id)}/download`;

  return createPortal(
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Foto ampliada" onMouseDown={onClose}>
      <button className="photo-lightbox-close" type="button" onClick={onClose} aria-label="Cerrar">&#x2715;</button>
      <div className="photo-lightbox-body" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => { const t = e.changedTouches[0]; if (t) touchStart.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={(e) => { const s = touchStart.current; const t = e.changedTouches[0]; touchStart.current = undefined; if (!s || !t) return; const dx = t.clientX - s.x; const dy = t.clientY - s.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); } }}>
        <img src={src} alt={photo.name} />
        {images.length > 1 && <div className="photo-lightbox-controls">
          <button type="button" onClick={prev} aria-label="Anterior">&#x2039;</button>
          <span>{selected + 1} / {images.length}</span>
          <button type="button" onClick={next} aria-label="Siguiente">&#x203A;</button>
        </div>}
        {images.length > 1 && <div className="photo-lightbox-dots" role="tablist">{images.map((img, i) => <button key={img.id} type="button" role="tab" aria-selected={i === selected} className={i === selected ? "is-selected" : ""} onClick={() => setSelected(i)} aria-label={`Foto ${i + 1}`} />)}</div>}
      </div>
    </div>,
    document.body,
  );
}
