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
    let cancelled = false;
    api.downloadFile(file).then((blob) => {
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      revoke = url;
      setSrc(url);
    }).catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [file.id]);

  if (!src) return <div className={className} style={style} />;
  return <img src={src} alt={alt} className={className} style={style} loading={loading} decoding="async" />;
}
