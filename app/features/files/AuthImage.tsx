import { useState, useEffect, useRef, type CSSProperties } from "react";
import type { FileItem } from "../../lib/api/types";
import { api } from "../../lib/api/client";

type AuthImageProps = {
  file: FileItem;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
};

const MAX_CACHED_IMAGES = 32;
const imageCache = new Map<string, { url: string; lastUsed: number; users: number }>();

function cachedImage(id: string) {
  const cached = imageCache.get(id);
  if (!cached) return null;
  cached.lastUsed = Date.now();
  return cached.url;
}

function retainImage(id: string) {
  const cached = imageCache.get(id);
  if (cached) cached.users += 1;
}

function releaseImage(id: string) {
  const cached = imageCache.get(id);
  if (!cached) return;
  cached.users = Math.max(0, cached.users - 1);
  evictImages();
}

function evictImages() {
  while (imageCache.size > MAX_CACHED_IMAGES) {
    const candidate = [...imageCache.entries()]
      .filter(([, image]) => image.users === 0)
      .sort(([, left], [, right]) => left.lastUsed - right.lastUsed)[0];
    if (!candidate) return;
    URL.revokeObjectURL(candidate[1].url);
    imageCache.delete(candidate[0]);
  }
}

async function loadImage(file: FileItem, signal: AbortSignal) {
  const existing = imageCache.get(file.id);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.url;
  }
  const blob = await api.downloadFile(file, signal);
  const url = URL.createObjectURL(blob);
  imageCache.set(file.id, { url, lastUsed: Date.now(), users: 0 });
  evictImages();
  return url;
}

export function AuthImage({ file, alt, className, style, loading = "lazy" }: AuthImageProps) {
  const targetRef = useRef<HTMLElement | null>(null);
  const [src, setSrc] = useState<string | null>(() => cachedImage(file.id));

  useEffect(() => {
    retainImage(file.id);
    const controller = new AbortController();
    let observer: IntersectionObserver | null = null;
    const start = () => {
      void loadImage(file, controller.signal).then((url) => {
        if (!controller.signal.aborted) { retainImage(file.id); setSrc(url); }
      }).catch(() => { if (!controller.signal.aborted) setSrc(null); });
    };
    if (src || loading === "eager") start();
    else if (typeof IntersectionObserver === "undefined") start();
    else {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        start();
      }, { rootMargin: "240px" });
      if (targetRef.current) observer.observe(targetRef.current);
    }
    return () => { observer?.disconnect(); controller.abort(); releaseImage(file.id); };
  }, [file, loading, src]);

  if (!src) return <div ref={(element) => { targetRef.current = element; }} className={className} style={style} />;
  return <img ref={(element) => { targetRef.current = element; }} src={src} alt={alt} className={className} style={style} loading={loading} decoding="async" />;
}
