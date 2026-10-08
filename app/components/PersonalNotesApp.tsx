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

const FilesView = lazy(() => import("../features/files/FilesView").then((module) => ({ default: module.FilesView })));
const FinancesView = lazy(() => import("../features/finances/FinancesView").then((module) => ({ default: module.FinancesView })));
const DashboardView = lazy(() => import("../features/dashboard/DashboardView").then((module) => ({ default: module.DashboardView })));
const DayView = lazy(() => import("../features/day/DayView").then((module) => ({ default: module.DayView })));
const CalendarView = lazy(() => import("../features/calendar/CalendarView").then((module) => ({ default: module.CalendarView })));
const TasksView = lazy(() => import("../features/tasks/TasksView").then((module) => ({ default: module.TasksView })));
const NotesView = lazy(() => import("../features/notes/NotesView").then((module) => ({ default: module.NotesView })));
const SettingsView = lazy(() => import("../features/settings/SettingsView").then((module) => ({ default: module.SettingsView })));
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
  const focusIdRef = useRef(focusId);
  const [focusDate, setFocusDate] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("focusDate"));
  const [editId, setEditId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("edit"));
  const [focusRevision, setFocusRevision] = useState(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [gate, setGate] = useState<"loading" | "login" | "password" | "ready" | "error">("loading");
  const [gateError, setGateError] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sessionUserId = useRef<string | null>(null);

  const navigate = (section: SectionKey, targetId?: string, mode: "focus" | "edit" = "focus", targetDate?: string) => {
    const nextSection = displaySection(section);
    const nextTab = section === "tasks" || section === "notes" || section === "files" ? section : projectTab;
    const nextFinanceTab = section === "finances" && targetId ? "movimientos" : financeTab;
    if (nextSection === activeSection && nextTab === projectTab && !targetId) return;
    if (targetId) setFocusRevision((current) => current + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextSection);
    if (nextSection === "projects") url.searchParams.set("tab", nextTab); else url.searchParams.delete("tab");
    if (nextSection === "finances") url.searchParams.set("financeTab", nextFinanceTab); else url.searchParams.delete("financeTab");
    if (targetId) url.searchParams.set("focus", targetId); else url.searchParams.delete("focus");
    if (targetId && mode === "edit") url.searchParams.set("edit", targetId); else url.searchParams.delete("edit");
    if (section === "calendar" && targetDate) url.searchParams.set("focusDate", targetDate); else url.searchParams.delete("focusDate");
    const currentHistoryState = window.history.state as Record<string, unknown> | null;
    const isNavigatingFromDialog = Boolean(currentHistoryState?.notesDialogId);
    const nextHistoryState: Record<string, unknown> = { ...(currentHistoryState ?? {}), notesSection: nextSection };
    delete nextHistoryState.notesDialogId;
    if (isNavigatingFromDialog) window.history.replaceState(nextHistoryState, "", url);
    else window.history.pushState(nextHistoryState, "", url);
    setActiveSection(nextSection);
    setProjectTab(nextTab);
    setFinanceTab(nextFinanceTab);
    focusIdRef.current = targetId ?? null;
    setFocusId(focusIdRef.current);
    setFocusDate(section === "calendar" ? targetDate ?? null : null);
    setEditId(targetId && mode === "edit" ? targetId : null);
  };
  const changeProjectTab = (tab: ProjectTab) => { const url = new URL(window.location.href); url.searchParams.set("section", "projects"); url.searchParams.set("tab", tab); url.searchParams.delete("focus"); url.searchParams.delete("edit"); url.searchParams.delete("focusDate"); window.history.pushState({ ...window.history.state, notesSection: "projects" }, "", url); setProjectTab(tab); focusIdRef.current = null; setFocusId(null); setEditId(null); setFocusDate(null); };
  const changeFinanceTab = (tab: FinanceTab) => { const url = new URL(window.location.href); url.searchParams.set("section", "finances"); url.searchParams.set("financeTab", tab); url.searchParams.delete("tab"); url.searchParams.delete("focus"); url.searchParams.delete("edit"); window.history.pushState({ ...window.history.state, notesSection: "finances" }, "", url); setFinanceTab(tab); focusIdRef.current = null; setFocusId(null); setEditId(null); };

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
      const nextFocusId = params.get("focus");
      if (nextFocusId && nextFocusId !== focusIdRef.current) setFocusRevision((current) => current + 1);
      focusIdRef.current = nextFocusId;
      setFocusId(nextFocusId);
      setFocusDate(params.get("focusDate"));
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
        case "day": return <DayView key={focusId ? `${focusId}:${focusRevision}` : "day"} config={config} focusId={focusId} />;
        case "calendar": return <CalendarView key={focusId ? `${focusId}:${focusRevision}` : "calendar"} config={config} focusId={focusId} focusDate={focusDate} onOpenTask={(taskId) => navigate("tasks", taskId)} />;
        case "projects": return <ProjectsView key={focusId ? `${focusId}:${focusRevision}` : "projects"} config={config} tab={projectTab} onTabChange={changeProjectTab} focusId={focusId} editId={editId} />;
        case "tasks": return <TasksView key={focusId ? `${focusId}:${focusRevision}` : "tasks"} config={config} focusId={focusId} editId={editId} />;
        case "finances": return <FinancesView key={focusId ? `${focusId}:${focusRevision}` : "finances"} config={config} focusId={focusId} tab={financeTab} onTabChange={changeFinanceTab} />;
        case "files": return <FilesView key={focusId ? `${focusId}:${focusRevision}` : "files"} config={config} focusId={focusId} />;
        case "notes": return <NotesView key={focusId ? `${focusId}:${focusRevision}` : "notes"} config={config} focusId={focusId} />;
        case "repositories": return <RepositoriesView role={user?.role ?? "USER"} />;
        case "settings": return <SettingsView config={config} onConfigChanged={setConfig} />;
        default: return <DashboardView onNavigate={navigate} />;
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
