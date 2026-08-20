"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, api, unwrapUser } from "../lib/api/client";
import { Button } from "../ui/Primitives";

export function LoginScreen({ onAuthenticated, initialError, onRetry }: { onAuthenticated: (username: string) => void; initialError?: string; onRetry?: () => void }) {
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => { usernameRef.current?.focus(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) { setError("Completá usuario y contraseña para entrar."); return; }
    setLoading(true);
    setError("");
    try {
      const payload = await api.login({ username: username.trim(), password });
      const user = unwrapUser(payload);
      onAuthenticated(user.username ?? username.trim());
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "No se pudo iniciar sesión.");
    } finally { setLoading(false); }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">✦</div>
        <span className="eyebrow">CUADERNO PERSONAL / ACCESO</span>
        <h1 id="login-title">Volvé a tu espacio.</h1>
        <p>Ingresá para encontrar tus días, notas, archivos y movimientos en un solo lugar.</p>
        <form onSubmit={submit} noValidate>
          <label className="form-field" htmlFor="login-username"><span>Usuario</span><input ref={usernameRef} id="login-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label className="form-field" htmlFor="login-password"><span>Contraseña</span><input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error ? <div className="inline-error" role="alert" aria-live="polite">{error}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}<span aria-hidden="true">↗</span></Button>
        </form>
        {onRetry ? <button type="button" className="login-retry" onClick={onRetry}>Reintentar conexión</button> : null}
      </section>
    </main>
  );
}
