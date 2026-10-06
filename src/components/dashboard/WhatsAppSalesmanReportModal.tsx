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
  Users
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
  sendReportViaGateway,
  cleanIndonesianPhoneNumber
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
  const [activeTab, setActiveTab] = useState<'list' | 'preview' | 'gateway' | 'history'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACHIEVED' | 'UNDER' | 'NO_PHONE'>('ALL');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      cabang: 'Cabang Bone',
    });
  }, [selectedSalesman, currLabel, prevLabel, totalHariKerja, hariKerjaBerjalan]);

  // Handle single send via Direct WhatsApp
  const handleDirectSendOne = (salesman: SalesmanPerformanceItem) => {
    soundManager.playClick();
    const contact = contacts[salesman.salesmanId];
    const phone = contact?.phone || '';
    const reportText = generatePersonalizedSalesmanReport(salesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: 'Cabang Bone',
    });

    openDirectWhatsAppWeb(phone, reportText);

    const log: WhatsAppSendLog = {
      id: `log_${Date.now()}_${salesman.salesmanId}`,
      salesmanId: salesman.salesmanId,
      salesmanName: salesman.salesmanName,
      phone,
      status: 'SUCCESS',
      sentAt: new Date().toISOString(),
      method: 'DIRECT_WEB',
      notes: `Dibuka via WhatsApp Web/App (${currLabel})`,
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
      alert(`Nomor WhatsApp untuk ${salesman.salesmanName} belum diisi.`);
      return;
    }

    const reportText = generatePersonalizedSalesmanReport(salesman, {
      currLabel,
      prevLabel,
      totalHariKerja,
      hariKerjaBerjalan,
      cabang: 'Cabang Bone',
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
    }
    alert(res.message);
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
  };

  // Copy single report text
  const handleCopyReport = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      soundManager.playSuccess();
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
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
      alert('Pilih minimal 1 salesman untuk dikirimkan report.');
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
    setIsQueueRunning(true);
  };

  // Execution of Batch Queue step
  useEffect(() => {
    let timer: any;
    if (showQueueModal && isQueueRunning && queueIndex < queueList.length) {
      const currentSalesman = queueList[queueIndex];

      if (queueMode === 'GATEWAY') {
        // Gateway mode can run with small auto-delay or instant
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
      } else {
        // Direct WhatsApp Web Mode with countdown timer
        if (countdown > 0) {
          timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
          }, 1000);
        } else {
          // Open WhatsApp for current salesman
          setQueueStatusMap(prev => ({ ...prev, [currentSalesman.salesmanId]: 'SENDING' }));
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
            notes: `Batch Direct Web Queue (${queueIndex + 1}/${queueList.length})`,
          };
          appendSendLog(log);
          setSendLogs(prev => [log, ...prev]);

          setQueueStatusMap(prev => ({ ...prev, [currentSalesman.salesmanId]: 'SUCCESS' }));
          setQueueIndex(idx => idx + 1);
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
            <span>Pratinjau Pesan WA ({selectedSalesman?.salesmanName || 'Pilih Salesman'})</span>
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
            <span>Pengaturan WhatsApp Gateway API</span>
            {gatewayConfig.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
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

        {/* TAB 1: DAFTAR SALESMAN */}
        {activeTab === 'list' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
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

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  *Jika API Key dikosongkan, pengiriman gateway akan disimulasikan secara aman tanpa error.
                </span>

                <button
                  type="button"
                  onClick={() => {
                    saveGatewayConfig(gatewayConfig);
                    soundManager.playSuccess();
                    setGatewaySavedSuccess(true);
                    setTimeout(() => setGatewaySavedSuccess(false), 2500);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{gatewaySavedSuccess ? 'Tersimpan!' : 'Simpan Pengaturan Gateway'}</span>
                </button>
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
                <h3 className="font-bold text-slate-100 text-sm">
                  Pengiriman Otomatis ke Semua Salesman
                </h3>
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
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sedang Memproses:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {queueMode === 'DIRECT' ? `Countdown: ${countdown}s` : 'Mengirim via Gateway...'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {queueList[queueIndex].salesmanName} ({queueList[queueIndex].salesmanId})
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  No WA: {contacts[queueList[queueIndex].salesmanId]?.phone || 'Belum diisi'} &bull; Ach: {queueList[queueIndex].achievementRate?.toFixed(1) || 0}%
                </div>
                {queueMode === 'DIRECT' && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Tab WhatsApp Web akan terbuka otomatis. Pastikan pop-up browser tidak diblokir.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                <div className="font-bold text-sm text-emerald-200">Seluruh Pengiriman Telah Selesai!</div>
                <p className="text-[11px] text-emerald-400">
                  Sebanyak {queueList.length} report pencapaian salesman telah diproses ke WhatsApp.
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              {queueIndex < queueList.length ? (
                <>
                  <button
                    onClick={() => setIsQueueRunning(prev => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isQueueRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isQueueRunning ? 'Jeda Pengiriman' : 'Lanjutkan'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsQueueRunning(false);
                      setShowQueueModal(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Hentikan
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
