import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TargetRealisasiView } from './components/analytics/TargetRealisasiView';
import { MonthComparisonView } from './components/analytics/MonthComparisonView';
import { RoMonitoringView } from './components/analytics/RoMonitoringView';
import { DropOutletView } from './components/analytics/DropOutletView';
import { NewOutletView } from './components/analytics/NewOutletView';
import { SalesmanPerformanceView } from './components/analytics/SalesmanPerformanceView';
import { OpportunityView } from './components/analytics/OpportunityView';
import { SmartInsightView } from './components/analytics/SmartInsightView';
import { ActionMonitoringView } from './components/analytics/ActionMonitoringView';
import { ReportsView } from './components/analytics/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginPage } from './components/auth/LoginPage';
import { UserManagementView } from './components/users/UserManagementView';
import { fetchCurrentSession, logoutUser } from './services/authService';
import { Shield, ShieldAlert, Loader2 } from 'lucide-react';

import { DatabaseCenterView } from './components/database-center/DatabaseCenterView';
import { MappingHubView } from './components/database-center/MappingHubView';
import { ValidationCenterView } from './components/database-center/ValidationCenterView';
import { RawDataInspectorView } from './components/database-center/RawDataInspectorView';
import { SessionManagerView } from './components/database-center/SessionManagerView';
import { ReconciliationReportView } from './components/database-center/ReconciliationReportView';
import { VersionControlCenterView } from './components/database-center/VersionControlCenterView';

import { 
  AppSettings, 
  DatabaseCategory, 
  MasterOutletRecord, 
  RawUploadedFile, 
  TargetRecord, 
  TransactionRecord, 
  UploadSession, 
  UserProfile 
} from './types/database';
import { FilterOptions, GlobalFilterState, ActionStatus } from './types/analytics';
import { computeAnalytics } from './services/calculationEngine';
import { generateOpportunities } from './services/opportunityEngine';
import { generateSmartInsights } from './services/smartInsightEngine';
import { 
  generateActionItems, 
  computeActionMonitoringSummary, 
  loadPersistedActionState, 
  savePersistedActionState 
} from './services/actionMonitoringService';
import { parseExcelFile, parseSpecificSheet } from './services/excelParser';
import { autoDetectMappings } from './services/columnMapper';
import { 
  normalizeMasterOutletRecords, 
  normalizeTargetRecords, 
  normalizeTransactionRecords 
} from './services/normalizationEngine';
import { performReconciliation } from './services/reconciliationEngine';
import { validateUploadedFile } from './services/dataValidationEngine';
import { getSampleOfficeRawData } from './services/sampleDataGenerator';
import { 
  DEFAULT_SETTINGS, 
  INITIAL_USER, 
  loadSavedMappings, 
  loadSavedSettings, 
  loadSavedUser, 
  saveCategoryMapping, 
  saveSettings, 
  saveUser 
} from './services/storageService';

export default function App() {
  // Navigation for Phase 1, 2, and 3
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Authentication session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Configuration and RBAC state
  const [settings, setSettings] = useState<AppSettings>(() => loadSavedSettings());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadSavedUser());
  const [categoryMappings, setCategoryMappings] = useState<Record<DatabaseCategory, Record<string, string>>>(() => loadSavedMappings());

  // Check auth session on startup
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        const sessionRes = await fetchCurrentSession();
        if (isMounted) {
          if (sessionRes.isAuthenticated && sessionRes.user) {
            setUserProfile(sessionRes.user);
            saveUser(sessionRes.user);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    }
    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setIsAuthenticated(false);
    setCurrentTab('dashboard');
  }, []);

  // Global filters for Phase 3 analytics
  const [filters, setFilters] = useState<GlobalFilterState>({});

  // Upload Session
  const [session, setSession] = useState<UploadSession>({
    sessionId: `SES-202609-001`,
    createdAt: new Date().toISOString(),
    createdBy: userProfile.name,
    previousMonthPeriod: 'AGUSTUS 2026',
    currentMonthPeriod: 'SEPTEMBER 2026',
    previousFiles: [],
    currentFiles: [],
    targetFiles: [],
    masterFiles: [],
    totalPreviousRows: 0,
    totalCurrentRows: 0,
    totalTargetRows: 0,
    totalMasterRows: 0,
    status: 'ready',
  });

  // Raw file metadata for the 4 categories
  const [uploadedFiles, setUploadedFiles] = useState<Record<DatabaseCategory, RawUploadedFile[]>>({
    previous_month: [],
    current_month: [],
    target_salesman: [],
    master_cb: [],
  });

  // Raw file objects stored in memory for re-parsing sheets
  const rawFileObjectsRef = React.useRef<Map<string, File>>(new Map());

  // Normalized datasets
  const [prevTransactions, setPrevTransactions] = useState<TransactionRecord[]>([]);
  const [currTransactions, setCurrTransactions] = useState<TransactionRecord[]>([]);
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [masterOutlets, setMasterOutlets] = useState<MasterOutletRecord[]>([]);

  // Duplicate counts
  const [dupPrev, setDupPrev] = useState(0);
  const [dupCurr, setDupCurr] = useState(0);

  // Helper to load sample office files into memory
  const populateSampleFiles = useCallback(() => {
    const { prevRows, currRows, targetRows, masterRows, data } = getSampleOfficeRawData();

    setPrevTransactions(data.prevTransactions);
    setCurrTransactions(data.currTransactions);
    setTargets(data.targets);
    setMasterOutlets(data.masterOutlets);

    const prevHeaders = Object.keys(prevRows[0]);
    const currHeaders = Object.keys(currRows[0]);
    const trgHeaders = Object.keys(targetRows[0]);
    const mstHeaders = Object.keys(masterRows[0]);

    // Initial mappings (Realisasi: VALEU / GROSS)
    const prevMap = {
      outlet_id: 'KODE OUTLET',
      outlet_name: 'NAMA OUTLET',
      salesman_id: 'KODE SALESMAN',
      salesman_name: 'NAMA SALESMAN',
      transaction_date: 'TGL',
      sales_value: 'VALEU',
      invoice_id: 'NO FAKTUR',
      qty: 'QTY',
    };
    const currMap = {
      outlet_id: 'KODE OUTLET',
      outlet_name: 'NAMA OUTLET',
      salesman_id: 'KODE SALESMAN',
      salesman_name: 'NAMA SALESMAN',
      transaction_date: 'TGL',
      sales_value: 'VALEU',
      invoice_id: 'NO FAKTUR',
      qty: 'QTY',
    };
    const trgMap = {
      salesman_id: 'KD_SLS',
      salesman_name: 'NM_SLS',
      target_value: 'TARGET',
      area: 'AREA',
      salesman_status: 'STATUS SALESMAN',
    };
    const mstMap = {
      outlet_id: 'KODE OUTLET',
      outlet_name: 'NAMA OUTLET',
      channel: 'CHANNEL',
      fc: 'FC',
      rayon: 'RAYON',
      salesman_id: 'KD_SLS',
      salesman_name: 'NAMA_SLS',
      status_current_month: 'STATUS BLN INI',
    };

    setCategoryMappings({
      previous_month: prevMap,
      current_month: currMap,
      target_salesman: trgMap,
      master_cb: mstMap,
    });

    setUploadedFiles({
      previous_month: [
        {
          id: 'prev-file-bone',
          name: 'Dbase BONE - AGUSTUS.xlsx',
          fileName: 'Dbase BONE - AGUSTUS.xlsx',
          sheet: 'DBASE_AGUSTUS',
          rows: prevRows.length,
          columns: prevHeaders.length,
          period: 'AGUSTUS 2026',
          status: 'ready',
          size: 145280,
          uploadTime: '10:00:00',
          category: 'previous_month',
          sheetNames: ['DBASE_AGUSTUS'],
          selectedSheet: 'DBASE_AGUSTUS',
          rowCount: prevRows.length,
          headers: prevHeaders,
          sampleRows: prevRows,
          allRows: prevRows,
          mappingConfirmed: true,
          validation: validateUploadedFile('previous_month', prevHeaders, prevMap, prevRows),
        },
      ],
      current_month: [
        {
          id: 'curr-file-ksni',
          name: '_dBase KSNI BNE.xlsx',
          fileName: '_dBase KSNI BNE.xlsx',
          sheet: 'DATA_KSNI',
          rows: currRows.length,
          columns: currHeaders.length,
          period: 'SEPTEMBER 2026',
          status: 'ready',
          size: 161800,
          uploadTime: '10:05:00',
          category: 'current_month',
          sheetNames: ['DATA_KSNI'],
          selectedSheet: 'DATA_KSNI',
          rowCount: currRows.length,
          headers: currHeaders,
          sampleRows: currRows,
          allRows: currRows,
          mappingConfirmed: true,
          validation: validateUploadedFile('current_month', currHeaders, currMap, currRows),
        },
      ],
      target_salesman: [
        {
          id: 'target-file-sc',
          name: 'Target SC September 2026.xlsx',
          fileName: 'Target SC September 2026.xlsx',
          sheet: 'TARGET_SC',
          rows: targetRows.length,
          columns: trgHeaders.length,
          period: 'SEPTEMBER 2026',
          status: 'ready',
          size: 42100,
          uploadTime: '10:10:00',
          category: 'target_salesman',
          sheetNames: ['TARGET_SC'],
          selectedSheet: 'TARGET_SC',
          rowCount: targetRows.length,
          headers: trgHeaders,
          sampleRows: targetRows,
          allRows: targetRows,
          mappingConfirmed: true,
          validation: validateUploadedFile('target_salesman', trgHeaders, trgMap, targetRows),
        },
      ],
      master_cb: [
        {
          id: 'master-file-blk',
          name: '_Master_CB BLK.xlsx',
          fileName: '_Master_CB BLK.xlsx',
          sheet: 'MASTER_CB',
          rows: masterRows.length,
          columns: mstHeaders.length,
          period: 'SEPTEMBER 2026',
          status: 'ready',
          size: 128400,
          uploadTime: '10:15:00',
          category: 'master_cb',
          sheetNames: ['MASTER_CB'],
          selectedSheet: 'MASTER_CB',
          rowCount: masterRows.length,
          headers: mstHeaders,
          sampleRows: masterRows,
          allRows: masterRows,
          mappingConfirmed: true,
          validation: validateUploadedFile('master_cb', mstHeaders, mstMap, masterRows),
        },
      ],
    });
  }, []);

  // Initial load
  useEffect(() => {
    populateSampleFiles();
  }, [populateSampleFiles]);

  // Helper to re-normalize records for a category from its uploaded files
  const renormalizeCategory = useCallback((
    category: DatabaseCategory,
    filesList: RawUploadedFile[],
    mapping: Record<string, string>,
    currentSettings: AppSettings
  ) => {
    if (category === 'previous_month') {
      let allRecords: TransactionRecord[] = [];
      let totalDups = 0;
      filesList.forEach(file => {
        const rowsToProcess = file.allRows && file.allRows.length > 0 ? file.allRows : file.sampleRows;
        const { records, duplicateCount } = normalizeTransactionRecords(
          rowsToProcess,
          mapping,
          file.fileName || file.name,
          '2026-08',
          currentSettings.previousMonthLabel,
          currentSettings
        );
        allRecords = allRecords.concat(records);
        totalDups += duplicateCount;
      });
      setPrevTransactions(allRecords);
      setDupPrev(totalDups);
    } else if (category === 'current_month') {
      let allRecords: TransactionRecord[] = [];
      let totalDups = 0;
      filesList.forEach(file => {
        const rowsToProcess = file.allRows && file.allRows.length > 0 ? file.allRows : file.sampleRows;
        const { records, duplicateCount } = normalizeTransactionRecords(
          rowsToProcess,
          mapping,
          file.fileName || file.name,
          '2026-09',
          currentSettings.currentMonthLabel,
          currentSettings
        );
        allRecords = allRecords.concat(records);
        totalDups += duplicateCount;
      });
      setCurrTransactions(allRecords);
      setDupCurr(totalDups);
    } else if (category === 'target_salesman') {
      let allRecords: TargetRecord[] = [];
      filesList.forEach(file => {
        const rowsToProcess = file.allRows && file.allRows.length > 0 ? file.allRows : file.sampleRows;
        const records = normalizeTargetRecords(
          rowsToProcess,
          mapping,
          file.fileName || file.name,
          '2026-09',
          currentSettings.currentMonthLabel
        );
        allRecords = allRecords.concat(records);
      });
      setTargets(allRecords);
    } else if (category === 'master_cb') {
      const map = new Map<string, MasterOutletRecord>();
      filesList.forEach(file => {
        const rowsToProcess = file.allRows && file.allRows.length > 0 ? file.allRows : file.sampleRows;
        const records = normalizeMasterOutletRecords(
          rowsToProcess,
          mapping,
          file.fileName || file.name,
          currentSettings
        );
        records.forEach(m => map.set(m.outletId, m));
      });
      setMasterOutlets(Array.from(map.values()));
    }
  }, []);

  // File Upload Handler with multiple file support for 1, 2, and 4
  const handleFileUpload = useCallback(async (category: DatabaseCategory, fileList: FileList) => {
    const filesArray = Array.from(fileList);
    let updatedFilesForCat = [...(uploadedFiles[category] || [])];

    // If existing files in this category are default sample files, clear them when user uploads real files
    const isSampleData = updatedFilesForCat.some(f => 
      f.id === 'prev-file-bone' || 
      f.id === 'curr-file-ksni' || 
      f.id === 'target-file-sc' || 
      f.id === 'master-file-blk'
    );
    if (isSampleData) {
      updatedFilesForCat = [];
    }

    let resolvedMap = { ...(categoryMappings[category] || {}) };

    for (const file of filesArray) {
      try {
        rawFileObjectsRef.current.set(file.name, file);
        const parsed = await parseExcelFile(file, category);

        // Auto detect column mappings
        const autoMappings = autoDetectMappings(category, parsed.headers, resolvedMap);
        for (const [k, v] of Object.entries(autoMappings)) {
          if (v.selectedHeader) resolvedMap[k] = v.selectedHeader;
        }

        const allRows = parsed.allRows || parsed.sampleRows;

        // Validate file
        const validation = validateUploadedFile(category, parsed.headers, resolvedMap, parsed.sampleRows);

        const newUploadedFile: RawUploadedFile = {
          ...parsed,
          fileName: file.name,
          sheet: parsed.selectedSheet,
          rows: allRows.length,
          columns: parsed.headers.length,
          period: parsed.period || (category === 'previous_month' ? 'AGUSTUS 2026' : 'SEPTEMBER 2026'),
          status: validation.isValid ? 'ready' : 'needs_mapping',
          validation,
          mappingConfirmed: false,
          allRows,
        };

        if (category === 'target_salesman') {
          updatedFilesForCat = [newUploadedFile];
        } else {
          updatedFilesForCat = [newUploadedFile, ...updatedFilesForCat];
        }
      } catch (err: any) {
        console.error('Error processing file:', err);
        alert(`Gagal membaca file Excel ${file.name}: ${err.message}`);
      }
    }

    // Save updated uploaded files state
    setUploadedFiles(prev => ({
      ...prev,
      [category]: updatedFilesForCat,
    }));

    // Save mapping
    setCategoryMappings(prev => {
      const updated = { ...prev, [category]: resolvedMap };
      saveCategoryMapping(category, resolvedMap);
      return updated;
    });

    // Re-normalize all records for this category with all rows
    renormalizeCategory(category, updatedFilesForCat, resolvedMap, settings);
  }, [uploadedFiles, categoryMappings, settings, renormalizeCategory]);

  // Remove file
  const handleRemoveFile = useCallback((category: DatabaseCategory, fileId: string) => {
    const remainingFiles = (uploadedFiles[category] || []).filter(f => f.id !== fileId);
    setUploadedFiles(prev => ({
      ...prev,
      [category]: remainingFiles,
    }));

    const currentMap = categoryMappings[category] || {};
    renormalizeCategory(category, remainingFiles, currentMap, settings);
  }, [uploadedFiles, categoryMappings, settings, renormalizeCategory]);

  // Change sheet
  const handleSelectSheet = useCallback(async (category: DatabaseCategory, fileId: string, sheetName: string) => {
    const fileMeta = uploadedFiles[category]?.find(f => f.id === fileId);
    if (!fileMeta) return;
    const fileObj = rawFileObjectsRef.current.get(fileMeta.name);
    if (!fileObj) return;

    try {
      const parsedSheet = await parseSpecificSheet(fileObj, sheetName);
      const updatedFiles = (uploadedFiles[category] || []).map(f =>
        f.id === fileId
          ? {
              ...f,
              sheet: sheetName,
              selectedSheet: sheetName,
              headers: parsedSheet.headers,
              rows: parsedSheet.totalRows,
              rowCount: parsedSheet.totalRows,
              columns: parsedSheet.headers.length,
              sampleRows: parsedSheet.rows.slice(0, 100),
              allRows: parsedSheet.rows,
            }
          : f
      );

      setUploadedFiles(prev => ({
        ...prev,
        [category]: updatedFiles,
      }));

      const currentMap = categoryMappings[category] || {};
      renormalizeCategory(category, updatedFiles, currentMap, settings);
    } catch (e) {
      console.error('Failed to change sheet', e);
    }
  }, [uploadedFiles, categoryMappings, settings, renormalizeCategory]);

  // Confirm mapping
  const handleConfirmMapping = useCallback((category: DatabaseCategory, fileId: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [category]: prev[category].map(f =>
        f.id === fileId ? { ...f, mappingConfirmed: true, status: 'ready' } : f
      ),
    }));
  }, []);

  // Update mappings
  const handleUpdateMappings = useCallback((category: DatabaseCategory, newMappings: Record<string, string>) => {
    setCategoryMappings(prev => {
      const updated = { ...prev, [category]: newMappings };
      saveCategoryMapping(category, newMappings);
      return updated;
    });

    const currentFiles = uploadedFiles[category] || [];
    renormalizeCategory(category, currentFiles, newMappings, settings);
  }, [uploadedFiles, settings, renormalizeCategory]);

  // Reset all session data
  const handleClearSession = useCallback(() => {
    setPrevTransactions([]);
    setCurrTransactions([]);
    setTargets([]);
    setMasterOutlets([]);
    setUploadedFiles({
      previous_month: [],
      current_month: [],
      target_salesman: [],
      master_cb: [],
    });
  }, []);

  // Start new session
  const handleNewSession = useCallback(() => {
    const rand = Math.floor(100 + Math.random() * 900);
    setSession({
      sessionId: `SES-202609-${rand}`,
      createdAt: new Date().toISOString(),
      createdBy: userProfile.name,
      previousMonthPeriod: 'AGUSTUS 2026',
      currentMonthPeriod: 'SEPTEMBER 2026',
      previousFiles: [],
      currentFiles: [],
      targetFiles: [],
      masterFiles: [],
      totalPreviousRows: 0,
      totalCurrentRows: 0,
      totalTargetRows: 0,
      totalMasterRows: 0,
      status: 'ready',
    });
    handleClearSession();
  }, [userProfile.name, handleClearSession]);

  // Reconciliation check
  const reconciliation = useMemo(() => {
    return performReconciliation(
      prevTransactions,
      currTransactions,
      targets,
      masterOutlets,
      dupPrev,
      dupCurr
    );
  }, [prevTransactions, currTransactions, targets, masterOutlets, dupPrev, dupCurr]);

  // Filter options derived from actual database
  const filterOptions = useMemo<FilterOptions>(() => {
    const cabangs = new Set<string>();
    const depos = new Set<string>();
    const areas = new Set<string>();
    const rayons = new Set<string>();
    const channels = new Set<string>();
    const fcs = new Set<string>();
    const pmas = new Set<string>();
    const slsMap = new Map<string, string>();

    masterOutlets.forEach(m => {
      if (m.cabang) cabangs.add(m.cabang);
      if (m.depo) depos.add(m.depo);
      if (m.area) areas.add(m.area);
      if (m.rayon) rayons.add(m.rayon);
      if (m.channel) channels.add(m.channel);
      if (m.fc) fcs.add(m.fc);
      if (m.pma) pmas.add(m.pma);
      if (m.salesmanId) slsMap.set(m.salesmanId, m.salesmanName || m.salesmanId);
    });

    targets.forEach(t => {
      if (t.area) areas.add(t.area);
      if (t.pma) pmas.add(t.pma);
      if (t.salesmanId) slsMap.set(t.salesmanId, t.salesmanName);
    });

    currTransactions.forEach(t => {
      if (t.area) areas.add(t.area);
      if (t.pma) pmas.add(t.pma);
      if (t.salesmanId) slsMap.set(t.salesmanId, t.salesmanName);
    });

    prevTransactions.forEach(t => {
      if (t.area) areas.add(t.area);
      if (t.pma) pmas.add(t.pma);
      if (t.salesmanId) slsMap.set(t.salesmanId, t.salesmanName);
    });

    return {
      cabangs: Array.from(cabangs).filter(Boolean).sort(),
      depos: Array.from(depos).filter(Boolean).sort(),
      areas: Array.from(areas).filter(Boolean).sort(),
      rayons: Array.from(rayons).filter(Boolean).sort(),
      channels: Array.from(channels).filter(Boolean).sort(),
      fcs: Array.from(fcs).filter(Boolean).sort(),
      pmas: Array.from(pmas).filter(Boolean).sort(),
      salesmen: Array.from(slsMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [masterOutlets, targets, currTransactions, prevTransactions]);

  // Phase 3 Analytics Calculation via Calculation Engine
  const analytics = useMemo(() => {
    return computeAnalytics(
      prevTransactions,
      currTransactions,
      targets,
      masterOutlets,
      filters,
      userProfile
    );
  }, [prevTransactions, currTransactions, targets, masterOutlets, filters, userProfile]);

  // Opportunities via Opportunity Engine with configurable thresholds
  const opportunities = useMemo(() => {
    return generateOpportunities(analytics, masterOutlets, settings.thresholds);
  }, [analytics, masterOutlets, settings.thresholds]);

  // Smart Insights via Smart Insight Engine
  const smartInsights = useMemo(() => {
    return generateSmartInsights(analytics.kpis, analytics.salesmanPerformances, settings);
  }, [analytics, settings]);

  // Action Monitoring State (Persisted)
  const [actionStates, setActionStates] = useState<Record<string, { status: ActionStatus; notes: string[]; completedAt?: string }>>(() => loadPersistedActionState());

  const actions = useMemo(() => {
    return generateActionItems(smartInsights, opportunities, analytics, actionStates);
  }, [smartInsights, opportunities, analytics, actionStates]);

  const actionSummary = useMemo(() => {
    return computeActionMonitoringSummary(actions);
  }, [actions]);

  const handleUpdateActionStatus = useCallback((actionId: string, status: ActionStatus, note?: string) => {
    setActionStates(prev => {
      const existing = prev[actionId] || { status: 'OPEN', notes: [] };
      const updatedNotes = note ? [...existing.notes, note] : existing.notes;
      const updated = {
        ...prev,
        [actionId]: {
          status,
          notes: updatedNotes,
          completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
        },
      };
      savePersistedActionState(updated);
      return updated;
    });
  }, []);

  const handleAddActionNote = useCallback((actionId: string, note: string) => {
    setActionStates(prev => {
      const existing = prev[actionId] || { status: 'OPEN', notes: [] };
      const updated = {
        ...prev,
        [actionId]: {
          ...existing,
          notes: [...existing.notes, note],
        },
      };
      savePersistedActionState(updated);
      return updated;
    });
  }, []);

  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    renormalizeCategory('previous_month', uploadedFiles.previous_month || [], categoryMappings.previous_month || {}, newSettings);
    renormalizeCategory('current_month', uploadedFiles.current_month || [], categoryMappings.current_month || {}, newSettings);
    renormalizeCategory('master_cb', uploadedFiles.master_cb || [], categoryMappings.master_cb || {}, newSettings);
  }, [uploadedFiles, categoryMappings, renormalizeCategory]);

  const handleUpdateUser = useCallback((newUser: UserProfile) => {
    setUserProfile(newUser);
    saveUser(newUser);
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  // Total metrics for Phase 1 sidebar
  const allFilesList = useMemo(() => {
    const list: RawUploadedFile[] = [];
    Object.values(uploadedFiles).forEach(fs => list.push(...fs));
    return list;
  }, [uploadedFiles]);

  const totalFilesCount = allFilesList.length;
  const totalRowsCount = allFilesList.reduce((acc, f) => acc + f.rows, 0);
  const validationIssuesCount = allFilesList.filter(f => !f.validation.isValid).length;

  // Collapsible sidebar state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('control_tower_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('control_tower_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const isAnalyticsView = [
    'dashboard',
    'target_realisasi',
    'month_comparison',
    'ro_monitoring',
    'drop_outlets',
    'new_outlets',
    'salesman_performance',
    'opportunity',
    'smart_insight',
    'action_monitoring',
    'reports'
  ].includes(currentTab);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse shadow-lg shadow-cyan-950/50">
          <Shield className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>MEMERIKSA SESI KEAMANAN...</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 font-mono">
          SALES CONTROL CENTER — PT PINUS MERAH ABADI
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setUserProfile(user);
          saveUser(user);
          setIsAuthenticated(true);
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar dedicated to Phase 1, 2, 3, 4, and 5 */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        totalFiles={totalFilesCount}
        totalRows={totalRowsCount}
        validationIssuesCount={validationIssuesCount}
        matchedCount={reconciliation.matchedOutlets.length}
        kpis={analytics.kpis}
        pendingActionCount={actionSummary.priorityCount + actionSummary.openCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        userProfile={userProfile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          sessionId={session.sessionId}
          userProfile={userProfile}
          currentTab={currentTab}
          hasPrev={(uploadedFiles.previous_month || []).length > 0}
          hasCurr={(uploadedFiles.current_month || []).length > 0}
          hasTarget={(uploadedFiles.target_salesman || []).length > 0}
          hasMaster={(uploadedFiles.master_cb || []).length > 0}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onLoadSampleData={populateSampleFiles}
          onClearAllData={handleClearSession}
          onNavigateToSettings={() => setCurrentTab('settings')}
          onNavigateToUsers={() => setCurrentTab('users')}
          onLogout={handleLogout}
        />

        {/* Global Filter Bar for Analytics */}
        {isAnalyticsView && (
          <GlobalFilterBar
            filters={filters}
            options={filterOptions}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters({})}
          />
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div id="main-capture-area" className="max-w-7xl mx-auto pb-12 bg-slate-950">
            {/* PHASE 3 ANALYTICS VIEWS */}
            {currentTab === 'dashboard' && (
              <DashboardView
                calculation={analytics}
                opportunities={opportunities}
                settings={settings}
                onNavigate={(tab) => setCurrentTab(tab)}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'target_realisasi' && (
              <TargetRealisasiView
                calculation={analytics}
                rawTargets={targets}
                currTransactions={currTransactions}
                settings={settings}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'month_comparison' && (
              <MonthComparisonView
                calculation={analytics}
                settings={settings}
                prevTransactions={prevTransactions}
                currTransactions={currTransactions}
                masterOutlets={masterOutlets}
                filters={filters}
                onFilterChange={setFilters}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'ro_monitoring' && (
              <RoMonitoringView
                calculation={analytics}
                settings={settings}
                masterOutlets={masterOutlets}
                currTransactions={currTransactions}
                prevTransactions={prevTransactions}
                filters={filters}
                onFilterChange={setFilters}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'drop_outlets' && (
              <DropOutletView
                calculation={analytics}
                settings={settings}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'new_outlets' && (
              <NewOutletView
                calculation={analytics}
                settings={settings}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'salesman_performance' && (
              <SalesmanPerformanceView
                calculation={analytics}
                settings={settings}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'opportunity' && (
              <OpportunityView
                opportunities={opportunities}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
                onNavigateToActionMonitoring={() => setCurrentTab('action_monitoring')}
              />
            )}

            {currentTab === 'smart_insight' && (
              <SmartInsightView
                insights={smartInsights}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
                onNavigateToActionMonitoring={() => setCurrentTab('action_monitoring')}
              />
            )}

            {currentTab === 'action_monitoring' && (
              <ActionMonitoringView
                actions={actions}
                summary={actionSummary}
                onUpdateStatus={handleUpdateActionStatus}
                onAddNote={handleAddActionNote}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                calculation={analytics}
                opportunities={opportunities}
                settings={settings}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                userProfile={userProfile}
                availableSalesmen={filterOptions.salesmen}
                onSaveSettings={handleUpdateSettings}
                onUpdateUser={handleUpdateUser}
                onResetToDefaults={handleResetSettings}
              />
            )}

            {/* ADMIN USER MANAGEMENT VIEW (Requirement #8, #14) */}
            {currentTab === 'users' && (
              userProfile.role === 'ADMIN' ? (
                <UserManagementView
                  currentUser={userProfile}
                  onNavigateToDashboard={() => setCurrentTab('dashboard')}
                />
              ) : (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-rose-500/30 rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-100 font-mono tracking-wider">
                    403 ACCESS DENIED
                  </h2>
                  <p className="text-xs text-rose-300 font-medium max-w-md mt-2">
                    Hanya pengguna dengan peran ADMIN yang memiliki otoritas untuk mengakses menu Admin User Management.
                  </p>
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              )
            )}

            {/* PHASE 1 & 2 DATABASE VIEWS */}
            {currentTab === 'database' && (
              <DatabaseCenterView
                session={session}
                uploadedFiles={uploadedFiles}
                categoryMappings={categoryMappings}
                reconciliation={reconciliation}
                onFileUpload={handleFileUpload}
                onRemoveFile={handleRemoveFile}
                onUpdateMappings={handleUpdateMappings}
                onSelectSheet={handleSelectSheet}
                onConfirmMapping={handleConfirmMapping}
                onLoadSampleData={populateSampleFiles}
                onClearAllData={handleClearSession}
              />
            )}

            {currentTab === 'mapping' && (
              <MappingHubView
                uploadedFiles={uploadedFiles}
                categoryMappings={categoryMappings}
                onUpdateMappings={handleUpdateMappings}
                onConfirmMapping={handleConfirmMapping}
              />
            )}

            {currentTab === 'validation' && (
              <ValidationCenterView
                uploadedFiles={uploadedFiles}
                categoryMappings={categoryMappings}
                reconciliation={reconciliation}
                onNavigateToUpload={() => setCurrentTab('database')}
              />
            )}

            {currentTab === 'reconciliation' && (
              <ReconciliationReportView
                reconciliation={reconciliation}
                onNavigateToUpload={() => setCurrentTab('database')}
              />
            )}

            {currentTab === 'version' && (
              <VersionControlCenterView
                session={session}
                uploadedFiles={uploadedFiles}
                onTriggerConflictTest={() => {}}
                onClearCategory={(cat) => handleRemoveFile(cat, uploadedFiles[cat]?.[0]?.id || '')}
              />
            )}

            {currentTab === 'inspector' && (
              <RawDataInspectorView
                uploadedFiles={uploadedFiles}
                onSelectSheet={handleSelectSheet}
                onNavigateToUpload={() => setCurrentTab('database')}
                onLoadSampleData={populateSampleFiles}
              />
            )}

            {currentTab === 'session' && (
              <SessionManagerView
                session={session}
                uploadedFiles={uploadedFiles}
                userProfile={userProfile}
                onNewSession={handleNewSession}
                onClearSession={handleClearSession}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
