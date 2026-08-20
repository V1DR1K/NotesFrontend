import type {
  ApiConfig,
  ApiOption,
  AuthUser,
  Dashboard,
  DayEntry,
  FinanceMovement,
  FinanceSummary,
  ExchangeRate,
  FileFolder,
  FileItem,
  LoginRequest,
  Note,
  PageResponse,
} from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");
let csrfToken: string | null = null;
type ApiRequestInit = Omit<RequestInit, "body"> & { body?: BodyInit | object | null };

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

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path === API_BASE || path.startsWith(`${API_BASE}/`)) return path;
  if (/^https?:\/\//i.test(API_BASE) && path.startsWith("/")) {
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

function problemError(payload: unknown, status: number) {
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
  const spanish = hasSpanishCopy ? detail : status === 401 ? "Usuario o contraseña incorrectos." : status === 403 ? "No tenés permiso para realizar esta acción." : status === 404 ? "No encontramos ese registro." : status >= 500 ? "El servidor no pudo completar la solicitud." : "Revisá los datos e intentá otra vez.";
  return new ApiError(spanish, status, fieldErrors);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
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
    };
  }).filter((item) => item.code);
}

function option(value: unknown): ApiOption | undefined {
  const record = asRecord(value);
  const code = String(record.code ?? record.value ?? "");
  return code ? { code, label: String(record.label ?? code), shortLabel: record.shortLabel ? String(record.shortLabel) : undefined, emoji: record.emoji ? String(record.emoji) : undefined, icon: record.icon ? String(record.icon) : undefined } : undefined;
}

function normalizeDay(value: unknown): DayEntry {
  const record = asRecord(value);
  const status = option(record.status);
  return { ...record as unknown as DayEntry, id: String(record.id ?? ""), date: String(record.date ?? ""), statusCode: status?.code ?? String(record.statusCode ?? ""), status };
}

function normalizeNote(value: unknown): Note {
  const record = asRecord(value);
  const category = option(record.category);
  return { ...record as unknown as Note, id: String(record.id ?? ""), title: String(record.title ?? ""), body: String(record.body ?? ""), categoryCode: category?.code ?? String(record.categoryCode ?? ""), category, date: String(record.date ?? "") };
}

function normalizeMovement(value: unknown): FinanceMovement {
  const record = asRecord(value);
  const concept = option(record.concept);
  const category = option(record.category);
  return { ...record as unknown as FinanceMovement, id: String(record.id ?? ""), date: String(record.date ?? ""), bucket: String(record.bucket ?? ""), conceptCode: concept?.code ?? String(record.conceptCode ?? ""), categoryCode: category?.code ?? String(record.categoryCode ?? ""), concept, category, amount: record.amount as FinanceMovement["amount"] };
}

function normalizeSummary(value: unknown): FinanceSummary {
  const record = asRecord(value);
  return { from: String(record.from ?? ""), to: String(record.to ?? ""), income: record.income as FinanceSummary["income"], expense: record.expense as FinanceSummary["expense"], invested: record.invested as FinanceSummary["invested"], cash: record.cash as FinanceSummary["cash"], exchangeRate: record.exchangeRate as ExchangeRate | undefined };
}

function normalizeDashboard(value: unknown): Dashboard {
  const record = asRecord(value);
  return {
    counters: { days: Number(record.dayEntriesCount ?? 0), notes: Number(record.notesCount ?? 0), files: Number(record.filesCount ?? 0), movements: Number(record.financeMovementsCount ?? 0) },
    financeSummary: normalizeSummary(record.financeSummary),
    recentNotes: Array.isArray(record.recentNotes) ? record.recentNotes.map(normalizeNote) : [],
    recentFiles: Array.isArray(record.recentFiles) ? record.recentFiles as FileItem[] : [],
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

async function request<T>(path: string, init: ApiRequestInit = {}, retried = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (mutating && !csrfToken) await getCsrf();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (mutating && csrfToken) headers.set("X-XSRF-TOKEN", csrfToken);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  let body = init.body;
  if (body && !isFormData && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path), { ...init, method, headers, body: body as BodyInit | null | undefined, credentials: "include" });
  const payload = await readJson(response);
  if (response.status === 403 && mutating && !retried) {
    await getCsrf(true);
    return request<T>(path, init, true);
  }
  if (!response.ok) throw problemError(payload, response.status);
  return payload as T;
}

export function get<T>(path: string, init?: Omit<ApiRequestInit, "method" | "body">) { return request<T>(path, { ...init, method: "GET" }); }
export function post<T>(path: string, body?: object | FormData) { return request<T>(path, { method: "POST", body }); }
export function patch<T>(path: string, body: object) { return request<T>(path, { method: "PATCH", body }); }
export function del<T = void>(path: string) { return request<T>(path, { method: "DELETE" }); }
export function upload<T>(path: string, body: FormData) { return request<T>(path, { method: "POST", body }); }
export async function download(path: string) {
  const response = await fetch(apiUrl(path), { credentials: "include", headers: { Accept: "*/*" } });
  if (!response.ok) throw problemError(await readJson(response), response.status);
  return response.blob();
}

export async function getCsrf(force = false): Promise<string | null> {
  if (csrfToken && !force) return csrfToken;
  const response = await fetch(apiUrl("/auth/csrf"), { credentials: "include", headers: { Accept: "application/json" } });
  const payload = await readJson(response);
  if (!response.ok) throw problemError(payload, response.status);
  const record = asRecord(payload);
  csrfToken = typeof payload === "string" ? payload : String(record.token ?? record.csrfToken ?? record.xsrfToken ?? response.headers.get("X-XSRF-TOKEN") ?? "") || null;
  return csrfToken;
}

export const api = {
  login: (credentials: LoginRequest) => request<AuthUser | { user: AuthUser }>("/auth/login", { method: "POST", body: credentials }),
  logout: () => request<void>("/auth/logout", { method: "POST" }).then(() => { csrfToken = null; }),
  me: () => request<AuthUser | { user: AuthUser }>("/auth/me"),
  config: async (): Promise<ApiConfig> => {
    const [dayStatuses, financeConcepts, financeCategories, noteCategories] = await Promise.all([
      request<unknown>("/config/day-statuses"), request<unknown>("/config/finance-concepts"), request<unknown>("/config/finance-categories"), request<unknown>("/config/note-categories"),
    ]);
    return { dayStatuses: optionList(dayStatuses), financeConcepts: optionList(financeConcepts), financeCategories: optionList(financeCategories), noteCategories: optionList(noteCategories) };
  },
  dashboard: () => request<unknown>("/dashboard").then(normalizeDashboard),
  days: (query: URLSearchParams) => request<unknown>(`/day-entries?${query}`).then((payload) => normalizePageItems(payload, normalizeDay)),
  createDay: (body: { date: string; statusCode: string; feeling: string; description: string }) => request<unknown>("/day-entries", { method: "POST", body }).then(normalizeDay),
  updateDay: (id: string, body: { date: string; statusCode: string; feeling: string; description: string }) => request<unknown>(`/day-entries/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeDay),
  deleteDay: (id: string) => request<void>(`/day-entries/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notes: (query: URLSearchParams) => request<unknown>(`/notes?${query}`).then((payload) => normalizePageItems(payload, normalizeNote)),
  createNote: (body: { title: string; body: string; categoryCode: string; date: string }) => request<unknown>("/notes", { method: "POST", body }).then(normalizeNote),
  updateNote: (id: string, body: { title: string; body: string; categoryCode: string; date: string }) => request<unknown>(`/notes/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeNote),
  deleteNote: (id: string) => request<void>(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  movements: (query: URLSearchParams) => request<unknown>(`/finance/movements?${query}`).then((payload) => normalizePageItems(payload, normalizeMovement)),
  createMovement: (body: { date: string; bucket: string; conceptCode: string; categoryCode: string; amountArs: number; note?: string }) => request<unknown>("/finance/movements", { method: "POST", body }).then(normalizeMovement),
  updateMovement: (id: string, body: { date: string; bucket: string; conceptCode: string; categoryCode: string; amountArs: number; note?: string }) => request<unknown>(`/finance/movements/${encodeURIComponent(id)}`, { method: "PATCH", body }).then(normalizeMovement),
  deleteMovement: (id: string) => request<void>(`/finance/movements/${encodeURIComponent(id)}`, { method: "DELETE" }),
  financeSummary: (query: URLSearchParams) => request<FinanceSummary>(`/finance/summary?${query}`),
  exchangeRate: () => request<ExchangeRate>("/finance/exchange-rate/usd"),
  folders: () => request<unknown>("/file-folders").then((payload) => normalizePage<FileFolder>(payload)),
  createFolder: (name: string) => request<FileFolder>("/file-folders", { method: "POST", body: { name } }),
  files: (query: URLSearchParams) => request<unknown>(`/files?${query}`).then((payload) => normalizePage<FileItem>(payload)),
  uploadFile: (file: File, folderId?: string) => { const body = new FormData(); body.append("file", file); if (folderId) body.append("folderId", folderId); return request<FileItem>("/files", { method: "POST", body }); },
  updateFile: (id: string, body: { name: string }) => request<FileItem>(`/files/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteFile: (id: string) => request<void>(`/files/${encodeURIComponent(id)}`, { method: "DELETE" }),
  downloadFile: (file: FileItem) => download(file.downloadUrl || `/files/${encodeURIComponent(file.id)}/download`),
};

export function unwrapUser(payload: AuthUser | { user: AuthUser }): AuthUser {
  return "user" in payload && payload.user ? payload.user : payload as AuthUser;
}
