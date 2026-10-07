"use client";

import { useRef, useState } from "react";
import type { CryptoAssetCode } from "../../lib/api/types";
import { Button } from "../../ui/Primitives";
import { parseCryptoOrderText, type CryptoOrderOcrResult, type CryptoOrderSide } from "./cryptoOrderParser";

export function CryptoOrderOcr({ expectedSide, expectedAssetCode, onApply }: {
  expectedSide: CryptoOrderSide;
  expectedAssetCode?: CryptoAssetCode;
  onApply: (order: CryptoOrderOcrResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const readImage = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Elegí una imagen PNG, JPG o WEBP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("La imagen supera el límite de 12 MB.");
      return;
    }

    setBusy(true);
    setFileName(file.name);
    setProgress("Preparando lectura…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["eng", "spa"], 1, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress("Leyendo la orden…");
          else if (message.status === "loading language traineddata") setProgress("Preparando idiomas para la primera lectura…");
          else if (message.status === "loading tesseract core") setProgress("Preparando el lector…");
        },
      });
      try {
        const { data } = await worker.recognize(file);
        const order = parseCryptoOrderText(data.text);
        if (!order.assetCode || !order.date || !order.quantity || !order.unitPriceUsd || (expectedSide === "BUY" ? !order.amountUsd : !order.proceedsUsd)) {
          throw new Error("No pude leer todos los datos principales. Podés completar los campos a mano o elegir una captura más nítida.");
        }
        if (order.side && order.side !== expectedSide) {
          throw new Error(`La captura parece ser una ${order.side === "BUY" ? "compra" : "venta"}, pero este formulario registra una ${expectedSide === "BUY" ? "compra" : "venta"}.`);
        }
        if (expectedAssetCode && order.assetCode !== expectedAssetCode) {
          throw new Error(`La captura corresponde a ${order.assetCode.replace("USDT", "")}, pero este lote es de ${expectedAssetCode.replace("USDT", "")}.`);
        }
        onApply(order);
        setProgress("Datos cargados. Revisalos antes de guardar.");
      } finally {
        await worker.terminate();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer la imagen. Completá los datos a mano.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  return <div className="crypto-order-ocr">
    <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" aria-label="Elegir captura de la orden" onChange={(event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (file) void readImage(file);
    }} />
    <div className="crypto-order-ocr-action">
      <div><strong>Importar orden desde una imagen</strong><small>La lectura ocurre en este dispositivo y podés corregir cada campo.</small></div>
      <Button variant="quiet" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Leyendo…" : "Elegir captura"}</Button>
    </div>
    {progress ? <p className="crypto-order-ocr-status" aria-live="polite">{fileName ? `${fileName} · ` : ""}{progress}</p> : null}
    {error ? <p className="crypto-order-ocr-error" role="alert">{error}</p> : null}
  </div>;
}
