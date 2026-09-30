export type DatabaseCategory = 'previous_month' | 'current_month' | 'target_salesman' | 'master_cb';

export interface FileValidationResult {
  isValid: boolean;
  missingRequiredKeys: string[];
  unmappedCanonicalKeys: string[];
  warnings: string[];
  errors: string[];
}

export interface RawUploadedFile {
  id: string;
  name: string; // File name
  fileName: string; // Explicit file name
  sheet: string; // Currently active sheet
  rows: number; // Row count
  columns: number; // Column count
  period: string; // Period e.g. "AGUSTUS 2026"
  status: 'ready' | 'needs_mapping' | 'error' | 'pending';
  size: number;
  uploadTime: string;
  category: DatabaseCategory;
  sheetNames: string[];
  selectedSheet: string;
  rowCount: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  allRows?: Record<string, any>[];
  mappingConfirmed: boolean;
  validation: FileValidationResult;
  errorMessage?: string;
}


export interface TransactionRecord {
  id: string;
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  salesmanNik?: string;
  transactionDate: string;
  qty: number;
  salesValue: number;
  grossValue?: number;
  invoiceId: string;
  productCode?: string;
  productName?: string;
  sourceFile: string;
  period: string; // e.g. "2026-08" or "2026-09"
  periodLabel: string; // e.g. "AGUSTUS 2026"
  isDuplicate?: boolean;
  area?: string;
  pma?: string;
  rayon?: string;
  channel?: string;
  markNew?: string;
  fc?: string;
  cabang?: string;
  depo?: string;
}

export interface TargetRecord {
  id: string;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  pma?: string;
  cb?: string;
  salesmanStatus?: string;
  targetValue: number;
  skuTargets?: Record<string, number>;
  period: string; // e.g. "2026-09"
  periodLabel: string;
  sourceFile: string;
}

export interface MasterOutletRecord {
  outletId: string;
  outletName: string;
  channel?: string;
  fc?: string;
  rayon?: string;
  salesmanId: string;
  salesmanName?: string;
  salesmanNik?: string;
  statusCurrentMonth: string; // e.g. "OK"
  isActive: boolean; // based on active rule
  sc?: string;
  pma?: string;
  kodeSap?: string;
  noo?: string;
  typeOutlet?: string;
  typeOutlet2?: string;
  area?: string;
  cabang?: string;
  depo?: string;
  sourceFile: string;
}

export interface ColumnMappingDefinition {
  canonicalField: string;
  label: string;
  required: boolean;
  priorityAliases: string[];
  selectedHeader: string | null;
  confidence: number; // 0 to 100
  needsConfirmation: boolean;
}

export interface CategoryMappingConfig {
  category: DatabaseCategory;
  mappings: Record<string, string>; // canonicalField -> uploadedHeader
  confidenceScores: Record<string, number>;
}

export interface InsightThresholds {
  achievementWarning: number; // e.g. 80 (%) -> below this is ATTENTION, below critical is PRIORITY
  achievementCritical: number; // e.g. 60 (%) -> below this is PRIORITY
  growthWarning: number; // e.g. 0 (%) -> negative growth is ATTENTION
  growthCritical: number; // e.g. -10 (%) -> severe drop is PRIORITY
  gapShortageWarning: number; // e.g. 20000000 (IDR deficit)
  gapShortageCritical: number; // e.g. 50000000 (IDR deficit)
  roWarning: number; // e.g. 60 (%)
  roCritical: number; // e.g. 40 (%)
  dropOutletCountWarning: number; // e.g. 2
  dropOutletCountCritical: number; // e.g. 5
  untransactedOutletWarning: number; // e.g. 5
  salesmanAchWarning: number; // e.g. 75 (%)
  salesmanAchCritical: number; // e.g. 60 (%)
}

export interface AppSettings {
  salesValueField: 'VALEU' | 'GROSS' | 'VALUE' | 'VALUE NETT' | 'NETT EXCL PPN' | string;
  outletActiveRule: {
    columnName: string;
    operator: 'equals' | 'contains' | 'not_empty';
    expectedValue: string; // e.g. "OK"
    caseInsensitive: boolean;
  };
  keyPriority: {
    salesmanKey: 'KD_SLS' | 'NIK' | 'NAME';
    outletKey: 'KODE_OUTLET' | 'KD_OUTLET';
    transactionKey: 'INVOICE_ONLY' | 'INVOICE_OUTLET_ITEM' | 'DATE_OUTLET_ITEM_VALUE';
  };
  previousMonthLabel: string; // e.g. "AGUSTUS 2026"
  currentMonthLabel: string; // e.g. "SEPTEMBER 2026"
  thresholds?: InsightThresholds;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'SALESMAN';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DISABLED';

export interface UserProfile {
  id: string;
  username: string;
  name: string; // full_name
  role: UserRole;
  status: UserStatus;
  cabang?: string;
  area?: string;
  salesmanId?: string;
  avatar_url?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number;
  rememberMe: boolean;
}

export interface CreateUserData {
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  cabang?: string;
  area?: string;
  salesmanId?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
  cabang?: string;
  area?: string;
  salesmanId?: string;
}

export interface UploadSession {
  sessionId: string;
  createdAt: string;
  createdBy: string;
  previousMonthPeriod: string;
  currentMonthPeriod: string;
  previousFiles: string[];
  currentFiles: string[];
  targetFiles: string[];
  masterFiles: string[];
  totalPreviousRows: number;
  totalCurrentRows: number;
  totalTargetRows: number;
  totalMasterRows: number;
  status: 'ready' | 'processing' | 'needs_mapping' | 'error';
}

export interface ReconciliationStatus {
  totalMasterOutlets: number;
  activeMasterOutlets: number;
  inactiveMasterOutlets: number;
  matchedMasterOutletsWithTransactions: number;
  unmatchedMasterOutlets: string[]; // outlet IDs
  transactionsWithoutMasterOutlet: number;
  
  totalSalesmenInTransactions: number;
  matchedSalesmenWithTarget: number;
  unmatchedSalesmenWithoutTarget: string[]; // salesman IDs
  targetSalesmenWithoutTransactions: string[];

  duplicateTransactionsPrev: number;
  duplicateTransactionsCurr: number;
  missingDataWarnings: string[];
}
