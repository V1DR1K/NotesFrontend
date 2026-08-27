import type {
  ApiConfig,
  ApiOption,
  AuthUser,
  Dashboard,
  DayEntry,
  FinanceMovement,
  FinanceAnalytics,
  FinanceAccount,
  FinanceSummary,
  ExchangeRate,
  FinanceItemType,
  FileFolder,
  FileItem,
  LoginRequest,
  Note,
  PageResponse,
  ConfigKind,
  SearchResult,
} from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");
let refreshPromise: Promise<boolean> | null = null;
const REFRESH_LOCK_KEY = "notes.auth.refresh.lock";
const REFRESH_MARKER_KEY = "notes.auth.refresh.marker";
const SESSION_EXPIRED_KEY = "notes.auth.expired";
const TAB_ID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
type ApiRequestInit = Omit<RequestInit, "body"> & { body?: BodyInit | object | null };

function resetSessionState() {
  refreshPromise = null;
}

function clearSessionState() {
  resetSessionState();
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
    localStorage.removeItem(REFRESH_MARKER_KEY);
    localStorage.removeItem(SESSION_EXPIRED_KEY);
  } catch { /* storage can be unavailable in private contexts */ }
}

export function hasSessionHint() { return typeof window !== "undefined"; }

function dispatchSessionExpired() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("notes:session-expired"));
}

function broadcastSessionExpired() {
  clearSessionState();
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SESSION_EXPIRED_KEY, String(Date.now())); } catch { /* storage can be unavailable in private contexts */ }
  dispatchSessionExpired();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SESSION_EXPIRED_KEY || !event.newValue) return;
    clearSessionState();
    dispatchSessionExpired();
  });
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function normalizeAuthUser(value: unknown): AuthUser {
  const record = asRecord(value);
  if (!record.id || !record.username) throw new ApiError("La sesión recibida no es válida.", 502);
  return { id: String(record.id), username: String(record.username), role: String(record.role ?? "USER"), mustChangePassword: Boolean(record.mustChangePassword) };
}

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) throw new Error("API paths must be same-origin");
  if (path === API_BASE || path.startsWith(`${API_BASE}/`)) return path;
  if (/^https?:\/\//i.test(API_BASE) && path.startsWith("/")) {
    if (typeof window !== "undefined" && new URL(API_BASE, window.location.origin).origin !== window.location.origin) throw new Error("Configured API origin must be same-origin");
    const basePath = new URL(API_BASE).pathname.replace(/\/$/, "");
    if (path === basePath || path.startsWith(`${basePath}/`)) return new URL(path, API_BASE).toString();
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function problemError(payload: unknown, status: number, path = "") {
  if (typeof payload === "string") return new ApiError(payload || "No se pudo completar la solicitud.", status);
  if (!payload || typeof payload !== "object") return new ApiError("No se pudo completar la solicitud.", status);

  const problem = payload as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  const violations = problem.violations ?? problem.errors ?? problem.fieldErrors;
  if (Array.isArray(violations)) {
    for (const violation of violations) {
      if (violation && typeof violation === "object") {
        const item = violation as Record<string, unknown>;
        const field = String(item.field ?? item.name ?? "");
        const message = String(item.message ?? item.reason ?? "");
        if (field && message) fieldErrors[field] = message;
      }
    }
  } else if (violations && typeof violations === "object") {
    for (const [field, value] of Object.entries(violations)) fieldErrors[field] = String(value);
  }

  const detail = String(problem.detail ?? problem.message ?? problem.title ?? "");
  const hasSpanishCopy = /[áéíóúñ¿¡]|\b(no|usuario|contraseña|fecha|importe|archivo|carpeta|nota|registro)\b/i.test(detail);
  const spanish = hasSpanishCopy ? detail : status === 401 && path === "/auth/login" ? "Usuario o contraseña incorrectos." : status === 401 ? "Tu sesión venció. Volvé a ingresar." : status === 403 ? "No tenés permiso para realizar esta acción." : status === 404 ? "No encontramos ese registro." : status >= 500 ? "El servidor no pudo completar la solicitud." : "Revisá los datos e intentá otra vez.";
  return new ApiError(spanish, status, fieldErrors);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function financeType(value: unknown): FinanceItemType | undefined {
  return value === "INCOME" || value === "EXPENSE" || value === "TRANSFER" ? value : undefined;
}

function optionList(value: unknown): ApiOption[] {
  const candidate = Array.isArray(value) ? value : asRecord(value).content;
  const list: unknown[] = Array.isArray(candidate) ? candidate : [];
  return list.map((item) => {
    const record = asRecord(item);
    const code = String(record.code ?? record.value ?? record.id ?? "");
    return {
      code,
      label: String(record.label ?? record.name ?? record.displayName ?? code),
      shortLabel: record.shortLabel ? String(record.shortLabel) : undefined,
      emoji: record.emoji ? String(record.emoji) : undefined,
      icon: record.icon ? String(record.icon) : undefined,
      sortOrder: Number(record.sortOrder ?? 0),
      active: record.active !== false,
      financeType: financeType(record.financeType),
    };
  }).filter((item) => item.code);
}

function option(value: unknown): ApiOption | undefined {
  const record = asRecord(value);
  const code = String(record.code ?? record.value ?? "");
  return code ? { code, label: String(record.label ?? code), shortLabel: record.shortLabel ? String(record.shortLabel) : undefined, emoji: record.emoji ? String(record.emoji) : undefined, icon: record.icon ? String(record.icon) : undefined, sortOrder: Number(record.sortOrder ?? 0), active: record.active !== false, financeType: financeType(record.financeType) } : undefined;
}

function normalizeDay(value: unknown): DayEntry {
  const record = asRecord(value);
  const status = option(record.status);
  return { ...record as unknown as DayEntry, id: String(record.id ?? ""), date: String(record.date ?? ""), analysisStatus: record.analysisStatus === "COMPLETED" ? "COMPLETED" : "PENDING", statusCode: status?.code ?? String(record.statusCode ?? ""), status, feeling: String(record.feeling ?? ""), description: String(record.description ?? "") };
}

function normalizeNote(value: unknown): Note {
  const record = asRecord(value);
  const category = option(record.category);
  return { ...record as unknown as Note, id: String(record.id ?? ""), title: String(record.title ?? ""), body: String(record.body ?? ""), categoryCode: category?.code ?? String(record.categoryCode ?? ""), category, date: String(record.date ?? "") };
}

function normalizeMovement(value: unknown): FinanceMovement {
  const record = asRecord(value);
  const item = option(record.item);
  return { ...record as unknown as FinanceMovement, id: String(record.id ?? ""), date: String(record.date ?? ""), bucket: String(record.bucket ?? ""), accountCode: String(record.accountCode ?? "mercadopago"), itemCode: item?.code ?? String(record.itemCode ?? ""), item, amount: record.amount as FinanceMovement["amount"] };
}

function normalizeSummary(value: unknown): FinanceSummary {
  const record = asRecord(value);
  return { from: String(record.from ?? ""), to: String(record.to ?? ""), income: record.income as FinanceSummary["income"], expense: record.expense as FinanceSummary["expense"], invested: record.invested as FinanceSummary["invested"], cash: record.cash as FinanceSummary["cash"], exchangeRate: record.exchangeRate as ExchangeRate | undefined };
}

function normalizeAnalytics(value: unknown): FinanceAnalytics {
  const record = asRecord(value);
  const daily = Array.isArray(record.daily) ? record.daily : [];
  const categories = (candidate: unknown) => Array.isArray(candidate) ? candidate.map((item) => {
    const entry = asRecord(item);
    return { itemCode: String(entry.itemCode ?? ""), total: entry.total as number | string };
  }).filter((item) => item.itemCode) : [];
  return {
    from: String(record.from ?? ""),
    to: String(record.to ?? ""),
    daily: daily.map((item) => {
      const entry = asRecord(item);
      return { date: String(entry.date ?? ""), income: entry.income as number | string, expense: entry.expense as number | string };
    }).filter((item) => item.date),
    incomeCategories: categories(record.incomeCategories),
    expenseCategories: categories(record.expenseCategories),
  };
}

function normalizeAccount(value: unknown): FinanceAccount {
  const record = asRecord(value);
  return { code: String(record.code ?? ""), label: String(record.label ?? record.code ?? "Cuenta"), type: String(record.type ?? ""), balanceArs: record.balanceArs as number | string, annualRatePercent: record.annualRatePercent as number | string, growthMode: String(record.growthMode ?? "MANUAL"), balanceAsOf: String(record.balanceAsOf ?? "") };
}

function normalizeFile(value: unknown): FileItem {
  const record = asRecord(value);
  return { ...record as unknown as FileItem, id: String(record.id ?? ""), name: String(record.name ?? ""), description: String(record.description ?? record.name ?? ""), extension: record.extension ? String(record.extension) : undefined, mimeType: record.mimeType ? String(record.mimeType) : undefined, sizeBytes: record.sizeBytes as number | string | undefined, kind: String(record.kind ?? "OTHER"), folder: record.folder as FileItem["folder"], downloadUrl: record.downloadUrl ? String(record.downloadUrl) : undefined, uploadedAt: record.uploadedAt ? String(record.uploadedAt) : undefined };
}

function normalizeDashboard(value: unknown): Dashboard {
  const record = asRecord(value);
  return {
    counters: { days: Number(record.dayEntriesCount ?? 0), notes: Number(record.notesCount ?? 0), files: Number(record.filesCount ?? 0), movements: Number(record.financeMovementsCount ?? 0) },
    financeSummary: normalizeSummary(record.financeSummary),
    recentNotes: Array.isArray(record.recentNotes) ? record.recentNotes.map(normalizeNote) : [],
    recentFiles: Array.isArray(record.recentFiles) ? record.recentFiles.map(normalizeFile) : [],
    recentDays: Array.isArray(record.recentDays) ? record.recentDays.map(normalizeDay) : [],
    recentMovements: Array.isArray(record.recentMovements) ? record.recentMovements.map(normalizeMovement) : [],
  };
}

function normalizePageItems<T>(payload: unknown, normalize: (value: unknown) => T) {
  const page = normalizePage<unknown>(payload);
  return { ...page, content: page.content.map(normalize) };
}

export function normalizePage<T>(payload: unknown): PageResponse<T> {
  const record = asRecord(payload);
  if (Array.isArray(payload)) return { content: payload as T[], page: 0, size: payload.length, totalElements: payload.length, totalPages: payload.length ? 1 : 0, first: true, last: true };
  return {
    content: Array.isArray(record.content) ? record.content as T[] : [],
    page: Number(record.page ?? 0),
    size: Number(record.size ?? 0),
    totalElements: Number(record.totalElements ?? 0),
    totalPages: Number(record.totalPages ?? 0),
    first: Boolean(record.first ?? true),
    last: Boolean(record.last ?? true),
  };
}

function sleep(milliseconds: number) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }

function refreshedAfter(startedAt: number) { return Number(localStorage.getItem(REFRESH_MARKER_KEY) ?? 0) > startedAt; }

async function refreshWithLocalLock(startedAt: number, action: () => Promise<boolean>) {
  const lockValue = `${TAB_ID}:${Date.now()}`;
  const deadline = Date.now() + 12000;
  let acquired = false;
  while (Date.now() < deadline) {
    if (refreshedAfter(startedAt)) return true;
    const current = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!current || Number(current.split(":")[1] ?? 0) < Date.now() - 12000) {
      localStorage.setItem(REFRESH_LOCK_KEY, lockValue);
      acquired = localStorage.getItem(REFRESH_LOCK_KEY) === lockValue;
      if (acquired) break;
    }
    await sleep(50);
  }
  if (!acquired) return false;
  try { return await action(); }
  finally { if (localStorage.getItem(REFRESH_LOCK_KEY) === lockValue) localStorage.removeItem(REFRESH_LOCK_KEY); }
}

async function refreshTokens() {
  const response = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) return false;
  localStorage.setItem(REFRESH_MARKER_KEY, String(Date.now()));
  return true;
}

function refreshSession(startedAt: number) {
  if (!refreshPromise) {
    const action = async () => {
      if (refreshedAfter(startedAt)) return true;
      return refreshTokens();
    };
    const coordinated = typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("notes-auth-refresh", { mode: "exclusive" }, () => action()) as unknown as Promise<boolean>
      : refreshWithLocalLock(startedAt, action);
    refreshPromise = coordinated.finally(() => { refreshPromise = null; });
  }
  return refreshPromise ?? Promise.resolve(false);
}

async function request<T>(path: string, init: ApiRequestInit = {}, retried = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  let body = init.body;
  if (body && !isFormData && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path), { ...init, method, headers, credentials: "include", body: body as BodyInit | null | undefined });
  const payload = await readJson(response);
  if (response.status === 401 && path === "/auth/refresh") broadcastSessionExpired();
  if (response.status === 401 && !retried && !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path)) {
    try {
      const refreshed = await refreshSession(Date.now());
      if (refreshed) return request<T>(path, init, true);
    } catch { /* The session-expired event below handles a rejected refresh. */ }
    broadcastSessionExpired();
  }
  if (!response.ok) {
    if (response.status === 401 && !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path)) window.dispatchEvent(new Event("notes:session-expired"));
    throw problemError(payload, response.status, path);
  }
  return payload as T;
}

export function get<T>(path: string, init?: Omit<ApiRequestInit, "method" | "body">) { return request<T>(path, { ...init, method: "GET" }); }
export function post<T>(path: string, body?: object | FormData) { return request<T>(path, { method: "POST", body }); }
export function patch<T>(path: string, body: object) { return request<T>(path, { method: "PATCH", body }); }
export function del<T = void>(path: string) { return request<T>(path, { method: "DELETE" }); }
export function upload<T>(path: string, body: FormData) { return request<T>(path, { method: "POST", body }); }
export async function download(path: string) {
  return downloadWithToken(path, false);
}

async function downloadWithToken(path: string, retried: boolean): Promise<Blob> {
  const headers = new Headers({ Accept: "*/*" });
  const response = await fetch(apiUrl(path), { headers, credentials: "include" });
  if (response.status === 401 && !retried) {
    const refreshed = await refreshSession(Date.now()).catch(() => null);
    if (refreshed) return downloadWithToken(path, true);
    broadcastSessionExpired();
  }
  if (!response.ok) throw problemError(await readJson(response), response.status);
  return response.blob();
}

export const api = {
  login: async (credentials: LoginRequest) => {
    const user = unwrapUser(await request<unknown>("/auth/login", { method: "POST", body: credentials }));
    return user;
  },
  logout: async () => {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    }
    finally { broadcastSessionExpired(); }
  },
  me: () => request<AuthUser | { user: AuthUser }>("/auth/me"),
  changePassword: (body: { currentPassword: string; newPassword: string }) => request<unknown>("/auth/change-password", { method: "PUT", body }),
  config: async (): Promise<ApiConfig> => {
    const [dayStatuses, dayFeelings, financeItems, noteCategories] = await Promise.all([
      request<unknown>("/config/day-statuses"), request<unknown>("/config/day-feelings"), request<unknown>("/config/finance-items"), request<unknown>("/config/note-categories"),
    ]);
    return { dayStatuses: optionList(dayStatuses), dayFeelings: optionList(dayFeelings), financeItems: optionList(financeItems), noteCategories: optionList(noteCategories) };
  },
  createConfigOption: (kind: ConfigKind, body: { code: string; label: string; emoji?: string; sortOrder: number; active: boolean; financeType?: string }) => {
    const payload = kind === "day-statuses" ? { code: body.code, label: body.label, emoji: body.emoji ?? "", sortOrder: body.sortOrder } : body;
    return post<unknown>(`/config/${kind}`, payload);
  },
  updateConfigOption: (kind: ConfigKind, code: string, body: { label?: string; emoji?: string; sortOrder?: number; active?: boolean; financeType?: string }) => patch<unknown>(`/config/${kind}/${encodeURIComponent(code)}`, body),
  deleteConfigOption: (kind: ConfigKind, code: string) => del(`/config/${kind}/${encodeURIComponent(code)}`),
  search: (query: string) => get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
  dashboard: () => request<unknown>("/dashboard").then(normalizeDashboard),
  days: (query: URLSearchParams) => request<unknown>(`/day-entries?${query}`).then((payload) => normalizePageItems(payload, normalizeDay)),
  createDay: (body: { date: string; description: string }) => request<unknown>("/day-entries", { method: "POST", body }).then(normalizeDay),
  updateDay: (id: string, body: { date: string; description: string }) => request<unknown>(`/day-entries/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeDay),
  analyzeDay: (id: string) => request<unknown>(`/day-entries/${encodeURIComponent(id)}/analyze`, { method: "POST" }).then(normalizeDay),
  deleteDay: (id: string) => request<void>(`/day-entries/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notes: (query: URLSearchParams) => request<unknown>(`/notes?${query}`).then((payload) => normalizePageItems(payload, normalizeNote)),
  createNote: (body: { title: string; body: string; categoryCode: string; date: string }) => request<unknown>("/notes", { method: "POST", body }).then(normalizeNote),
  updateNote: (id: string, body: { title: string; body: string; categoryCode: string; date: string }) => request<unknown>(`/notes/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeNote),
  deleteNote: (id: string) => request<void>(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  movements: (query: URLSearchParams) => request<unknown>(`/finance/movements?${query}`).then((payload) => normalizePageItems(payload, normalizeMovement)),
  createMovement: (body: { date: string; bucket: string; accountCode: string; itemCode: string; amountArs: number; note?: string }) => request<unknown>("/finance/movements", { method: "POST", body }).then(normalizeMovement),
  updateMovement: (id: string, body: { date: string; bucket: string; accountCode: string; itemCode: string; amountArs: number; note?: string }) => request<unknown>(`/finance/movements/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeMovement),
  deleteMovement: (id: string) => request<void>(`/finance/movements/${encodeURIComponent(id)}`, { method: "DELETE" }),
  financeSummary: (query: URLSearchParams) => request<FinanceSummary>(`/finance/summary?${query}`),
  financeAnalytics: (query: URLSearchParams) => request<unknown>(`/finance/analytics?${query}`).then(normalizeAnalytics),
  financeAccounts: () => request<unknown>("/finance/accounts").then((payload) => Array.isArray(payload) ? payload.map(normalizeAccount).filter((account) => account.code) : []),
  syncFinanceAccount: (code: string, body: { balanceArs: number }) => request<unknown>(`/finance/accounts/${encodeURIComponent(code)}/balance`, { method: "PUT", body }).then(normalizeAccount),
  exchangeRate: () => request<ExchangeRate>("/finance/exchange-rate/usd"),
  folders: () => request<unknown>("/file-folders").then((payload) => normalizePage<FileFolder>(payload)),
  createFolder: (name: string) => request<FileFolder>("/file-folders", { method: "POST", body: { name } }),
  files: (query: URLSearchParams) => request<unknown>(`/files?${query}`).then((payload) => normalizePageItems(payload, normalizeFile)),
  uploadFile: (file: File, folderId?: string, name?: string) => { const body = new FormData(); body.append("file", file); if (folderId) body.append("folderId", folderId); if (name) body.append("name", name); return request<unknown>("/files", { method: "POST", body }).then(normalizeFile); },
  updateFile: (id: string, body: { name: string; folderId?: string }) => request<unknown>(`/files/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeFile),
  deleteFile: (id: string) => request<void>(`/files/${encodeURIComponent(id)}`, { method: "DELETE" }),
  downloadFile: (file: FileItem) => download(file.downloadUrl || `/files/${encodeURIComponent(file.id)}/download`),
};

export function unwrapUser(payload: unknown): AuthUser {
  const record = asRecord(payload);
  return normalizeAuthUser(record.user ?? record);
}
