"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";
import { LoginScreen } from "./LoginScreen";
import { ChangePasswordScreen } from "./ChangePasswordScreen";
import { isSectionKey, SECTION_TOKENS, tokenStyle, type SectionKey } from "../config/sections";
import { ApiError, api, hasSessionHint, unwrapUser } from "../lib/api/client";
import { clearApiQueryCache } from "../lib/api/hooks";
import type { ApiConfig, AuthUser } from "../lib/api/types";
import type { ProjectTab } from "../features/projects/ProjectsView";
import type { FinanceTab } from "../features/finances/FinancesView";

const ArchivosModule = lazy(() => import("../modules/ArchivosModule").then((module) => ({ default: module.ArchivosModule })));
const FinanzasModule = lazy(() => import("../modules/FinanzasModule").then((module) => ({ default: module.FinanzasModule })));
const HomeView = lazy(() => import("../modules/HomeView").then((module) => ({ default: module.HomeView })));
const MiDiaModule = lazy(() => import("../modules/MiDiaModule").then((module) => ({ default: module.MiDiaModule })));
const CalendarModule = lazy(() => import("../modules/CalendarModule").then((module) => ({ default: module.CalendarModule })));
const TasksModule = lazy(() => import("../modules/TasksModule").then((module) => ({ default: module.TasksModule })));
const NotasModule = lazy(() => import("../modules/NotasModule").then((module) => ({ default: module.NotasModule })));
const SettingsModule = lazy(() => import("../modules/SettingsModule").then((module) => ({ default: module.SettingsModule })));
const SearchPalette = lazy(() => import("./SearchPalette").then((module) => ({ default: module.SearchPalette })));
const ProjectsView = lazy(() => import("../features/projects/ProjectsView").then((module) => ({ default: module.ProjectsView })));
const RepositoriesView = lazy(() => import("../features/repositories/RepositoriesView").then((module) => ({ default: module.RepositoriesView })));

const projectTabFor = (value: string | null): ProjectTab => value === "notes" || value === "files" ? value : "tasks";
const financeTabFor = (value: string | null): FinanceTab => value === "crypto" || value === "movimientos" ? value : "inicio";
const displaySection = (value: SectionKey): SectionKey => value === "tasks" || value === "notes" || value === "files" ? "projects" : value;

export function PersonalNotesApp() {
  const [activeSection, setActiveSection] = useState<SectionKey>(() => {
    if (typeof window === "undefined") return "overview";
    const section = new URLSearchParams(window.location.search).get("section") ?? window.history.state?.notesSection;
    return isSectionKey(section) ? displaySection(section) : "overview";
  });
  const [projectTab, setProjectTab] = useState<ProjectTab>(() => typeof window === "undefined" ? "tasks" : projectTabFor(new URLSearchParams(window.location.search).get("tab") ?? new URLSearchParams(window.location.search).get("section")));
  const [financeTab, setFinanceTab] = useState<FinanceTab>(() => typeof window === "undefined" ? "inicio" : financeTabFor(new URLSearchParams(window.location.search).get("financeTab")));
  const [focusId, setFocusId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("focus"));
  const [editId, setEditId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("edit"));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [gate, setGate] = useState<"loading" | "login" | "password" | "ready" | "error">("loading");
  const [gateError, setGateError] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sessionUserId = useRef<string | null>(null);

  const navigate = (section: SectionKey, targetId?: string, mode: "focus" | "edit" = "focus") => {
    const nextSection = displaySection(section);
    const nextTab = section === "tasks" || section === "notes" || section === "files" ? section : projectTab;
    if (nextSection === activeSection && nextTab === projectTab && !targetId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextSection);
    if (nextSection === "projects") url.searchParams.set("tab", nextTab); else url.searchParams.delete("tab");
    if (nextSection === "finances") url.searchParams.set("financeTab", financeTab); else url.searchParams.delete("financeTab");
    if (targetId) url.searchParams.set("focus", targetId); else url.searchParams.delete("focus");
    if (targetId && mode === "edit") url.searchParams.set("edit", targetId); else url.searchParams.delete("edit");
    window.history.pushState({ ...window.history.state, notesSection: nextSection }, "", url);
    setActiveSection(nextSection);
    setProjectTab(nextTab);
    setFocusId(targetId ?? null);
    setEditId(targetId && mode === "edit" ? targetId : null);
  };
  const changeProjectTab = (tab: ProjectTab) => { const url = new URL(window.location.href); url.searchParams.set("section", "projects"); url.searchParams.set("tab", tab); window.history.pushState({ ...window.history.state, notesSection: "projects" }, "", url); setProjectTab(tab); };
  const changeFinanceTab = (tab: FinanceTab) => { const url = new URL(window.location.href); url.searchParams.set("section", "finances"); url.searchParams.set("financeTab", tab); url.searchParams.delete("tab"); url.searchParams.delete("focus"); url.searchParams.delete("edit"); window.history.pushState({ ...window.history.state, notesSection: "finances" }, "", url); setFinanceTab(tab); setFocusId(null); setEditId(null); };

  useEffect(() => {
    const currentSection = new URLSearchParams(window.location.search).get("section") ?? window.history.state?.notesSection;
    if (!isSectionKey(currentSection)) {
      const url = new URL(window.location.href);
      url.searchParams.set("section", "overview");
      window.history.replaceState({ ...window.history.state, notesSection: "overview" }, "", url);
    } else if (currentSection === "tasks" || currentSection === "notes" || currentSection === "files") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", "projects");
      url.searchParams.set("tab", projectTabFor(url.searchParams.get("tab") ?? currentSection));
      window.history.replaceState({ ...window.history.state, notesSection: "projects" }, "", url);
    } else if (currentSection === "finances") {
      const url = new URL(window.location.href);
      const selectedFinanceTab = financeTabFor(url.searchParams.get("financeTab"));
      if (url.searchParams.get("financeTab") !== selectedFinanceTab || url.searchParams.has("tab")) {
        url.searchParams.set("financeTab", selectedFinanceTab);
        url.searchParams.delete("tab");
        window.history.replaceState({ ...window.history.state, notesSection: "finances" }, "", url);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const section = new URLSearchParams(window.location.search).get("section") ?? event.state?.notesSection;
      if (isSectionKey(section)) setActiveSection(displaySection(section));
      const params = new URLSearchParams(window.location.search);
      setProjectTab(projectTabFor(params.get("tab") ?? section));
      setFinanceTab(financeTabFor(params.get("financeTab")));
      setFocusId(params.get("focus"));
      setEditId(params.get("edit"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadSession = async () => {
    setGate("loading");
    setGateError("");
    if (!hasSessionHint()) { setGate("login"); return; }
    try {
      const session = unwrapUser(await api.me());
      if (sessionUserId.current && sessionUserId.current !== session.id) clearApiQueryCache();
      sessionUserId.current = session.id;
      setUser(session);
      if (session.mustChangePassword) { setConfig(null); setGate("password"); }
      else { setConfig(await api.config()); setGate("ready"); }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) { sessionUserId.current = null; clearApiQueryCache(); setGate("login"); }
      else { setGateError(reason instanceof ApiError ? reason.message : "No se pudo conectar con Cuaderno."); setGate("error"); }
    }
  };

  useEffect(() => { queueMicrotask(() => void loadSession()); }, []);

  useEffect(() => {
    const expireSession = () => { sessionUserId.current = null; clearApiQueryCache(); setUser(null); setConfig(null); setGate("login"); };
    window.addEventListener("notes:session-expired", expireSession);
    return () => window.removeEventListener("notes:session-expired", expireSession);
  }, []);

  const handleAuthenticated = async () => { await loadSession(); };
  const logout = async () => {
    setLogoutPending(true);
    try { await api.logout(); } catch { /* Local sign-out still completes if central revocation fails. */ }
    finally { sessionUserId.current = null; clearApiQueryCache(); setLogoutPending(false); setUser(null); setConfig(null); setGate("login"); }
  };

  useEffect(() => {
    const tokens = SECTION_TOKENS[activeSection];
    document.documentElement.style.setProperty("--page-accent", tokens.accent);
    document.documentElement.style.setProperty("--page-shadow", tokens.shadow);
  }, [activeSection]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const renderSection = () => {
    if (!config) return null;
    const section = (() => {
      switch (activeSection) {
        case "day": return <MiDiaModule config={config} focusId={focusId} />;
        case "calendar": return <CalendarModule config={config} onOpenTask={(taskId) => navigate("tasks", taskId, "edit")} />;
        case "projects": return <ProjectsView config={config} tab={projectTab} onTabChange={changeProjectTab} focusId={focusId} editId={editId} />;
        case "tasks": return <TasksModule config={config} focusId={focusId} editId={editId} />;
        case "finances": return <FinanzasModule config={config} focusId={focusId} tab={financeTab} onTabChange={changeFinanceTab} />;
        case "files": return <ArchivosModule config={config} focusId={focusId} />;
        case "notes": return <NotasModule config={config} focusId={focusId} />;
        case "repositories": return <RepositoriesView role={user?.role ?? "USER"} />;
        case "settings": return <SettingsModule config={config} onConfigChanged={setConfig} />;
        default: return <HomeView onNavigate={navigate} />;
      }
    })();
    return <Suspense fallback={<div className="app-loading" aria-live="polite"><p>Abriendo el módulo...</p></div>}>{section}</Suspense>;
  };

  if (gate === "loading") return <main className="app-loading" aria-live="polite"><span className="login-mark" aria-hidden="true">✦</span><p>Abriendo tu cuaderno...</p><span className="visually-hidden">Ordená el ruido.</span></main>;
  if (gate === "error") return <LoginScreen initialError={gateError} onAuthenticated={handleAuthenticated} onRetry={() => void loadSession()} />;
  if (gate === "login") return <LoginScreen onAuthenticated={handleAuthenticated} />;
  if (gate === "password") return <ChangePasswordScreen onChanged={() => void loadSession()} />;
  if (!user || !config) return null;
  return <AppShell activeSection={activeSection} onNavigate={navigate} onOpenSearch={() => setSearchOpen(true)} onOpenSettings={() => navigate("settings")} style={tokenStyle(activeSection)} user={user} onLogout={() => void logout()} logoutPending={logoutPending}>{renderSection()}{searchOpen ? <SearchPalette onClose={() => setSearchOpen(false)} onNavigate={navigate} /> : null}</AppShell>;
}
