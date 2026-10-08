import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Search, 
  Smartphone, 
  Settings2, 
  History, 
  Eye, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Filter, 
  Edit3, 
  Save, 
  FileSpreadsheet,
  Globe,
  Radio,
  ExternalLink,
  Users,
  HelpCircle,
  AlertTriangle,
  ShieldAlert,
  Key,
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import { SalesmanPerformanceItem, CalculationResult } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatRupiah, formatPercent } from '../../services/smartInsightEngine';
import { soundManager } from '../../services/soundManager';
import { 
  SalesmanContact, 
  WhatsAppGatewayConfig, 
  WhatsAppSendLog,
  loadSalesmanContacts, 
  saveSalesmanContacts, 
  loadGatewayConfig, 
  saveGatewayConfig, 
  loadSendLogs, 
  appendSendLog, 
  generatePersonalizedSalesmanReport, 
  openDirectWhatsAppWeb, 
  getWhatsAppDirectUrl,
  getWhatsAppWebDirectUrl,
  getWhatsAppAppProtocolUrl,
  sendReportViaGateway,
  cleanIndonesianPhoneNumber,
  isDummySamplePhone
} from '../../services/whatsappSalesmanService';

interface WhatsAppSalesmanReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: CalculationResult;
  settings: AppSettings;
  totalHariKerja: number;
  hariKerjaBerjalan: number;
}

export function WhatsAppSalesmanReportModal({
  isOpen,
  onClose,
  calculation,
  settings,
  totalHariKerja,
  hariKerjaBerjalan,
}: WhatsAppSalesmanReportModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'preview' | 'test' | 'gateway' | 'troubleshoot' | 'history'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACHIEVED' | 'UNDER' | 'NO_PHONE'>('ALL');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Popup blocker / Direct WhatsApp confirmation banner state
  const [popupBlockedNotice, setPopupBlockedNotice] = useState<{
    url: string;
    webUrl: string;
    appUrl: string;
    salesmanName: string;
    phone: string;
  } | null>(null);

  // Batch Auto-Sender Mode: 'MANUAL_STEP' (recommended so popups aren't blocked and user hits Enter in WA) or 'AUTO_TIMER'
  const [directBatchPace, setDirectBatchPace] = useState<'MANUAL_STEP' | 'AUTO_TIMER'>('MANUAL_STEP');

  // Self-Test Delivery State
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>(() => {
    try {
      return localStorage.getItem('scc_test_whatsapp_phone') || '';
    } catch {
      return '';
    }
  });
  const [testSending, setTestSending] = useState(false);
  const [testResultNotice, setTestResultNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Toast / Status banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Contacts state
  const { salesmanPerformances, kpis } = calculation;
  const [contacts, setContacts] = useState<Record<string, SalesmanContact>>({});
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [tempPhoneInput, setTempPhoneInput] = useState<string>('');

  // Selected salesmen for batch blast
  const [selectedIdsForBatch, setSelectedIdsForBatch] = useState<Set<string>>(new Set());

  // Gateway config state
  const [gatewayConfig, setGatewayConfig] = useState<WhatsAppGatewayConfig>(loadGatewayConfig());
  const [gatewaySavedSuccess, setGatewaySavedSuccess] = useState(false);

  // Send history logs state
  const [sendLogs, setSendLogs] = useState<WhatsAppSendLog[]>([]);

  // Batch Auto-Sender Queue State
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueList, setQueueList] = useState<SalesmanPerformanceItem[]>([]);
  const [queueMode, setQueueMode] = useState<'DIRECT' | 'GATEWAY'>('DIRECT');
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueDelaySeconds, setQueueDelaySeconds] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [queueStatusMap, setQueueStatusMap] = useState<Record<string, 'PENDING' | 'SENDING' | 'SUCCESS' | 'FAILED'>>({});

  // Labels
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const prevLabel = settings.previousMonthLabel || 'September 2026';

  // Load contacts and logs on open
  useEffect(() => {
    if (isOpen) {
      const loaded = loadSalesmanContacts(salesmanPerformances);
      setContacts(loaded);
      setGatewayConfig(loadGatewayConfig());
      setSendLogs(loadSendLogs());
      // Select all by default for convenience
      setSelectedIdsForBatch(new Set(salesmanPerformances.map(s => s.salesmanId)));
      if (salesmanPerformances.length > 0 && !selectedSalesmanId) {
        setSelectedSalesmanId(salesmanPerformances[0].salesmanId);
      }
    }
  }, [isOpen, salesmanPerformances]);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  // Filtered salesmen
  const filteredSalesmen = useMemo(() => {
    return salesmanPerformances.filter(s => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        s.salesmanName.toLowerCase().includes(q) || 
        s.salesmanId.toLowerCase().includes(q) ||
        (s.area && s.area.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Status filter
      const contact = contacts[s.salesmanId];
      const hasPhone = contact && contact.phone.trim().length >= 8;
      const isAchieved = (s.achievementRate ?? 0) >= 100;

      if (filterStatus === 'ACHIEVED') return isAchieved;
      if (filterStatus === 'UNDER') return !isAchieved;
      if (filterStatus === 'NO_PHONE') return !hasPhone;
      return true;
    });
  }, [salesmanPerformances, searchQuery, filterStatus, contacts]);

  const selectedSalesman = useMemo(() => {
    return salesmanPerformances.find(s => s.salesmanId === selectedSalesmanId) || salesmanPerformances[0];
  }, [salesmanPerformances, selectedSalesmanId]);

  // Generate report for active selected salesman
  const activeReportText = useMemo(() => {
    if (!selectedSalesman) return '';
    return generatePersonalizedSalesmanReport(selectedSalesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: settings.cabang || 'Cabang Bone',
    });
  }, [selectedSalesman, currLabel, prevLabel, totalHariKerja, hariKerjaBerjalan, settings.cabang]);

  // Handle single send via Direct WhatsApp
  const handleDirectSendOne = (salesman: SalesmanPerformanceItem, preferWebOnly: boolean = false) => {
    soundManager.playClick();
    const contact = contacts[salesman.salesmanId];
    const phone = contact?.phone || '';

    if (!phone || phone.trim().length < 8) {
      showToast(`Nomor WhatsApp untuk ${salesman.salesmanName} belum lengkap. Klik nomor untuk mengedit.`, 'warning');
      setEditingPhoneId(salesman.salesmanId);
      setTempPhoneInput(phone);
      return;
    }

    const reportText = generatePersonalizedSalesmanReport(salesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: settings.cabang || 'Cabang Bone',
    });

    openDirectWhatsAppWeb(phone, reportText, preferWebOnly);
    const directUrl = getWhatsAppDirectUrl(phone, reportText);
    const webUrl = getWhatsAppWebDirectUrl(phone, reportText);
    const appUrl = getWhatsAppAppProtocolUrl(phone, reportText);

    // Always display the direct action banner so if browser blocked new tab or user didn't see it, they have 1-click direct links & instruction to press Enter
    setPopupBlockedNotice({
      url: directUrl,
      webUrl,
      appUrl,
      salesmanName: salesman.salesmanName,
      phone,
    });

    showToast(
      `Chat WhatsApp untuk ${salesman.salesmanName} (${phone}) disiapkan! WAJIB klik tombol panah KIRIM (Enter) di dalam aplikasi WhatsApp agar pesan masuk ke HP salesman.`,
      'success'
    );

    const log: WhatsAppSendLog = {
      id: `log_${Date.now()}_${salesman.salesmanId}`,
      salesmanId: salesman.salesmanId,
      salesmanName: salesman.salesmanName,
      phone,
      status: 'SUCCESS',
      sentAt: new Date().toISOString(),
      method: 'DIRECT_WEB',
      notes: `Menunggu tombol Enter / Kirim ditekan di WhatsApp (${currLabel})`,
    };
    appendSendLog(log);
    setSendLogs(prev => [log, ...prev]);
  };

  // Handle single send via Gateway
  const handleGatewaySendOne = async (salesman: SalesmanPerformanceItem) => {
    soundManager.playClick();
    const contact = contacts[salesman.salesmanId];
    const phone = contact?.phone || '';
    if (!phone) {
      showToast(`Nomor WhatsApp untuk ${salesman.salesmanName} belum diisi.`, 'warning');
      return;
    }

    if (!gatewayConfig.apiKey && gatewayConfig.provider !== 'custom') {
      showToast(`Token API Gateway belum diisi! Silakan isi Token Fonnte/Wablas di tab Pengaturan Gateway, atau gunakan tombol "Kirim WA".`, 'warning');
      setActiveTab('gateway');
      return;
    }

    const reportText = generatePersonalizedSalesmanReport(salesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: settings.cabang || 'Cabang Bone',
    });

    const res = await sendReportViaGateway(gatewayConfig, phone, reportText);
    const log: WhatsAppSendLog = {
      id: `log_${Date.now()}_${salesman.salesmanId}`,
      salesmanId: salesman.salesmanId,
      salesmanName: salesman.salesmanName,
      phone,
      status: res.success ? 'SUCCESS' : 'FAILED',
      sentAt: new Date().toISOString(),
      method: 'GATEWAY_API',
      notes: res.message,
    };
    appendSendLog(log);
    setSendLogs(prev => [log, ...prev]);

    if (res.success) {
      soundManager.playSuccess();
      showToast(`Berhasil dikirim otomatis via Gateway ke ${salesman.salesmanName} (${phone})!`, 'success');
    } else {
      showToast(`Gagal mengirim via Gateway: ${res.message}`, 'warning');
    }
  };

  // Save phone number edit
  const handleSavePhone = (salesmanId: string) => {
    soundManager.playClick();
    const cleaned = cleanIndonesianPhoneNumber(tempPhoneInput);
    const updated = {
      ...contacts,
      [salesmanId]: {
        ...contacts[salesmanId],
        phone: cleaned,
      },
    };
    setContacts(updated);
    saveSalesmanContacts(updated);
    setEditingPhoneId(null);
    showToast(`Nomor telepon berhasil diperbarui (${cleaned})`, 'success');
  };

  // Copy single report text
  const handleCopyReport = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      soundManager.playSuccess();
      showToast('Format pesan berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Gagal menyalin teks ke clipboard.', 'warning');
    }
  };

  // Test send to own phone number
  const handleSendSelfTest = async (mode: 'WEB' | 'GATEWAY') => {
    soundManager.playClick();
    const cleaned = cleanIndonesianPhoneNumber(testPhoneNumber);
    if (!cleaned || cleaned.length < 9) {
      setTestResultNotice({
        success: false,
        message: 'Silakan masukkan nomor WhatsApp Anda yang valid terlebih dahulu (contoh: 081234567890).',
      });
      return;
    }

    try {
      localStorage.setItem('scc_test_whatsapp_phone', cleaned);
    } catch {}

    const sampleSalesman = selectedSalesman || salesmanPerformances[0];
    const reportText = generatePersonalizedSalesmanReport(sampleSalesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: settings.cabang || 'Cabang Bone',
    });

    if (mode === 'WEB') {
      openDirectWhatsAppWeb(cleaned, reportText);
      const url = getWhatsAppDirectUrl(cleaned, reportText);
      const webUrl = getWhatsAppWebDirectUrl(cleaned, reportText);
      const appUrl = getWhatsAppAppProtocolUrl(cleaned, reportText);
      setPopupBlockedNotice({
        url,
        webUrl,
        appUrl,
        salesmanName: 'Nomor Uji Coba Anda',
        phone: cleaned,
      });
      setTestResultNotice({
        success: true,
        message: `Chat WhatsApp ke nomor ${cleaned} telah disiapkan! PENTING: Setelah jendela WhatsApp terbuka, Anda WAJIB menekan tombol panah KIRIM (Enter) di dalam WhatsApp agar pesan benar-benar terkirim.`,
      });
    } else {
      // Gateway Test
      if (!gatewayConfig.apiKey && gatewayConfig.provider !== 'custom') {
        setTestResultNotice({
          success: false,
          message: `Token / API Key Gateway belum diisi! Silakan isi token di tab Pengaturan Gateway terlebih dahulu.`,
        });
        return;
      }

      setTestSending(true);
      setTestResultNotice(null);
      const res = await sendReportViaGateway(gatewayConfig, cleaned, reportText);
      setTestSending(false);

      setTestResultNotice({
        success: res.success,
        message: res.success 
          ? `Sukses! Pesan tes berhasil dikirim ke nomor WhatsApp Anda (${cleaned}) melalui Gateway.`
          : `Gagal mengirim tes via Gateway: ${res.message}`,
      });
    }
  };

  // Toggle selection for batch
  const handleToggleSelectAll = () => {
    if (selectedIdsForBatch.size === filteredSalesmen.length) {
      setSelectedIdsForBatch(new Set());
    } else {
      setSelectedIdsForBatch(new Set(filteredSalesmen.map(s => s.salesmanId)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIdsForBatch);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIdsForBatch(next);
  };

  // Start Batch Auto-Send Queue
  const handleStartBatchQueue = (mode: 'DIRECT' | 'GATEWAY') => {
    soundManager.playClick();
    const targetSalesmen = salesmanPerformances.filter(s => selectedIdsForBatch.has(s.salesmanId));
    if (targetSalesmen.length === 0) {
      showToast('Pilih minimal 1 salesman untuk dikirimkan report.', 'warning');
      return;
    }

    if (mode === 'GATEWAY' && (!gatewayConfig.apiKey && gatewayConfig.provider !== 'custom')) {
      showToast('Token API Gateway belum diisi! Silakan isi Token di Pengaturan Gateway atau gunakan Kirim via WA Web.', 'warning');
      setActiveTab('gateway');
      return;
    }

    setQueueList(targetSalesmen);
    setQueueIndex(0);
    setQueueMode(mode);
    setCountdown(queueDelaySeconds);
    const initialStatus: Record<string, 'PENDING' | 'SENDING' | 'SUCCESS' | 'FAILED'> = {};
    targetSalesmen.forEach(s => { initialStatus[s.salesmanId] = 'PENDING'; });
    setQueueStatusMap(initialStatus);
    setShowQueueModal(true);
    setIsQueueRunning(mode === 'GATEWAY' || directBatchPace === 'AUTO_TIMER');
  };

  // Manual trigger for current item in DIRECT step-by-step queue
  const handleTriggerCurrentQueueItemDirect = (advanceAfterOpen: boolean = true) => {
    if (queueIndex >= queueList.length) return;
    const currentSalesman = queueList[queueIndex];
    const contact = contacts[currentSalesman.salesmanId];
    const phone = contact?.phone || '';
    const report = generatePersonalizedSalesmanReport(currentSalesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: settings.cabang || 'Cabang Bone',
    });

    openDirectWhatsAppWeb(phone, report);

    const log: WhatsAppSendLog = {
      id: `log_batch_${Date.now()}_${currentSalesman.salesmanId}`,
      salesmanId: currentSalesman.salesmanId,
      salesmanName: currentSalesman.salesmanName,
      phone,
      status: 'SUCCESS',
      sentAt: new Date().toISOString(),
      method: 'DIRECT_WEB',
      notes: `Batch Direct WA (${queueIndex + 1}/${queueList.length}) - Pastikan tekan Enter di WA`,
    };
    appendSendLog(log);
    setSendLogs(prev => [log, ...prev]);

    setQueueStatusMap(prev => ({ ...prev, [currentSalesman.salesmanId]: 'SUCCESS' }));
    if (advanceAfterOpen) {
      setQueueIndex(idx => idx + 1);
    }
  };

  // Execution of Batch Queue step
  useEffect(() => {
    let timer: any;
    if (showQueueModal && isQueueRunning && queueIndex < queueList.length) {
      const currentSalesman = queueList[queueIndex];

      if (queueMode === 'GATEWAY') {
        // Gateway mode can run with small auto-delay
        timer = setTimeout(async () => {
          setQueueStatusMap(prev => ({ ...prev, [currentSalesman.salesmanId]: 'SENDING' }));
          const contact = contacts[currentSalesman.salesmanId];
          const phone = contact?.phone || '';
          
          if (!phone) {
            setQueueStatusMap(prev => ({ ...prev, [currentSalesman.salesmanId]: 'FAILED' }));
            setQueueIndex(idx => idx + 1);
            return;
          }

          const report = generatePersonalizedSalesmanReport(currentSalesman, {
            currLabel,
            prevLabel,
            totalHariKerja,
            hariKerjaBerjalan,
            cabang: settings.cabang || 'Cabang Bone',
          });

          const res = await sendReportViaGateway(gatewayConfig, phone, report);
          const log: WhatsAppSendLog = {
            id: `log_batch_${Date.now()}_${currentSalesman.salesmanId}`,
            salesmanId: currentSalesman.salesmanId,
            salesmanName: currentSalesman.salesmanName,
            phone,
            status: res.success ? 'SUCCESS' : 'FAILED',
            sentAt: new Date().toISOString(),
            method: 'GATEWAY_API',
            notes: `Batch Auto-Send: ${res.message}`,
          };
          appendSendLog(log);
          setSendLogs(prev => [log, ...prev]);

          setQueueStatusMap(prev => ({
            ...prev,
            [currentSalesman.salesmanId]: res.success ? 'SUCCESS' : 'FAILED',
          }));
          setQueueIndex(idx => idx + 1);
        }, 1200);
      } else if (directBatchPace === 'AUTO_TIMER') {
        // Direct WhatsApp Web Mode with countdown timer
        if (countdown > 0) {
          timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
          }, 1000);
        } else {
          handleTriggerCurrentQueueItemDirect(true);
          setCountdown(queueDelaySeconds);
        }
      }
    } else if (showQueueModal && queueIndex >= queueList.length && queueList.length > 0) {
      setIsQueueRunning(false);
      soundManager.playSuccess();
    }

    return () => clearTimeout(timer);
  }, [
    showQueueModal, 
    isQueueRunning, 
    queueIndex, 
    queueList, 
    queueMode, 
    directBatchPace,
    countdown, 
    queueDelaySeconds, 
    contacts, 
    gatewayConfig, 
    currLabel, 
    prevLabel, 
    totalHariKerja, 
    hariKerjaBerjalan, 
    settings.cabang
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Kirim Report Pencapaian via WhatsApp
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  Personalized per Salesman
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {currLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kirim otomatis report target, realisasi, achievement, dan rekomendasi harian ke masing-masing salesman.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartBatchQueue(gatewayConfig.enabled ? 'GATEWAY' : 'DIRECT')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              title="Kirim ke semua salesman terpilih sekaligus"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Semua ({selectedIdsForBatch.size})</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 sm:px-5 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'list'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Salesman ({salesmanPerformances.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Pesan WA</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'test'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>🧪 Tes Kirim ke HP Saya Sendiri</span>
          </button>

          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'troubleshoot'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>❓ Kenapa Belum Masuk? (Solusi)</span>
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'gateway'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Pengaturan Gateway API</span>
            {gatewayConfig.enabled && gatewayConfig.apiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Setup
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Pengiriman ({sendLogs.length})</span>
          </button>
        </div>

        {/* Global Toast / Popup Alert Banner */}
        {toastMessage && (
          <div className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : toastMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {popupBlockedNotice && (
          <div className="px-4 py-3 bg-emerald-950/60 border-b border-emerald-500/40 text-emerald-100 text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-200">
                  Konfirmasi Kirim ke {popupBlockedNotice.salesmanName} ({popupBlockedNotice.phone}):
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Penting: Setelah WhatsApp terbuka dan teks laporan muncul di kotak ketik, Anda <strong className="text-amber-300 underline">WAJIB menekan tombol Enter / Panah Kirim hijau di dalam WhatsApp</strong> agar pesan benar-benar terkirim ke HP Salesman. Jika tab belum terbuka otomatis, klik salah satu tombol di kanan:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={popupBlockedNotice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka via wa.me</span>
              </a>
              <a
                href={popupBlockedNotice.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Buka WA Web</span>
              </a>
              <a
                href={popupBlockedNotice.appUrl}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Buka App WA</span>
              </a>
              <button 
                onClick={() => setPopupBlockedNotice(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: DAFTAR SALESMAN */}
        {activeTab === 'list' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Critical Guide Notice Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    <span>Panduan Pengiriman WhatsApp & Kenapa Pesan Perlu Dikonfirmasi:</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Wajib Tahu
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    &bull; <strong>Metode WA Web (Gratis / Standar):</strong> Saat tab terbuka, Anda <strong>wajib menekan tombol panah Kirim (Enter)</strong> di layar WhatsApp agar pesan terkirim.<br />
                    &bull; <strong>Metode Gateway API (Auto Background):</strong> Bisa kirim 100% otomatis tanpa buka tab, tapi <strong>memerlukan Token API</strong> di tab Pengaturan Gateway.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('test')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tes ke HP Saya</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('troubleshoot')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kenapa Belum Masuk?</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama salesman, kode, atau area..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">Filter:</span>
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'ALL'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua ({salesmanPerformances.length})
                </button>
                <button
                  onClick={() => setFilterStatus('ACHIEVED')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'ACHIEVED'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🟢 Achieved &ge; 100%
                </button>
                <button
                  onClick={() => setFilterStatus('UNDER')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'UNDER'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔴 Under &lt; 100%
                </button>
                <button
                  onClick={() => setFilterStatus('NO_PHONE')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'NO_PHONE'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚠️ Belum Ada Nomor
                </button>
              </div>
            </div>

            {/* Quick Bulk Selection Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectedIdsForBatch.size === filteredSalesmen.length && filteredSalesmen.length > 0}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4"
                />
                <label htmlFor="selectAll" className="cursor-pointer font-medium text-slate-300">
                  Pilih Semua ({selectedIdsForBatch.size} dari {filteredSalesmen.length} terpilih)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Metode Pengiriman Cepat:</span>
                <button
                  onClick={() => handleStartBatchQueue('DIRECT')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Buka chat WhatsApp satu per satu berurutan"
                >
                  <Send className="w-3 h-3 text-emerald-400" />
                  <span>Kirim via WA Web / Desktop</span>
                </button>

                {gatewayConfig.enabled && (
                  <button
                    onClick={() => handleStartBatchQueue('GATEWAY')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="Kirim otomatis di background via API Gateway"
                  >
                    <Radio className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Blast via Gateway API</span>
                  </button>
                )}
              </div>
            </div>

            {/* Salesmen Cards / Table */}
            <div className="space-y-2.5">
              {filteredSalesmen.map(s => {
                const contact = contacts[s.salesmanId];
                const phone = contact?.phone || '';
                const isSelectedForBatch = selectedIdsForBatch.has(s.salesmanId);
                const isAchieved = (s.achievementRate ?? 0) >= 100;
                const isEditing = editingPhoneId === s.salesmanId;

                return (
                  <div
                    key={s.salesmanId}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isSelectedForBatch
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    {/* Checkbox & Basic Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelectedForBatch}
                        onChange={() => handleToggleSelectOne(s.salesmanId)}
                        className="mt-1 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer w-4 h-4 shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">
                            {s.salesmanName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {s.salesmanId}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Rank #{s.rank}
                          </span>
                          {isAchieved ? (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Achieved ({s.achievementRate?.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Under ({s.achievementRate ? `${s.achievementRate.toFixed(1)}%` : '0%'})
                            </span>
                          )}
                        </div>

                        {/* Metric Highlights */}
                        <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5 font-mono text-slate-400">
                          <span>Target: <strong className="text-slate-200">{formatRupiah(s.target)}</strong></span>
                          <span>&bull;</span>
                          <span>Realisasi: <strong className="text-cyan-300">{formatRupiah(s.actualCurrent)}</strong></span>
                          <span>&bull;</span>
                          <span>Gap: <strong className={s.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{s.gap >= 0 ? '+' : ''}{formatRupiah(s.gap)}</strong></span>
                          <span>&bull;</span>
                          <span>EC: <strong className="text-amber-300">{s.transactingOutlets || 0} Toko</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Phone Number Field & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-900">
                      {/* Phone edit inline */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/50 rounded-lg px-2 py-1">
                          <input
                            type="text"
                            value={tempPhoneInput}
                            onChange={(e) => setTempPhoneInput(e.target.value)}
                            placeholder="08123456789"
                            className="bg-transparent font-mono text-xs text-white focus:outline-none w-32"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePhone(s.salesmanId)}
                            className="p-1 rounded hover:bg-slate-800 text-emerald-400"
                            title="Simpan nomor"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingPhoneId(s.salesmanId);
                            setTempPhoneInput(phone);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer text-xs font-mono text-slate-300 group"
                          title="Klik untuk ubah nomor WhatsApp"
                        >
                          <Smartphone className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                          <span>{phone || 'Belum ada nomor'}</span>
                          <Edit3 className="w-3 h-3 text-slate-600 group-hover:text-slate-300 ml-1" />
                        </div>
                      )}

                      {/* Copy Report Button */}
                      <button
                        onClick={() => {
                          const text = generatePersonalizedSalesmanReport(s, {
                            currLabel,
                            prevLabel,
                            totalHariKerja,
                            hariKerjaBerjalan,
                            cabang: settings.cabang || 'Cabang Bone',
                          });
                          handleCopyReport(text, s.salesmanId);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-colors cursor-pointer"
                        title="Salin isi pesan laporan salesman ini"
                      >
                        {copiedId === s.salesmanId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Preview Button */}
                      <button
                        onClick={() => {
                          setSelectedSalesmanId(s.salesmanId);
                          setActiveTab('preview');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lihat pesan WhatsApp khusus salesman ini"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Pratinjau</span>
                      </button>

                      {/* Gateway Button if enabled and has key */}
                      {gatewayConfig.enabled && gatewayConfig.apiKey && (
                        <button
                          onClick={() => handleGatewaySendOne(s)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Kirim otomatis di background via Gateway API"
                        >
                          <Radio className="w-3 h-3 text-cyan-400" />
                          <span>Gateway</span>
                        </button>
                      )}

                      {/* Direct Send One */}
                      <button
                        onClick={() => handleDirectSendOne(s)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        title="Buka chat WhatsApp ke salesman ini"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PRATINJAU PESAN PERSONAL */}
        {activeTab === 'preview' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Pilih Salesman:</span>
                <select
                  value={selectedSalesmanId}
                  onChange={(e) => setSelectedSalesmanId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {salesmanPerformances.map(s => (
                    <option key={s.salesmanId} value={s.salesmanId}>
                      {s.salesmanName} ({s.salesmanId}) &bull; Ach {s.achievementRate?.toFixed(1) || 0}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">
                  No WA: <strong className="text-slate-300">{contacts[selectedSalesman?.salesmanId || '']?.phone || '-'}</strong>
                </span>

                <button
                  onClick={() => handleCopyReport(activeReportText, 'preview')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === 'preview' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'preview' ? 'Tersalin!' : 'Salin Pesan'}</span>
                </button>

                <button
                  onClick={() => selectedSalesman && handleDirectSendOne(selectedSalesman)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Sekarang ke WA</span>
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all max-h-[420px] overflow-y-auto shadow-inner">
              {activeReportText}
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Pesan ini otomatis memuat data pencapaian riil, target sisa harian, status toko beli (EC), serta 3 rekomendasi taktis harian untuk salesman terpilih.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: TES KIRIM KE NOMOR SAYA SENDIRI */}
        {activeTab === 'test' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 max-w-3xl">
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Uji Coba Kirim Report ke Nomor HP Anda Sendiri
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pastikan laporan dapat diterima dengan sempurna sebelum mengirimkan ke seluruh salesman.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nomor WhatsApp Anda / Nomor Penguji:
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={testPhoneNumber}
                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                        placeholder="Contoh: 081234567890 atau 6281234567890"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <select
                      value={selectedSalesmanId}
                      onChange={(e) => setSelectedSalesmanId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
                    >
                      {salesmanPerformances.map(s => (
                        <option key={s.salesmanId} value={s.salesmanId}>
                          Contoh Data: {s.salesmanName} ({s.achievementRate?.toFixed(1) || 0}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {testResultNotice && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResultNotice.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {testResultNotice.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                    <span>{testResultNotice.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSendSelfTest('WEB')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Uji Coba via WA Web (Buka Chat)</span>
                  </button>

                  <button
                    type="button"
                    disabled={testSending}
                    onClick={() => handleSendSelfTest('GATEWAY')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>{testSending ? 'Mengirim...' : 'Tes Kirim via Gateway API'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyReport(activeReportText, 'test_copy')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId === 'test_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Format Pesan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pratinjau Pesan yang akan diterima */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Pratinjau Pesan yang Akan Diterima di HP Anda:</span>
                <span className="text-[11px] text-slate-500 font-mono">Format Markdown Resmi WhatsApp</span>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all max-h-[300px] overflow-y-auto shadow-inner">
                {activeReportText}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PUSAT BANTUAN & TROUBLESHOOTING */}
        {activeTab === 'troubleshoot' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 max-w-4xl">
            <div className="bg-slate-950/70 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  Kenapa Pesan Sudah Dikirim tapi Belum Masuk ke WhatsApp Salesman?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Berikut adalah 4 penyebab umum serta solusi langsung untuk memastikan laporan terkirim dengan sukses:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kasus 1: Belum Menekan Tombol Kirim / Enter */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400">
                  <span className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center font-bold text-xs">1</span>
                  <h5 className="font-bold text-xs text-slate-100">Belum Tekan Tombol "Kirim" di WhatsApp Web</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pada metode <strong>Kirim via WA Web</strong>, dashboard menyiapkan chat dan teks laporan secara otomatis di WhatsApp.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-300 space-y-1">
                  <strong>✅ Solusi:</strong> Setelah tab WhatsApp terbuka dan teks laporan muncul di kotak chat, Anda <strong>wajib menekan tombol Enter atau ikon panah Kirim (Send) hijau</strong> di WhatsApp. WhatsApp tidak mengizinkan pesan terkirim sendiri tanpa konfirmasi tombol Enter pengguna.
                </div>
              </div>

              {/* Kasus 2: Pop-up Browser Terblokir */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs">2</span>
                  <h5 className="font-bold text-xs text-slate-100">Jendela Pop-up WhatsApp Diblokir Browser</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Browser (Chrome, Edge, Safari) sering memblokir pembukaan tab otomatis saat melakukan batch sending berurutan.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300 space-y-1">
                  <strong>✅ Solusi:</strong> Periksa bilah alamat browser di pojok kanan atas. Jika ada ikon pop-up merah, klik dan pilih <em>"Always allow pop-ups for this site"</em> (Selalu izinkan pop-up). Atau gunakan tombol manual "Klik di Sini untuk Buka WhatsApp" yang muncul.
                </div>
              </div>

              {/* Kasus 3: Gateway Belum Diisi Token / API Key */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-xs">3</span>
                  <h5 className="font-bold text-xs text-slate-100">Menggunakan Gateway API tapi Token Masih Kosong</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika memilih mode <strong>Auto-Blast Gateway</strong>, pesan tidak akan terkirim ke HP fisik jika Token/API Key penyedia (seperti Fonnte atau Wablas) belum dihubungkan.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-300 space-y-1">
                  <strong>✅ Solusi:</strong> Buka tab <strong>Pengaturan Gateway</strong>, masukkan Token API yang valid dari Fonnte/Wablas, lalu klik Simpan. Atau gunakan tombol <strong>Kirim WA (Web)</strong>.
                </div>
              </div>

              {/* Kasus 4: Nomor Telepon Belum Sesuai */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs">4</span>
                  <h5 className="font-bold text-xs text-slate-100">Nomor Telepon Masih Nomor Sampel / Belum Terdaftar</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Saat pertama kali dibuka, sistem mengisi nomor contoh (dummy). Jika nomor belum diubah ke nomor HP asli salesman, pesan tidak akan sampai ke mereka.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-indigo-300 space-y-1">
                  <strong>✅ Solusi:</strong> Di tab <strong>Daftar Salesman</strong>, klik nomor telepon atau ikon pensil di samping nama salesman, masukkan nomor WhatsApp aslinya (misal: 0812xxxxxx), lalu klik Simpan.
                </div>
              </div>
            </div>

            {/* Quick Action Button to Test */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-100">Ingin Menguji Coba Sekarang?</div>
                <p className="text-[11px] text-slate-400">
                  Kirimkan pesan uji coba ke nomor WhatsApp Anda sendiri untuk memastikan teks dan sistem berfungsi normal.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('test')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buka Halaman Uji Coba</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN GATEWAY API */}
        {activeTab === 'gateway' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 max-w-3xl">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Integrasi WhatsApp Gateway API (Auto-Blast Otomatis)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Kirim pesan langsung ke semua salesman sekaligus di latar belakang (background) tanpa perlu membuka tab WhatsApp satu per satu.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-slate-300">Aktifkan Gateway:</span>
                  <input
                    type="checkbox"
                    checked={gatewayConfig.enabled}
                    onChange={(e) => setGatewayConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900"
                  />
                </label>
              </div>

              {/* Provider Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Penyedia / Gateway Provider:
                  </label>
                  <select
                    value={gatewayConfig.provider}
                    onChange={(e) => {
                      const prov = e.target.value as any;
                      let defaultUrl = '';
                      if (prov === 'fonnte') defaultUrl = 'https://api.fonnte.com/send';
                      if (prov === 'wablas') defaultUrl = 'https://kudus.wablas.com/api/send-message';
                      if (prov === 'watzap') defaultUrl = 'https://api.watzap.id/v1/send_message';
                      setGatewayConfig(prev => ({ ...prev, provider: prov, apiUrl: defaultUrl }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="fonnte">Fonnte (Indonesia Gateway)</option>
                    <option value="wablas">Wablas (WhatsApp Business Gateway)</option>
                    <option value="watzap">Watzap ID</option>
                    <option value="custom">Custom Webhook / Internal PMA Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    API Key / Token Gateway:
                  </label>
                  <input
                    type="password"
                    value={gatewayConfig.apiKey}
                    onChange={(e) => setGatewayConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Masukkan Token / API Key..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  API Target URL:
                </label>
                <input
                  type="text"
                  value={gatewayConfig.apiUrl}
                  onChange={(e) => setGatewayConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder="https://api.fonnte.com/send"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {gatewayConfig.provider === 'watzap' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Number Key (Watzap Device Key):
                  </label>
                  <input
                    type="text"
                    value={gatewayConfig.senderNumber || ''}
                    onChange={(e) => setGatewayConfig(prev => ({ ...prev, senderNumber: e.target.value }))}
                    placeholder="Contoh: NK-XXXX-XXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-amber-300 font-medium">
                  *Wajib Diisi: Token API diperlukan agar pesan riil dapat terkirim ke HP salesman via server.
                </span>

                <button
                  type="button"
                  onClick={() => {
                    saveGatewayConfig(gatewayConfig);
                    soundManager.playSuccess();
                    setGatewaySavedSuccess(true);
                    showToast('Pengaturan WhatsApp Gateway berhasil disimpan!', 'success');
                    setTimeout(() => setGatewaySavedSuccess(false), 2500);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{gatewaySavedSuccess ? 'Tersimpan!' : 'Simpan Pengaturan Gateway'}</span>
                </button>
              </div>

              {/* Step-by-step Quick Guide */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2 mt-2">
                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Panduan Mudah Integrasi WhatsApp Gateway (Fonnte / Wablas):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li>Buka website <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-semibold">Fonnte.com</a> dan buat akun (tersedia free trial).</li>
                  <li>Di dashboard Fonnte, masuk ke menu <strong>Device</strong> dan <strong>Scan QR WhatsApp</strong> menggunakan nomor WA admin/kantor Anda.</li>
                  <li>Salin <strong>Token Device</strong> yang diberikan, tempelkan ke kolom <em>API Key / Token Gateway</em> di atas, lalu klik <strong>Simpan Pengaturan Gateway</strong>.</li>
                </ol>
                <div className="text-[11px] text-emerald-300 font-medium pt-1">
                  💡 <em>Setelah token disimpan, fitur "Auto-Blast via Gateway API" akan aktif dan dapat mengirim ratusan report sekaligus secara otomatis di latar belakang!</em>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT PENGIRIMAN */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span>Log Riwayat Pengiriman Report ({sendLogs.length} pengiriman tercatat)</span>
              {sendLogs.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Hapus seluruh riwayat pengiriman?')) {
                      localStorage.removeItem('scc_whatsapp_send_logs_v1');
                      setSendLogs([]);
                    }
                  }}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Bersihkan Riwayat
                </button>
              )}
            </div>

            {sendLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Belum ada riwayat pengiriman. Lakukan pengiriman report untuk melihat catatan di sini.
              </div>
            ) : (
              <div className="space-y-2">
                {sendLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{log.salesmanName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.salesmanId}</span>
                        <span className="font-mono text-[11px] text-cyan-300">({log.phone})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {log.notes || 'Pesan terkirim'} &bull; Metode: {log.method}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        {new Date(log.sentAt).toLocaleTimeString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Total Salesman: <strong className="text-white">{salesmanPerformances.length}</strong> &bull; Terpilih: <strong className="text-emerald-400">{selectedIdsForBatch.size}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={() => handleStartBatchQueue(gatewayConfig.enabled ? 'GATEWAY' : 'DIRECT')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke Semua Salesman Terpilih</span>
            </button>
          </div>
        </div>
      </div>

      {/* OVERLAY: BATCH AUTO-SENDER QUEUE WIZARD */}
      {showQueueModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Send className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Pengiriman Report ke Semua Salesman ({queueMode === 'GATEWAY' ? 'Gateway API Otomatis' : 'WhatsApp Web / Desktop'})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {queueMode === 'DIRECT'
                      ? 'Mode Anti-Blokir: Klik tombol Buka WA untuk tiap salesman, lalu tekan Enter di WhatsApp'
                      : 'Mengirim otomatis di background menggunakan API Gateway'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsQueueRunning(false);
                  setShowQueueModal(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher for Direct Web */}
            {queueMode === 'DIRECT' && queueIndex < queueList.length && (
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs">
                <span className="text-slate-400 px-2 font-medium">Metode Antrean WA Web:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDirectBatchPace('MANUAL_STEP');
                      setIsQueueRunning(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      directBatchPace === 'MANUAL_STEP'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1-per-1 Pasti Masuk (Direkomendasikan)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectBatchPace('AUTO_TIMER');
                      setCountdown(queueDelaySeconds);
                      setIsQueueRunning(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      directBatchPace === 'AUTO_TIMER'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Timer Otomatis ({queueDelaySeconds}d)
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Progres: <strong className="text-emerald-400">{queueIndex}</strong> dari <strong className="text-white">{queueList.length}</strong> Salesman
                </span>
                <span className="text-emerald-400 font-bold">
                  {Math.round((queueIndex / Math.max(1, queueList.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300"
                  style={{ width: `${(queueIndex / Math.max(1, queueList.length)) * 100}%` }}
                />
              </div>
            </div>

            {/* Currently Processing Info */}
            {queueIndex < queueList.length ? (
              (() => {
                const currentSalesman = queueList[queueIndex];
                const currentPhone = contacts[currentSalesman.salesmanId]?.phone || '';
                const currentReport = generatePersonalizedSalesmanReport(currentSalesman, {
                  currLabel,
                  prevLabel,
                  totalHariKerja,
                  hariKerjaBerjalan,
                  cabang: settings.cabang || 'Cabang Bone',
                });
                const waMeUrl = getWhatsAppDirectUrl(currentPhone, currentReport);
                const waWebUrl = getWhatsAppWebDirectUrl(currentPhone, currentReport);
                const waAppUrl = getWhatsAppAppProtocolUrl(currentPhone, currentReport);

                return (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">
                        Salesman Ke-{queueIndex + 1} dari {queueList.length}:
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {queueMode === 'GATEWAY'
                          ? 'Mengirim via Gateway...'
                          : directBatchPace === 'AUTO_TIMER'
                          ? `Membuka otomatis dalam: ${countdown}s`
                          : 'Siap Dikirim'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-100">
                          {currentSalesman.salesmanName} ({currentSalesman.salesmanId})
                        </div>
                        <div className="text-xs text-cyan-300 font-mono mt-0.5">
                          No WA Tujuan: <strong>{currentPhone || 'Belum diisi'}</strong> &bull; Ach: {currentSalesman.achievementRate?.toFixed(1) || 0}%
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                        Realisasi: {formatRupiah(currentSalesman.actualCurrent)}
                      </span>
                    </div>

                    {queueMode === 'DIRECT' && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                          💡 <strong>Agar Pesan Masuk ke HP Salesman:</strong> Klik tombol hijau di bawah untuk membuka chat WhatsApp <strong>{currentSalesman.salesmanName}</strong>, lalu <strong>tekan tombol Enter / Kirim di dalam WhatsApp</strong>, kemudian lanjut ke salesman berikutnya.
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={waMeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleTriggerCurrentQueueItemDirect(true)}
                            className="flex-1 min-w-[180px] py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                            <span>1. Buka WA & Lanjut Berikutnya</span>
                          </a>

                          <a
                            href={waWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleTriggerCurrentQueueItemDirect(true)}
                            className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Paksa buka di WhatsApp Web Browser"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Via WA Web</span>
                          </a>

                          <a
                            href={waAppUrl}
                            onClick={() => handleTriggerCurrentQueueItemDirect(true)}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Buka langsung aplikasi WhatsApp Desktop/HP"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>App WA</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                <div className="font-bold text-sm text-emerald-200">Seluruh Antrean Salesman Telah Diproses!</div>
                <p className="text-[11px] text-emerald-400">
                  Pastikan Anda telah menekan tombol Enter (Kirim) pada tab WhatsApp yang terbuka agar pesan masuk ke HP masing-masing salesman.
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              {queueIndex < queueList.length ? (
                <>
                  <div className="flex items-center gap-2">
                    {queueMode === 'DIRECT' && directBatchPace === 'MANUAL_STEP' ? (
                      <>
                        <button
                          disabled={queueIndex === 0}
                          onClick={() => setQueueIndex(idx => Math.max(0, idx - 1))}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          &larr; Sebelumnya
                        </button>
                        <button
                          onClick={() => setQueueIndex(idx => idx + 1)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Lewati Salesman Ini &rarr;
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsQueueRunning(prev => !prev)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        {isQueueRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{isQueueRunning ? 'Jeda Pengiriman' : 'Lanjutkan'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsQueueRunning(false);
                      setShowQueueModal(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Tutup Antrean
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
