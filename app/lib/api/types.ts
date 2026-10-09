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
  id?: string;
  code: string;
  label: string;
  projectCode?: string;
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
  categories: ApiOption[];
  projects: ApiOption[];
};

export type ConfigKind = "day-statuses" | "day-feelings" | "finance-items" | "categories" | "projects";
export type SearchResult = { section: "day" | "finances" | "files" | "notes" | "tasks" | "calendar"; id: string; title: string; detail: string; date?: string };

export type RepositoryPipeline = {
  status: string;
  conclusion: string | null;
  workflowName: string | null;
  sha: string | null;
  runNumber: number | null;
  startedAt: string | null;
  updatedAt: string | null;
  url: string | null;
  available: boolean;
  stale: boolean;
};
export type RepositoryDeployment = {
  state: string;
  health: string | null;
  image: string | null;
  imageId: string | null;
  startedAt: string | null;
};
export type RepositoryComponent = {
  id: string;
  label: string;
  fullName: string;
  pipeline: RepositoryPipeline;
  deployment: RepositoryDeployment;
};
export type RepositoryProject = { id: string; name: string; components: RepositoryComponent[] };
export type RepositoryStatuses = {
  checkedAt: string;
  refreshAvailableAt: string;
  projects: RepositoryProject[];
};

export type DatabaseTarget = { id: "scalegrams" | "whatplan" | "notes"; label: string };
export type DatabaseColumn = { name: string; dataType: string; nullable: boolean; defaultValue: string | null; primaryKey: boolean; generated: boolean };
export type DatabaseTable = { name: string; primaryKey: string[]; columns: DatabaseColumn[] };
export type DatabaseTablePage = { table: string; columns: DatabaseColumn[]; rows: Array<Record<string, unknown>>; page: number; pageSize: number; totalElements: number; readOnly: boolean };
export type DatabaseStatementResult = { columns: string[]; rows: Array<Record<string, unknown>>; affectedRows: number | null; truncated: boolean };
export type DatabaseScriptResult = { results: DatabaseStatementResult[]; elapsedMilliseconds: number; committed: boolean };
export type RepositoryBackup = {
  id: string; label: string; running: boolean;
  lastAttempt: { startedAt: string; status: "in_progress" | "success" | "failed" | "unknown"; files: string[]; error?: string | null } | null;
  lastSuccess: { startedAt: string; files: string[] } | null;
};
export type RepositoryBackupStatus = { projects: RepositoryBackup[] };
export type AuthUser = {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
};

export type CentralAppCode = "notes" | "whatplan" | "scalegrams";
export type CentralAppAccess = { appCode: CentralAppCode; role: "USER" | "ADMIN"; enabled: boolean };
export type CentralAuthUserAdmin = {
  id: string;
  username: string;
  status: "ACTIVE" | "DISABLED" | "DELETED" | string;
  created: string;
  lastLogin: string | null;
  mustChangePassword: boolean;
  applications: CentralAppAccess[];
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
export type MarkdownKind = "NOTE" | "TASK";
export type MarkdownResponse = { markdown: string };
export type CalendarEvent = {
  id: string;
  date: string;
  description: string;
  category: ApiOption;
  projectCode: string;
};

export type NoteCategory = ApiOption;
export type Note = {
  id: string;
  title: string;
  body: string;
  categoryCode: string;
  category?: NoteCategory;
  date: string;
  projectCode: string;
};

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type Task = {
  id: string;
  title: string;
  detail?: string | null;
  status: TaskStatus;
  category: ApiOption;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  projectCode: string;
};

export type FinanceBucket = "INCOME" | "EXPENSE" | "INVESTED";
export type FinanceMovementType = FinanceBucket | "TRANSFER";
export type FinanceTransferRequest = { sourceAccountCode: string; destinationAccountCode: string; date: string; amountArs: number; note?: string; exchangeRate?: number };
export type FinanceAmount = { ars: number | string; usd: number | string; exchangeRate: number | string };
export type FinanceMovement = {
  id: string;
  date: string;
  bucket: FinanceBucket | string;
  accountCode: string;
  movementType?: FinanceMovementType;
  sourceAccountCode?: string | null;
  destinationAccountCode?: string | null;
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
  balanceUsd?: number | string | null;
  usdBalanceEstimated?: boolean;
};

// Crypto pairs are stored as user-entered symbols, so new USDT assets do not
// require a frontend release before they can be recorded.
export type CryptoAssetCode = string;
export type CryptoSale = {
  id: string;
  investmentId: string;
  date: string;
  quantity: number | string;
  proceedsUsd: number | string;
  unitPriceUsd: number | string;
  costBasisUsd: number | string;
  costBasisArs: number | string;
  realizedProfitUsd: number | string;
  exchangeRate: number | string;
  voided: boolean;
  note?: string;
  createdAt?: string;
};
export type CryptoInvestment = {
  id: string;
  date: string;
  assetCode: CryptoAssetCode | string;
  assetLabel: string;
  amount: FinanceAmount;
  unitPriceUsd?: number | string | null;
  quantity?: number | string | null;
  remainingQuantity?: number | string | null;
  remainingCostBasis: FinanceAmount;
  voided: boolean;
  sales: CryptoSale[];
  note?: string;
  createdAt?: string;
};
export type CryptoPosition = { assetCode: CryptoAssetCode | string; assetLabel: string; investedUsd: number | string; investedArs: number | string; quantity: number | string | null; purchases: number };
export type CryptoPerformance = {
  capitalUsd: number | string; purchaseTotalUsd: number | string; saleProceedsUsd: number | string;
  soldCostBasisUsd: number | string; realizedReturnPercent: number | string | null; salesCount: number;
  evolution: Array<{ date: string; proceedsUsd: number | string; costBasisUsd: number | string; realizedProfitUsd: number | string; cumulativeProfitUsd: number | string }>;
  assets: Array<{ assetCode: string; assetLabel: string; realizedProfitUsd: number | string; proceedsUsd: number | string; costBasisUsd: number | string }>;
};
export type CryptoSummary = {
  invested: FinanceAmount;
  available: FinanceAmount;
  realizedProfitUsd: number | string;
  legacyBalanceEstimated?: boolean;
  performance?: CryptoPerformance;
  positions: CryptoPosition[];
  investments: CryptoInvestment[];
  exchangeRate: ExchangeRate;
};

export type ExchangeRate = { currency: string; buy: number | string; sell: number | string; average: number | string; fetchedAt?: string; source?: string };

export type FileFolder = { id: string; name: string; fileCount?: number; projectCode: string };
export type FileItem = {
  id: string;
  projectCode: string;
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
  taskStats?: { pending: number; inProgress: number; completed: number; overdue: number };
  upcomingTasks?: Task[];
  recentActivity?: Array<{ section: "day" | "calendar" | "finances" | "files" | "notes" | "tasks"; id: string; title: string; detail: string; date?: string; updatedAt?: string }>;
  recentNotes?: Note[];
  recentFiles?: FileItem[];
  recentDays?: DayEntry[];
  recentMovements?: FinanceMovement[];
};

export type LoginRequest = { username: string; password: string };
