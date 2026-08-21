"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api/client";
import { Button } from "../ui/Primitives";

export function ChangePasswordScreen({ onChanged }: { onChanged: () => void }) {
  const currentRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { currentRef.current?.focus(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) { setError("Completá tu contraseña actual y la nueva."); return; }
    if (newPassword.length < 10) { setError("La nueva contraseña debe tener al menos 10 caracteres."); return; }
    if (newPassword !== confirmation) { setError("La confirmación no coincide con la nueva contraseña."); return; }
    setLoading(true);
    setError("");
    try {
      await api.changePassword({ currentPassword, newPassword });
      onChanged();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No se pudo cambiar la contraseña.");
    } finally { setLoading(false); }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="change-password-title">
        <div className="login-mark" aria-hidden="true">✦</div>
        <span className="eyebrow">CUADERNO PERSONAL / PRIMER ACCESO</span>
        <h1 id="change-password-title">Elegí una nueva clave.</h1>
        <p>Tu acceso central necesita una contraseña propia antes de abrir tu espacio.</p>
        <form onSubmit={submit} noValidate>
          <label className="form-field" htmlFor="current-password"><span>Contraseña actual</span><input ref={currentRef} id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label className="form-field" htmlFor="new-password"><span>Nueva contraseña</span><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label className="form-field" htmlFor="confirm-password"><span>Repetí la nueva contraseña</span><input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error ? <div className="inline-error" role="alert" aria-live="polite">{error}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Cambiar contraseña"}<span aria-hidden="true">↗</span></Button>
        </form>
      </section>
    </main>
  );
}
