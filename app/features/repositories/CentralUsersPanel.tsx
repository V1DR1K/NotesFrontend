"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api/client";
import type { CentralAppCode, CentralAuthUserAdmin } from "../../lib/api/types";

const apps: Array<{ code: CentralAppCode; label: string }> = [
  { code: "notes", label: "Notes" },
  { code: "whatplan", label: "WhatPlan" },
  { code: "scalegrams", label: "ScaleGrams" },
];

type AppDraft = Record<CentralAppCode, { enabled: boolean; role: "USER" | "ADMIN" }>;
type AccountDraft = { username: string; password: string; enabled: boolean; mustChangePassword: boolean };

function appDraft(user: CentralAuthUserAdmin): AppDraft {
  const grants = new Map(user.applications.map((grant) => [grant.appCode, grant]));
  return Object.fromEntries(apps.map(({ code }) => {
    const grant = grants.get(code);
    return [code, { enabled: grant?.enabled ?? false, role: grant?.role ?? "USER" }];
  })) as AppDraft;
}

function accountDraft(user: CentralAuthUserAdmin): AccountDraft {
  return { username: user.username, password: "", enabled: user.status === "ACTIVE", mustChangePassword: user.mustChangePassword };
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Activa";
  if (status === "DISABLED") return "Desactivada";
  return status;
}

export function CentralUsersPanel() {
  const [users, setUsers] = useState<CentralAuthUserAdmin[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AppDraft>>({});
  const [accounts, setAccounts] = useState<Record<string, AccountDraft>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newUser, setNewUser] = useState({ username: "", password: "" });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api.centralUsers();
      if (signal?.aborted) return;
      setUsers(result);
      setDrafts(Object.fromEntries(result.map((user) => [user.id, appDraft(user)])));
      setAccounts(Object.fromEntries(result.map((user) => [user.id, accountDraft(user)])));
      setError("");
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  const replaceUser = (updated: CentralAuthUserAdmin) => {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    setDrafts((current) => ({ ...current, [updated.id]: appDraft(updated) }));
    setAccounts((current) => ({ ...current, [updated.id]: accountDraft(updated) }));
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    setNotice("");
    try {
      await api.createCentralUser({ ...newUser, mustChangePassword: true });
      setNewUser({ username: "", password: "" });
      setNotice("Usuario creado. Asignale el acceso a cada aplicación.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario.");
    } finally {
      setCreating(false);
    }
  };

  const saveApps = async (user: CentralAuthUserAdmin) => {
    if (saving) return;
    setSaving(`${user.id}:apps`);
    setError("");
    setNotice("");
    try {
      const updated = await api.updateCentralUserApplications(user.id, drafts[user.id]);
      replaceUser(updated);
      setNotice(`Accesos de ${updated.username} actualizados.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los accesos.");
    } finally {
      setSaving(null);
    }
  };

  const saveAccount = async (user: CentralAuthUserAdmin) => {
    const draft = accounts[user.id];
    if (!draft || saving) return;
    setSaving(`${user.id}:account`);
    setError("");
    setNotice("");
    try {
      const { password, ...account } = draft;
      const updated = await api.updateCentralUser(user.id, {
        ...account,
        ...(password.trim() ? { password: password.trim() } : {}),
        mustChangePassword: password.trim() ? true : draft.mustChangePassword,
      });
      replaceUser(updated);
      setNotice(`Cuenta de ${updated.username} actualizada.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la cuenta.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="central-users" aria-labelledby="central-users-heading">
      <header className="central-users-header">
        <div>
          <h2 id="central-users-heading">Usuarios del acceso central</h2>
          <p>Administrá las cuentas y el rol de cada usuario en Notes, WhatPlan y ScaleGrams.</p>
        </div>
        <span className="central-users-count">{loading ? "Cargando usuarios" : `${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`}</span>
      </header>

      <form className="central-user-create" onSubmit={(event) => void createUser(event)}>
        <div className="central-user-create-copy">
          <h3>Agregar usuario</h3>
          <p>Las cuentas nuevas empiezan sin acceso a las aplicaciones.</p>
        </div>
        <label>
          <span>Usuario</span>
          <input autoComplete="off" required minLength={3} maxLength={80} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}" value={newUser.username} onChange={(event) => setNewUser((value) => ({ ...value, username: event.target.value }))} />
        </label>
        <label>
          <span>Contraseña inicial</span>
          <input autoComplete="new-password" required type="password" minLength={10} maxLength={128} value={newUser.password} onChange={(event) => setNewUser((value) => ({ ...value, password: event.target.value }))} />
        </label>
        <button className="db-button" type="submit" disabled={creating || loading}>{creating ? "Creando…" : "Crear cuenta"}</button>
      </form>

      {error ? <p className="central-user-feedback central-user-error" role="alert">{error}</p> : null}
      {notice ? <p className="central-user-feedback" role="status">{notice}</p> : null}
      {loading ? <div className="central-users-loading" role="status" aria-busy="true"><span /><span /><span /></div> : null}
      {!loading && !error && users.length === 0 ? <p className="central-users-empty">Todavía no hay cuentas centrales. Creá una para asignarle acceso a las aplicaciones.</p> : null}

      {!loading && users.length > 0 ? <div className="central-users-list">
        {users.map((user) => {
          const account = accounts[user.id] ?? accountDraft(user);
          const draft = drafts[user.id] ?? appDraft(user);
          const busyAccount = saving === `${user.id}:account`;
          const busyApps = saving === `${user.id}:apps`;
          return <article className="central-user-row" key={user.id}>
            <div className="central-user-account">
              <div className="central-user-name-line">
                <strong>{user.username}</strong>
                <span className={`central-user-status ${user.status === "ACTIVE" ? "is-active" : ""}`}>{statusLabel(user.status)}</span>
              </div>
              <span className="central-user-dates">Creado {new Date(user.created).toLocaleDateString("es-AR")} · {user.lastLogin ? `Último acceso ${new Date(user.lastLogin).toLocaleDateString("es-AR")}` : "Sin ingresos"}</span>
              <div className="central-user-account-fields">
                <label><span>Nombre de usuario</span><input value={account.username} maxLength={80} onChange={(event) => setAccounts((current) => ({ ...current, [user.id]: { ...account, username: event.target.value } }))} /></label>
                <label><span>Cambiar contraseña</span><input type="password" autoComplete="new-password" minLength={10} maxLength={128} placeholder="Dejar vacío para conservarla" value={account.password} onChange={(event) => setAccounts((current) => ({ ...current, [user.id]: { ...account, password: event.target.value } }))} /></label>
                <label className="central-user-check"><input type="checkbox" checked={account.enabled} onChange={(event) => setAccounts((current) => ({ ...current, [user.id]: { ...account, enabled: event.target.checked } }))} /><span>Cuenta habilitada</span></label>
                <label className="central-user-check"><input type="checkbox" checked={account.mustChangePassword} onChange={(event) => setAccounts((current) => ({ ...current, [user.id]: { ...account, mustChangePassword: event.target.checked } }))} /><span>Exigir cambio de contraseña</span></label>
              </div>
              <button className="db-button db-button-quiet central-user-save" type="button" onClick={() => void saveAccount(user)} disabled={Boolean(saving) || user.status === "DELETED" || !account.username.trim() || (account.password.length > 0 && account.password.length < 10)} aria-busy={busyAccount}>{busyAccount ? "Guardando cuenta…" : "Guardar cuenta"}</button>
            </div>
            <div className="central-user-access">
              <div className="central-user-access-heading"><h3>Acceso por aplicación</h3><span>El rol se aplica dentro de cada app.</span></div>
              <div className="central-user-apps">
                {apps.map(({ code, label }) => <div className="central-user-app" key={code}>
                  <label className="central-user-check"><input type="checkbox" checked={draft[code].enabled} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, [code]: { ...draft[code], enabled: event.target.checked } } }))} /><span>{label}</span></label>
                  <label className="central-user-role"><span>Rol</span><select value={draft[code].role} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, [code]: { ...draft[code], role: event.target.value as "USER" | "ADMIN" } } }))}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label>
                </div>)}
              </div>
              <button className="db-button central-user-save" type="button" onClick={() => void saveApps(user)} disabled={Boolean(saving) || user.status === "DELETED"} aria-busy={busyApps}>{busyApps ? "Guardando accesos…" : "Guardar accesos"}</button>
            </div>
          </article>;
        })}
      </div> : null}
    </section>
  );
}
