export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ApiOption = {
  code: string;
  label: string;
  shortLabel?: string;
  emoji?: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
};

export type ApiConfig = {
  dayStatuses: ApiOption[];
  dayFeelings: ApiOption[];
  financeItems: ApiOption[];
  noteCategories: ApiOption[];
};

export type ConfigKind = "day-statuses" | "day-feelings" | "finance-items" | "note-categories";
export type SearchResult = { section: "day" | "finances" | "files" | "notes"; id: string; title: string; detail: string; date?: string };

export type AuthUser = {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
};

export type DayStatus = { code: string; label?: string; shortLabel?: string; emoji?: string };
export type DayAnalysisStatus = "PENDING" | "COMPLETED";
export type DayEntry = {
  id: string;
  date: string;
  analysisStatus: DayAnalysisStatus;
  statusCode: string;
  status?: DayStatus;
  feeling: string;
  description: string;
};
export type DaySuggestion = { analyzed: boolean; statusCode: string; feelingCodes: string[] };

export type NoteCategory = { code: string; label?: string };
export type Note = {
  id: string;
  title: string;
  body: string;
  categoryCode: string;
  category?: NoteCategory;
  date: string;
};

export type FinanceBucket = "INCOME" | "EXPENSE" | "INVESTED";
export type FinanceAmount = { ars: number | string; usd: number | string; exchangeRate: number | string };
export type FinanceMovement = {
  id: string;
  date: string;
  bucket: FinanceBucket | string;
  itemCode: string;
  item?: ApiOption;
  amountArs?: number | string;
  amount?: FinanceAmount;
  note?: string;
};
export type FinanceSummary = {
  from?: string;
  to?: string;
  income?: FinanceAmount | number | string;
  expense?: FinanceAmount | number | string;
  invested?: FinanceAmount | number | string;
  cash?: FinanceAmount | number | string;
  exchangeRate?: ExchangeRate;
};
export type FinanceDailySummary = { date: string; income: number | string; expense: number | string };
export type FinanceCategorySummary = { itemCode: string; total: number | string };
export type FinanceAnalytics = {
  from: string;
  to: string;
  daily: FinanceDailySummary[];
  incomeCategories: FinanceCategorySummary[];
  expenseCategories: FinanceCategorySummary[];
};

export type ExchangeRate = { currency: string; buy: number | string; sell: number | string; average: number | string; fetchedAt?: string; source?: string };

export type FileFolder = { id: string; name: string; fileCount?: number };
export type FileItem = {
  id: string;
  name: string;
  extension?: string;
  mimeType?: string;
  sizeBytes?: number | string;
  kind: string;
  folder?: FileFolder | null;
  downloadUrl?: string;
  uploadedAt?: string;
};

export type Dashboard = {
  counters?: Record<string, number | string>;
  financeSummary?: FinanceSummary;
  recentNotes?: Note[];
  recentFiles?: FileItem[];
  recentDays?: DayEntry[];
  recentMovements?: FinanceMovement[];
};

export type LoginRequest = { username: string; password: string };
