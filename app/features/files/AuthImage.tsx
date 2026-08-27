import { useState, useEffect, type CSSProperties } from "react";
import type { FileItem } from "../../lib/api/types";
import { api } from "../../lib/api/client";

type AuthImageProps = {
  file: FileItem;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
};

export function AuthImage({ file, alt, className, style, loading = "lazy" }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    const controller = new AbortController();
    api.downloadFile(file, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      revoke = url;
      setSrc(url);
    }).catch(() => { if (!controller.signal.aborted) setSrc(null); });
    return () => { controller.abort(); if (revoke) URL.revokeObjectURL(revoke); };
  }, [file]);

  if (!src) return <div className={className} style={style} />;
  return <img src={src} alt={alt} className={className} style={style} loading={loading} decoding="async" />;
}
