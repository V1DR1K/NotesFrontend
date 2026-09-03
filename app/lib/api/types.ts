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
  financeType?: FinanceItemType;
};

export type FinanceItemType = "INCOME" | "EXPENSE" | "TRANSFER";

export type ApiConfig = {
  dayStatuses: ApiOption[];
  dayFeelings: ApiOption[];
  financeItems: ApiOption[];
  noteCategories: ApiOption[];
  eventCategories: ApiOption[];
};

export type ConfigKind = "day-statuses" | "day-feelings" | "finance-items" | "note-categories" | "event-categories";
export type SearchResult = { section: "day" | "finances" | "files" | "notes"; id: string; title: string; detail: string; date?: string };

export type AuthUser = {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
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
export type CalendarEvent = {
  id: string;
  date: string;
  description: string;
  category: ApiOption;
};

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
  accountCode: string;
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
export type FinanceAccount = {
  code: string;
  label: string;
  type: "CASH" | "INVESTMENT" | "CRYPTO" | string;
  balanceArs: number | string;
  annualRatePercent: number | string;
  growthMode: "DAILY_TNA" | "MANUAL" | string;
  balanceAsOf: string;
};

export type CryptoAssetCode = "BTCUSDT" | "SOLUSDT" | "ETHUSDT" | "PEPEUSDT";
export type CryptoInvestment = {
  id: string;
  date: string;
  assetCode: CryptoAssetCode | string;
  assetLabel: string;
  amount: FinanceAmount;
  note?: string;
  createdAt?: string;
};
export type CryptoPosition = { assetCode: CryptoAssetCode | string; assetLabel: string; investedUsd: number | string; investedArs: number | string; purchases: number };
export type CryptoSummary = {
  invested: FinanceAmount;
  available: FinanceAmount;
  positions: CryptoPosition[];
  investments: CryptoInvestment[];
  exchangeRate: ExchangeRate;
};

export type ExchangeRate = { currency: string; buy: number | string; sell: number | string; average: number | string; fetchedAt?: string; source?: string };

export type FileFolder = { id: string; name: string; fileCount?: number };
export type FileItem = {
  id: string;
  name: string;
  description: string;
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
  dayStats?: { monthEntries: number; pendingAnalysis: number; today?: DayEntry | null };
  financeSnapshot?: { currentCash: FinanceAmount; currentInvested: FinanceAmount; monthIncome: FinanceAmount; monthExpense: FinanceAmount; exchangeRate?: ExchangeRate };
  storageUsage?: { usedBytes: number; quotaBytes: number };
  upcomingEvents?: CalendarEvent[];
  recentActivity?: Array<{ section: "day" | "calendar" | "finances" | "files" | "notes"; id: string; title: string; detail: string; date: string; updatedAt?: string }>;
  recentNotes?: Note[];
  recentFiles?: FileItem[];
  recentDays?: DayEntry[];
  recentMovements?: FinanceMovement[];
};

export type LoginRequest = { username: string; password: string };
