"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { LoginScreen } from "./LoginScreen";
import { SECTION_TOKENS, tokenStyle, type SectionKey } from "../config/sections";
import { ApiError, api, getCsrf, unwrapUser } from "../lib/api/client";
import type { ApiConfig, AuthUser } from "../lib/api/types";
import { ArchivosModule } from "../modules/ArchivosModule";
import { FinanzasModule } from "../modules/FinanzasModule";
import { HomeView } from "../modules/HomeView";
import { MiDiaModule } from "../modules/MiDiaModule";
import { NotasModule } from "../modules/NotasModule";

export function PersonalNotesApp() {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [gate, setGate] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [gateError, setGateError] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);

  const loadSession = async () => {
    setGate("loading");
    setGateError("");
    try {
      await getCsrf();
      const session = unwrapUser(await api.me());
      setUser(session);
      setConfig(await api.config());
      setGate("ready");
    } catch (reason) {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) setGate("login");
      else { setGateError(reason instanceof ApiError ? reason.message : "No se pudo conectar con Cuaderno."); setGate("error"); }
    }
  };

  useEffect(() => { queueMicrotask(() => void loadSession()); }, []);

  const handleAuthenticated = async () => { await loadSession(); };
  const logout = async () => {
    setLogoutPending(true);
    try { await api.logout(); } finally { setLogoutPending(false); setUser(null); setConfig(null); setGate("login"); }
  };

  useEffect(() => {
    const tokens = SECTION_TOKENS[activeSection];
    document.documentElement.style.setProperty("--page-accent", tokens.accent);
    document.documentElement.style.setProperty("--page-shadow", tokens.shadow);
  }, [activeSection]);

  const renderSection = () => {
    if (!config) return null;
    switch (activeSection) {
      case "day": return <MiDiaModule config={config} />;
      case "finances": return <FinanzasModule config={config} />;
      case "files": return <ArchivosModule />;
      case "notes": return <NotasModule config={config} />;
      default: return <HomeView onNavigate={setActiveSection} />;
    }
  };

  if (gate === "loading") return <main className="app-loading" aria-live="polite"><span className="login-mark" aria-hidden="true">✦</span><p>Abriendo tu cuaderno...</p><span className="visually-hidden">Ordená el ruido.</span></main>;
  if (gate === "error") return <LoginScreen initialError={gateError} onAuthenticated={handleAuthenticated} onRetry={() => void loadSession()} />;
  if (gate === "login") return <LoginScreen onAuthenticated={handleAuthenticated} />;
  if (!user || !config) return null;
  return <AppShell activeSection={activeSection} onNavigate={setActiveSection} style={tokenStyle(activeSection)} user={user} onLogout={() => void logout()} logoutPending={logoutPending}>{renderSection()}</AppShell>;
}
