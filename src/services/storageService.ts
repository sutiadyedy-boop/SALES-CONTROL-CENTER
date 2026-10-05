import { 
  AppSettings, 
  CategoryMappingConfig, 
  DatabaseCategory, 
  MasterOutletRecord, 
  TargetRecord, 
  TransactionRecord, 
  UploadSession, 
  UserProfile,
  InsightThresholds
} from '../types/database';

export const DEFAULT_THRESHOLDS: InsightThresholds = {
  achievementWarning: 80, // % -> below this is ATTENTION, below critical is PRIORITY
  achievementCritical: 60, // %
  growthWarning: 0, // % -> negative growth is ATTENTION
  growthCritical: -10, // % -> drop > 10% is PRIORITY
  gapShortageWarning: 20000000, // IDR 20 Juta deficit
  gapShortageCritical: 50000000, // IDR 50 Juta deficit
  roWarning: 60, // %
  roCritical: 40, // %
  dropOutletCountWarning: 2, // outlets
  dropOutletCountCritical: 5, // outlets
  untransactedOutletWarning: 5, // outlets
  salesmanAchWarning: 75, // %
  salesmanAchCritical: 60, // %
};

export const DEFAULT_SETTINGS: AppSettings = {
  salesValueField: 'VALEU',
  outletActiveRule: {
    columnName: 'STATUS BLN INI',
    operator: 'equals',
    expectedValue: 'OK',
    caseInsensitive: true,
  },
  keyPriority: {
    salesmanKey: 'KD_SLS',
    outletKey: 'KODE_OUTLET',
    transactionKey: 'INVOICE_ONLY',
  },
  previousMonthLabel: 'SEPTEMBER 2026',
  currentMonthLabel: 'OKTOBER 2026',
  thresholds: DEFAULT_THRESHOLDS,
};

export const INITIAL_USER: UserProfile = {
  id: 'USR-ADMIN',
  username: 'edy.sutiady',
  name: 'Edy Sutiady',
  role: 'ADMIN',
  status: 'ACTIVE',
  cabang: 'BONE',
};

const STORAGE_KEYS = {
  SETTINGS: 'spm_settings_v1',
  MAPPINGS: 'spm_mappings_v1',
  SESSION: 'spm_session_v1',
  USER: 'spm_user_v1',
  AUTH_TOKEN: 'spm_auth_token_v1',
};

export function loadSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      let needsSave = false;
      const prevUpper = String(parsed.previousMonthLabel || '').toUpperCase();
      const currUpper = String(parsed.currentMonthLabel || '').toUpperCase();

      // Auto-migrate legacy hardcoded August vs September setting to current September vs October
      if (prevUpper.includes('AGUSTUS') || prevUpper.includes('AUGUST') || !parsed.previousMonthLabel) {
        parsed.previousMonthLabel = 'SEPTEMBER 2026';
        needsSave = true;
      }
      if (currUpper.includes('SEPTEMBER') && parsed.previousMonthLabel === 'SEPTEMBER 2026') {
        parsed.currentMonthLabel = 'OKTOBER 2026';
        needsSave = true;
      }
      if (!parsed.currentMonthLabel || currUpper.includes('AGUSTUS')) {
        parsed.currentMonthLabel = 'OKTOBER 2026';
        needsSave = true;
      }
      if (needsSave) {
        saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadSavedMappings(): Record<DatabaseCategory, Record<string, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    previous_month: {},
    current_month: {},
    target_salesman: {},
    master_cb: {},
  };
}

export function saveCategoryMapping(category: DatabaseCategory, mapping: Record<string, string>): void {
  try {
    const all = loadSavedMappings();
    all[category] = { ...all[category], ...mapping };
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save mappings', e);
  }
}

export function loadSavedUser(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_USER;
}

export function saveUser(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {}
}
