import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Table, 
  Kanban, 
  Globe, 
  Settings, 
  Send, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  Lock, 
  Unlock, 
  Heart, 
  Scissors, 
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  MessageCircle,
  ChevronRight,
  Flame,
  Plus,
  Activity,
  Terminal,
  Search,
  Wallet,
  Building2,
  Eye,
  BadgeCheck,
  Filter
} from 'lucide-react';
import { DentalAppointment, BeautyAppointment, GreenApiConfig, SalesLead, SalesLeadStage } from '../types';

interface LiveDemosHubViewProps {
  dentalAppointments: DentalAppointment[];
  beautyAppointments: BeautyAppointment[];
  salesLeads: SalesLead[];
  onUpdateDentalStatus: (id: string, status: DentalAppointment['status']) => void;
  onUpdateBeautyStatus: (id: string, status: BeautyAppointment['status']) => void;
  onUpdateSalesLeadStatus: (id: string, status: SalesLead['status']) => void;
  onUpdateSalesLead: (id: string, updates: Partial<SalesLead>) => void;
  onAddDentalAppointment: (appointment: DentalAppointment) => void;
  onAddBeautyAppointment: (appointment: BeautyAppointment) => void;
  onAddSalesLead: (lead: SalesLead) => void;
  greenApiConfig: GreenApiConfig;
  salesGreenApiConfig: GreenApiConfig;
  onUpdateGreenApiConfig: (config: Partial<GreenApiConfig>) => void;
  onUpdateSalesGreenApiConfig: (config: Partial<GreenApiConfig>) => void;
  onOpenSimulator: (targetLine?: 'demos' | 'sales') => void;
}

export const LiveDemosHubView: React.FC<LiveDemosHubViewProps> = ({
  dentalAppointments,
  beautyAppointments,
  salesLeads,
  onUpdateDentalStatus,
  onUpdateBeautyStatus,
  onUpdateSalesLeadStatus,
  onUpdateSalesLead,
  onAddDentalAppointment,
  onAddBeautyAppointment,
  onAddSalesLead,
  greenApiConfig,
  salesGreenApiConfig,
  onUpdateGreenApiConfig,
  onUpdateSalesGreenApiConfig,
  onOpenSimulator
}) => {
  const [activeTab, setActiveTab] = useState<'myk_sales' | 'dental' | 'beauty' | 'bono_web' | 'green_api'>('myk_sales');
  const [selectedGreenInstance, setSelectedGreenInstance] = useState<'demos' | 'sales'>('sales');
  
  // Line 1 Green API Form state (Demos: +51 986 150 562)
  const [idInstance, setIdInstance] = useState(greenApiConfig.idInstance || '710722724819');
  const [apiTokenInstance, setApiTokenInstance] = useState(greenApiConfig.apiTokenInstance || '');
  const [apiUrl, setApiUrl] = useState(greenApiConfig.apiUrl || 'https://7107.api.greenapi.com');
  const [connectedPhone, setConnectedPhone] = useState(greenApiConfig.connectedPhone || '+51 986 150 562');

  // Line 2 Green API Form state (Ventas Digital MYK Lab: +51 929 327 654)
  const [salesIdInstance, setSalesIdInstance] = useState(salesGreenApiConfig.idInstance || '710722803080');
  const [salesApiTokenInstance, setSalesApiTokenInstance] = useState(salesGreenApiConfig.apiTokenInstance || '');
  const [salesApiUrl, setSalesApiUrl] = useState(salesGreenApiConfig.apiUrl || 'https://7107.api.greenapi.com');
  const [salesConnectedPhone, setSalesConnectedPhone] = useState(salesGreenApiConfig.connectedPhone || '+51 929 327 654');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);
  const [trafficLogs, setTrafficLogs] = useState<any[]>([]);
  const [salesTrafficLogs, setSalesTrafficLogs] = useState<any[]>([]);

  // Fetch live logs periodically for both instances
  const fetchLogs = useCallback(() => {
    fetch('/api/green-api/logs')
      .then(r => r.json())
      .then(data => {
        if (data.logs) setTrafficLogs(data.logs);
      })
      .catch(() => {});
    fetch('/api/green-api/sales/logs')
      .then(r => r.json())
      .then(data => {
        if (data.logs) setSalesTrafficLogs(data.logs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Sync sales config fields from server when updated
  useEffect(() => {
    if (salesGreenApiConfig.idInstance && !salesIdInstance) {
      setSalesIdInstance(salesGreenApiConfig.idInstance);
    }
    if (salesGreenApiConfig.apiUrl && salesApiUrl === 'https://api.greenapi.com') {
      setSalesApiUrl(salesGreenApiConfig.apiUrl);
    }
  }, [salesGreenApiConfig]);

  // Update apiUrl automatically when idInstance changes
  const handleIdInstanceChange = (val: string) => {
    if (selectedGreenInstance === 'sales') {
      setSalesIdInstance(val);
      const clean = val.trim();
      if (clean.length >= 4) {
        setSalesApiUrl(`https://${clean.slice(0, 4)}.api.greenapi.com`);
      }
    } else {
      setIdInstance(val);
      const clean = val.trim();
      if (clean.length >= 4) {
        setApiUrl(`https://${clean.slice(0, 4)}.api.greenapi.com`);
      }
    }
  };

  const activeIdInstance = selectedGreenInstance === 'sales' ? salesIdInstance : idInstance;
  const activeTokenInstance = selectedGreenInstance === 'sales' ? salesApiTokenInstance : apiTokenInstance;
  const activeApiUrl = selectedGreenInstance === 'sales' ? salesApiUrl : apiUrl;
  const activeConnectedPhone = selectedGreenInstance === 'sales' ? salesConnectedPhone : connectedPhone;
  const activeLogs = selectedGreenInstance === 'sales' ? salesTrafficLogs : trafficLogs;

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnoseResult(null);
    const baseEndpoint = selectedGreenInstance === 'sales' ? '/api/green-api/sales/diagnose' : '/api/green-api/diagnose';
    try {
      const res = await fetch(`${baseEndpoint}?idInstance=${encodeURIComponent(activeIdInstance.trim())}&apiTokenInstance=${encodeURIComponent(activeTokenInstance.trim())}&apiUrl=${encodeURIComponent(activeApiUrl.trim())}`);
      const data = await res.json();
      setDiagnoseResult(data);
    } catch (e: any) {
      setDiagnoseResult({ success: false, error: e.message });
    } finally {
      setDiagnosing(false);
    }
  };

  // Test WhatsApp message state
  const [testPhone, setTestPhone] = useState('+51 929 327 654');
  const [testMessage, setTestMessage] = useState('¡Hola! Prueba de conexión Green-API exitosa ✨');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Beauty CRM Protected Login state
  const [isBeautyLoggedIn, setIsBeautyLoggedIn] = useState(true);

  // Bono Web Template selector
  const [selectedWebPreview, setSelectedWebPreview] = useState<'dental' | 'beauty'>('dental');

  // New Dental Row quick modal
  const [showAddDentalModal, setShowAddDentalModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('+51 9');
  const [newTreatment, setNewTreatment] = useState('Limpieza Dental');
  const [newDateTime, setNewDateTime] = useState('Mañana - 4:00 PM');

  // New Sales Lead quick modal & CRM PRO states
  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('+51 9');
  const [newLeadService, setNewLeadService] = useState('Combo Asistente IA + Web Gratis');
  const [newLeadBusiness, setNewLeadBusiness] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('1490');
  const [newLeadPaymentMethod, setNewLeadPaymentMethod] = useState('Yape (929327654)');

  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'table'>('kanban');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStageFilter, setSalesStageFilter] = useState<string>('ALL');
  const [selectedSalesLeadId, setSelectedSalesLeadId] = useState<string | null>(null);
  const [showPaymentAccounts, setShowPaymentAccounts] = useState(false);
  const [copiedAccountKey, setCopiedAccountKey] = useState<string | null>(null);

  // Base URL for webhook
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://api.omniflow.io';
  const fullWebhookUrl = selectedGreenInstance === 'sales'
    ? `${currentHost}/api/green-api/sales/webhook`
    : `${currentHost}/api/green-api/webhook`;

  const [forcePolling, setForcePolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [queueModeLoading, setQueueModeLoading] = useState(false);
  const [queueModeResult, setQueueModeResult] = useState<string | null>(null);

  const [setWebhookLoading, setSetWebhookLoading] = useState(false);
  const [setWebhookResult, setSetWebhookResult] = useState<string | null>(null);
  const [isLocalPollingActive, setIsLocalPollingActive] = useState(true);
  const [isSalesPollingActive, setIsSalesPollingActive] = useState(true);

  const handleSetWebhookUrl = async () => {
    setSetWebhookLoading(true);
    setSetWebhookResult(null);
    const isSales = selectedGreenInstance === 'sales';
    const configEndpoint = isSales ? '/api/green-api/sales/config' : '/api/green-api/config';
    const endpoint = isSales ? '/api/green-api/sales/set-webhook-url' : '/api/green-api/set-webhook-url';
    try {
      await fetch(configEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim(),
          connectedPhone: activeConnectedPhone.trim(),
          pollingEnabled: true
        })
      }).catch(() => {});

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim(),
          webhookUrl: fullWebhookUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        if (isSales) {
          onUpdateSalesGreenApiConfig({
            idInstance: activeIdInstance.trim(),
            apiTokenInstance: activeTokenInstance.trim(),
            apiUrl: activeApiUrl.trim(),
            connectedPhone: activeConnectedPhone.trim(),
            status: 'connected',
            lastPing: new Date().toISOString()
          });
        } else {
          onUpdateGreenApiConfig({
            idInstance: activeIdInstance.trim(),
            apiTokenInstance: activeTokenInstance.trim(),
            apiUrl: activeApiUrl.trim(),
            connectedPhone: activeConnectedPhone.trim(),
            status: 'connected',
            lastPing: new Date().toISOString()
          });
        }
        setSetWebhookResult(`✅ ¡Webhook configurado en Green-API hacia ${fullWebhookUrl}!`);
        fetchLogs();
      } else {
        setSetWebhookResult(`⚠️ Error: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setSetWebhookResult(`❌ Error de conexión: ${err.message}`);
    } finally {
      setSetWebhookLoading(false);
    }
  };

  const handleTogglePolling = async () => {
    const isSales = selectedGreenInstance === 'sales';
    const endpoint = isSales ? '/api/green-api/sales/toggle-polling' : '/api/green-api/toggle-polling';
    const currentVal = isSales ? isSalesPollingActive : isLocalPollingActive;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentVal })
      });
      const data = await res.json();
      if (data.success) {
        if (isSales) {
          setIsSalesPollingActive(data.pollingEnabled);
        } else {
          setIsLocalPollingActive(data.pollingEnabled);
        }
        fetchLogs();
      }
    } catch (e) {}
  };

  const handleActivateQueueMode = async () => {
    setQueueModeLoading(true);
    setQueueModeResult(null);
    const isSales = selectedGreenInstance === 'sales';
    const configEndpoint = isSales ? '/api/green-api/sales/config' : '/api/green-api/config';
    const queueEndpoint = isSales ? '/api/green-api/sales/set-queue-mode' : '/api/green-api/set-queue-mode';
    try {
      await fetch(configEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim(),
          connectedPhone: activeConnectedPhone.trim(),
          pollingEnabled: true
        })
      });

      const res = await fetch(queueEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        if (isSales) {
          onUpdateSalesGreenApiConfig({
            idInstance: activeIdInstance.trim(),
            apiTokenInstance: activeTokenInstance.trim(),
            apiUrl: activeApiUrl.trim(),
            connectedPhone: activeConnectedPhone.trim(),
            status: 'connected',
            lastPing: new Date().toISOString()
          });
        } else {
          onUpdateGreenApiConfig({
            idInstance: activeIdInstance.trim(),
            apiTokenInstance: activeTokenInstance.trim(),
            apiUrl: activeApiUrl.trim(),
            connectedPhone: activeConnectedPhone.trim(),
            status: 'connected',
            lastPing: new Date().toISOString()
          });
        }
        setQueueModeResult('✅ ¡Modo Cola Directo Activado con éxito! El servidor ahora responde al instante sin bloqueos de webhook.');
        fetchLogs();
      } else {
        setQueueModeResult(`⚠️ Respuesta: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setQueueModeResult(`❌ Error de conexión: ${err.message}`);
    } finally {
      setQueueModeLoading(false);
    }
  };

  const handleForcePoll = async () => {
    setForcePolling(true);
    setPollResult(null);
    const isSales = selectedGreenInstance === 'sales';
    const configEndpoint = isSales ? '/api/green-api/sales/config' : '/api/green-api/config';
    const pollEndpoint = isSales ? '/api/green-api/sales/poll-now' : '/api/green-api/poll-now';
    try {
      await fetch(configEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim(),
          connectedPhone: activeConnectedPhone.trim(),
          pollingEnabled: true
        })
      }).catch(() => {});

      const res = await fetch(pollEndpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPollResult(`✅ ${data.message}`);
        fetchLogs();
      } else {
        setPollResult(`⚠️ Error: ${data.error || 'No se pudo consultar'}`);
      }
    } catch (e: any) {
      setPollResult(`❌ Error de conexión: ${e.message}`);
    } finally {
      setForcePolling(false);
    }
  };

  const handleSaveGreenApi = async () => {
    const isSales = selectedGreenInstance === 'sales';
    if (isSales) {
      onUpdateSalesGreenApiConfig({
        idInstance: salesIdInstance.trim(),
        apiTokenInstance: salesApiTokenInstance.trim(),
        apiUrl: salesApiUrl.trim(),
        connectedPhone: salesConnectedPhone.trim(),
        status: (salesIdInstance.trim() && salesApiTokenInstance.trim()) ? 'connected' : 'disconnected',
        lastPing: new Date().toISOString()
      });
    } else {
      onUpdateGreenApiConfig({
        idInstance: idInstance.trim(),
        apiTokenInstance: apiTokenInstance.trim(),
        apiUrl: apiUrl.trim(),
        connectedPhone: connectedPhone.trim(),
        status: 'connected',
        lastPing: new Date().toISOString()
      });
    }

    const endpoint = isSales ? '/api/green-api/sales/config' : '/api/green-api/config';
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: activeIdInstance.trim(),
          apiTokenInstance: activeTokenInstance.trim(),
          apiUrl: activeApiUrl.trim(),
          connectedPhone: activeConnectedPhone.trim(),
          pollingEnabled: true
        })
      });
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveSuccess(true);
    }
  };

  const handleSendTestWhatsApp = async () => {
    setTestSending(true);
    setTestResult(null);
    const endpoint = selectedGreenInstance === 'sales' ? '/api/green-api/sales/send-message' : '/api/green-api/send-message';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult('✅ ¡Mensaje enviado exitosamente a WhatsApp!');
      } else {
        setTestResult(`⚠️ Respuesta de Green-API: ${JSON.stringify(data.data || data.error)}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Error de conexión: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  const handleCreateDentalRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;
    const item: DentalAppointment = {
      id: `dent_${Date.now()}`,
      registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      patientName: newPatientName,
      whatsapp: newPatientPhone,
      treatment: newTreatment,
      requestedDateTime: newDateTime,
      status: '🟢 Nueva Cita',
      notes: 'Ingreso manual desde panel de demostración'
    };
    onAddDentalAppointment(item);
    setShowAddDentalModal(false);
    setNewPatientName('');
  };

  const handleCreateSalesLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    const item: SalesLead = {
      id: `lead_${Date.now()}`,
      registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      clientName: newLeadName.trim(),
      whatsapp: newLeadPhone.trim(),
      serviceInterest: newLeadService,
      businessType: newLeadBusiness.trim() || 'Por calificar',
      lastMessage: 'Registro comercial en CRM PRO',
      status: '🔥 Nuevo Lead',
      estimatedValue: Number(newLeadValue) || 1200,
      paymentMethod: newLeadPaymentMethod,
      paymentStatus: 'Pendiente',
      priority: 'Alta',
      notes: 'Registrado en CRM PRO Digital MYK Lab'
    };
    onAddSalesLead(item);
    setShowAddSalesModal(false);
    setNewLeadName('');
    setNewLeadBusiness('');
  };

  // CRM PRO Metrics & Filters (Digital MYK Lab)
  const crmStages: SalesLeadStage[] = [
    '🔥 Nuevo Lead',
    '💬 En Asesoría',
    '📄 Cotizado',
    '💳 Pago / Cierre',
    '✅ Cerrado'
  ];

  const filteredSalesLeads = salesLeads.filter(l => {
    const matchesStage = salesStageFilter === 'ALL' || l.status === salesStageFilter;
    const q = salesSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      l.clientName.toLowerCase().includes(q) ||
      l.whatsapp.toLowerCase().includes(q) ||
      l.serviceInterest.toLowerCase().includes(q) ||
      (l.businessType || '').toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  const totalPipelinePEN = salesLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);
  const closedOrPayingCount = salesLeads.filter(l => l.status === '✅ Cerrado' || l.status === '💳 Pago / Cierre').length;
  const quotedCount = salesLeads.filter(l => l.status === '📄 Cotizado').length;
  const activeSelectedLead = salesLeads.find(l => l.id === selectedSalesLeadId) || null;

  const copyAccountText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedAccountKey(key);
    setTimeout(() => setCopiedAccountKey(null), 1800);
  };

  const fullPaymentTemplate = `Cuentas Oficiales Digital MYK Lab\nTitular: Maycol Castañeda\n• Yape: 929327654\n• Plin: 921034349\n• Banco de la Nación: Cta 04765342509 | CCI 018-765-004765342509-81\n• Scotiabank Ahorro Soles: Cta 8330613655 | CCI 00972420833061365561`;

  // Calculations for Beauty Kanban
  const beautyTotalRevenue = beautyAppointments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingBeauty = beautyAppointments.filter(b => b.status === 'Por Confirmar');
  const inProgressBeauty = beautyAppointments.filter(b => b.status === 'En Atención');
  const completedBeauty = beautyAppointments.filter(b => b.status === 'Finalizado / Pagado');

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* 1. Header Banner: Multi-Demo Live Controller */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Línea Oficial WhatsApp Conectada
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                Suite Empresarial de Automatización & CRM
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex flex-wrap items-center gap-2">
              Central de Gestión y Recepción Inteligente
              <span className="text-emerald-400 font-mono text-lg">{connectedPhone}</span>
              <span className="text-slate-600 text-base">•</span>
              <span className="text-cyan-400 font-mono text-lg">{salesConnectedPhone}</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Plataforma empresarial multi-línea 24/7: opera tu línea comercial directa <strong className="text-cyan-300">Digital MYK Lab (929 327 654)</strong> con botones interactivos y CRM PRO, junto a tus módulos especializados (<strong className="text-emerald-300">986 150 562</strong>).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenSimulator(activeTab === 'myk_sales' ? 'sales' : 'demos')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>{activeTab === 'myk_sales' ? 'Chat Comercial con Botones' : 'Vista Previa de Chat'}</span>
            </button>
            <button
              onClick={() => setActiveTab('green_api')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Conexión WhatsApp (2 Líneas)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('myk_sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'myk_sales'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-900/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>💼 Digital MYK Lab — CRM PRO (929 327 654)</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">Botones + Cobros</span>
          </button>

          <button
            onClick={() => setActiveTab('dental')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'dental'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>🦷 Módulo Dental: Gestión de Citas & Sheets</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">Módulo 1</span>
          </button>

          <button
            onClick={() => setActiveTab('beauty')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'beauty'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>💅 Módulo Glow: Recepción IA Mía & CRM</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">Módulo 2</span>
          </button>

          <button
            onClick={() => setActiveTab('bono_web')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'bono_web'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Portal Web Integrado</span>
          </button>

          <button
            onClick={() => setActiveTab('green_api')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'green_api'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>⚙️ Conectividad WhatsApp (2 Instancias)</span>
          </button>
        </div>
      </div>

      {/* 1.5 TAB CONTENT: DIGITAL MYK LAB — CRM COMERCIAL PRO (+51 929 327 654) */}
      {activeTab === 'myk_sales' && (
        <div className="space-y-5">
          {/* Corporate Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                <img src="/digital_myk_logo.jpg" alt="Digital MYK Lab" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">CRM Comercial PRO — Digital MYK Lab</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold">
                    +51 929 327 654
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Botones Interactivos Activos 24/7
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Atención ejecutiva inmediata vía WhatsApp con <strong>botones interactivos reales</strong>, catálogo corporativo, cuentas oficiales de pago (Yape, Plin, Banco de la Nación y Scotiabank a nombre de <strong>Maycol Castañeda</strong>) y pipeline CRM en tiempo real.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowPaymentAccounts(prev => !prev)}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                  showPaymentAccounts
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Cuentas de Cobro</span>
              </button>
              <button
                onClick={() => onOpenSimulator('sales')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Abrir Chat con Botones</span>
              </button>
              <button
                onClick={() => {
                  setSelectedGreenInstance('sales');
                  setActiveTab('green_api');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Green-API</span>
              </button>
            </div>
          </div>

          {/* Official Payment Accounts Panel (Yape / Plin / Banco de la Nación / Scotiabank) */}
          {showPaymentAccounts && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/35 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Cuentas Oficiales de Pago — Titular: Maycol Castañeda</h4>
                    <p className="text-[11px] text-slate-400">
                      El asistente envía estas cuentas automáticamente en WhatsApp cuando el cliente pulsa "Métodos de pago" o "Iniciar Proyecto".
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyAccountText('all_accounts', fullPaymentTemplate)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedAccountKey === 'all_accounts' ? '¡Copiado todo!' : 'Copiar todas las cuentas'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-purple-300">Yape</span>
                    <button
                      onClick={() => copyAccountText('yape', '929327654')}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 cursor-pointer"
                    >
                      {copiedAccountKey === 'yape' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">929327654</p>
                  <p className="text-[10px] text-slate-400">Titular: Maycol Castañeda</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-cyan-300">Plin</span>
                    <button
                      onClick={() => copyAccountText('plin', '921034349')}
                      className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer"
                    >
                      {copiedAccountKey === 'plin' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">921034349</p>
                  <p className="text-[10px] text-slate-400">Titular: Maycol Castañeda</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-300">Banco de la Nación</span>
                    <button
                      onClick={() => copyAccountText('bn', '018-765-004765342509-81')}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 cursor-pointer"
                    >
                      {copiedAccountKey === 'bn' ? 'CCI Copiado' : 'Copiar CCI'}
                    </button>
                  </div>
                  <p className="font-mono text-[11px] font-bold text-white">Cta: 04765342509</p>
                  <p className="font-mono text-[11px] text-slate-300">CCI: 018-765-004765342509-81</p>
                  <p className="text-[10px] text-slate-400">Titular: Maycol Castañeda</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-red-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-red-300">Scotiabank (Ahorro Soles)</span>
                    <button
                      onClick={() => copyAccountText('scotia', '00972420833061365561')}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 cursor-pointer"
                    >
                      {copiedAccountKey === 'scotia' ? 'CCI Copiado' : 'Copiar CCI'}
                    </button>
                  </div>
                  <p className="font-mono text-[11px] font-bold text-white">Cta: 8330613655</p>
                  <p className="font-mono text-[11px] text-slate-300">CCI: 00972420833061365561</p>
                  <p className="text-[10px] text-slate-400">Titular: Maycol Castañeda</p>
                </div>
              </div>
            </div>
          )}

          {/* CRM PRO KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Clientes en CRM</span>
                <UserCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">{salesLeads.length}</p>
              <p className="text-[10px] text-cyan-400 mt-0.5">Captura automática 24/7</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>En Cotización</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">{quotedCount}</p>
              <p className="text-[10px] text-indigo-300 mt-0.5">Propuestas enviadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pagos / Cierres</span>
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{closedOrPayingCount}</p>
              <p className="text-[10px] text-emerald-300 mt-0.5">Yape, Plin o Transferencia</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Pipeline Estimado</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                S/ {totalPipelinePEN.toLocaleString('es-PE')}
              </p>
              <p className="text-[10px] text-emerald-300 mt-0.5">Proyección comercial activa</p>
            </div>
          </div>

          {/* CRM PRO Toolbar + View Switcher (Kanban / Tabla PRO) */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[210px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    placeholder="Buscar cliente, WhatsApp, servicio o rubro..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={salesStageFilter}
                    onChange={(e) => setSalesStageFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Todas las etapas</option>
                    {crmStages.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    onClick={() => setCrmViewMode('kanban')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      crmViewMode === 'kanban' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Pipeline Kanban</span>
                  </button>
                  <button
                    onClick={() => setCrmViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      crmViewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabla PRO</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowAddSalesModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Cliente</span>
                </button>
              </div>
            </div>

            {/* 5-Column Kanban Pipeline */}
            {crmViewMode === 'kanban' ? (
              <div className="p-4 overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 min-w-[980px]">
                  {crmStages.map(stage => {
                    const stageLeads = filteredSalesLeads.filter(l => l.status === stage);
                    const stageTotal = stageLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);
                    return (
                      <div key={stage} className="rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col min-h-[340px]">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-extrabold text-white">{stage}</div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              S/ {stageTotal.toLocaleString('es-PE')}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {stageLeads.length}
                          </span>
                        </div>

                        <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[480px]">
                          {stageLeads.length === 0 ? (
                            <div className="text-center py-8 text-[11px] text-slate-600">
                              Sin clientes en esta etapa
                            </div>
                          ) : (
                            stageLeads.map(lead => (
                              <div
                                key={lead.id}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h5 className="text-xs font-bold text-white leading-tight">{lead.clientName}</h5>
                                    <p className="text-[10px] font-mono text-cyan-400">{lead.whatsapp}</p>
                                  </div>
                                  {lead.estimatedValue ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold shrink-0">
                                      S/ {lead.estimatedValue}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[10px] font-semibold">
                                    {lead.serviceInterest}
                                  </span>
                                  {lead.paymentStatus && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                      lead.paymentStatus === 'Confirmado'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : lead.paymentStatus === 'Por Verificar'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                      {lead.paymentStatus}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                                  "{lead.lastMessage}"
                                </p>

                                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                                  <button
                                    onClick={() => setSelectedSalesLeadId(lead.id)}
                                    className="flex-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3 text-cyan-400" />
                                    <span>Ficha / Chat</span>
                                  </button>
                                  <a
                                    href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${lead.clientName}, te saluda Maycol Castañeda de Digital MYK Lab respecto a ${lead.serviceInterest}.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WA</span>
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Tabla PRO View */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold">
                      <th className="p-3 w-10 text-center border-r border-slate-800">#</th>
                      <th className="p-3 border-r border-slate-800">Último Contacto</th>
                      <th className="p-3 border-r border-slate-800">Cliente / Rubro</th>
                      <th className="p-3 border-r border-slate-800">WhatsApp</th>
                      <th className="p-3 border-r border-slate-800">Solución</th>
                      <th className="p-3 border-r border-slate-800">Valor / Pago</th>
                      <th className="p-3 border-r border-slate-800">Etapa Pipeline</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSalesLeads.map((lead, idx) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center text-slate-400 border-r border-slate-800">{idx + 1}</td>
                        <td className="p-3 text-slate-300 border-r border-slate-800 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {lead.registrationDate}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-white border-r border-slate-800">
                          <div>{lead.clientName}</div>
                          {lead.businessType && (
                            <div className="text-[10px] text-slate-400 font-normal">{lead.businessType}</div>
                          )}
                        </td>
                        <td className="p-3 text-cyan-400 font-mono border-r border-slate-800">{lead.whatsapp}</td>
                        <td className="p-3 border-r border-slate-800">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30">
                            {lead.serviceInterest}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-800 whitespace-nowrap">
                          <div className="font-mono font-bold text-emerald-400">S/ {lead.estimatedValue || 0}</div>
                          <div className="text-[10px] text-slate-400">
                            {lead.paymentMethod || 'Por definir'} • {lead.paymentStatus || 'Pendiente'}
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-800">
                          <select
                            value={lead.status}
                            onChange={(e) => onUpdateSalesLeadStatus(lead.id, e.target.value as any)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-950 border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
                          >
                            {crmStages.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedSalesLeadId(lead.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>Ver Ficha</span>
                            </button>
                            <a
                              href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${lead.clientName}, te saluda Maycol Castañeda de Digital MYK Lab respecto a ${lead.serviceInterest}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] inline-flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WA</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4 Corporate Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg">🤖</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Servicio 1</span>
              </div>
              <h4 className="text-xs font-extrabold text-white">Chatbots IA 24/7</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Atención inmediata en WhatsApp con botones interactivos, calificación de prospectos y agendamiento automático.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg">📱</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">Servicio 2</span>
              </div>
              <h4 className="text-xs font-extrabold text-white">Apps a la Medida</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sistemas CRM, control de inventario, pedidos, ventas y reportes ejecutivos en tiempo real para tu empresa.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-lg">🌐</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">Servicio 3</span>
              </div>
              <h4 className="text-xs font-extrabold text-white">Webs Profesionales PRO</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Arquitectura de alta velocidad, Certificado SSL, posicionamiento SEO para Google y conversión directa a WhatsApp.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">🎁</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Plan Integral</span>
              </div>
              <h4 className="text-xs font-extrabold text-amber-200">Asistente IA + Web GRATIS</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Al implementar tu Asistente IA 24/7 incluimos tu Sitio Web Profesional sin costo adicional, con 99.9% Uptime y soporte continuo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT: DEMO 1 - Odontología */}
      {activeTab === 'dental' && (
        <div className="space-y-5">
          {/* Operational Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Recepción Inmediata 24/7</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Atención instantánea a pacientes vía WhatsApp, reduciendo tiempos de espera y evitando fuga de prospectos.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Catálogo & Calificación</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Presentación clara de tratamientos, tarifas oficiales y captura estructurada de datos del paciente en segundos.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Sincronización en Tiempo Real</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cada cita confirmada por WhatsApp se registra automáticamente en el sistema central y en Google Sheets.
                </p>
              </div>
            </div>
          </div>

          {/* Google Sheets Live Mirror UI */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Sheet Toolbar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">SISTEMA CLÍNICO - REGISTRO DE PACIENTES</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                      Base de Datos Sincronizada
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sincronización bidireccional automática en la nube con Google Sheets y WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddDentalModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fila Manual</span>
                </button>
                <button
                  onClick={() => onOpenSimulator('demos')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Probar Chat Odontología</span>
                </button>
              </div>
            </div>

            {/* Google Sheets Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-3 w-12 text-center border-r border-slate-800 text-slate-400">#</th>
                    <th className="p-3 border-r border-slate-800">Fecha de Registro</th>
                    <th className="p-3 border-r border-slate-800">Nombre del Paciente</th>
                    <th className="p-3 border-r border-slate-800">WhatsApp</th>
                    <th className="p-3 border-r border-slate-800">Tratamiento de Interés</th>
                    <th className="p-3 border-r border-slate-800">Fecha y Hora Solicitada</th>
                    <th className="p-3 border-r border-slate-800">Estado (Validación de Datos)</th>
                    <th className="p-3">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {dentalAppointments.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-sans border-r border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="p-3 text-slate-300 border-r border-slate-800 flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {row.registrationDate}
                      </td>
                      <td className="p-3 font-bold text-white font-sans border-r border-slate-800">
                        {row.patientName}
                      </td>
                      <td className="p-3 text-emerald-400 border-r border-slate-800 font-mono">
                        {row.whatsapp}
                      </td>
                      <td className="p-3 font-sans border-r border-slate-800">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                          {row.treatment}
                        </span>
                      </td>
                      <td className="p-3 text-amber-300 font-sans border-r border-slate-800">
                        {row.requestedDateTime}
                      </td>
                      <td className="p-3 border-r border-slate-800 font-sans">
                        <select
                          value={row.status}
                          onChange={(e) => onUpdateDentalStatus(row.id, e.target.value as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                            row.status === '🟢 Nueva Cita'
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                              : row.status === '🟡 Confirmado'
                              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                              : 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                          }`}
                        >
                          <option value="🟢 Nueva Cita">🟢 Nueva Cita</option>
                          <option value="🟡 Confirmado">🟡 Confirmado</option>
                          <option value="🔵 Atendido">🔵 Atendido</option>
                        </select>
                      </td>
                      <td className="p-3 font-sans">
                        <a
                          href={`https://wa.me/${row.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${row.patientName}, te saludamos de Clínica Sonrisas VIP respecto a tu cita para ${row.treatment}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Abrir WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {dentalAppointments.length} Pacientes registrados en la hoja de demostración
              </span>
              <span className="text-[11px] font-sans">
                💡 Al recibir un WhatsApp real en <strong>+51 986 150 562</strong> con la opción 1, se añade aquí en vivo.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: DEMO 2 - Centro de Belleza Glow */}
      {activeTab === 'beauty' && (
        <div className="space-y-5">
          {/* Plan Pro Strategy Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Glow Centro de Belleza & Spa</h3>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold">
                    IA GENERATIVA 24/7 + CRM
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Recepcionista Inteligente 'Mía' (IA Gemini) que atiende en lenguaje natural + CRM Visual Kanban con roles para administración y especialistas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Citas Agendadas Hoy</p>
                <p className="text-sm font-extrabold text-emerald-400 font-mono">
                  S/ {beautyTotalRevenue} PEN ({beautyAppointments.length} servicios)
                </p>
              </div>
              <button
                onClick={() => setIsBeautyLoggedIn(!isBeautyLoggedIn)}
                className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs font-semibold ${
                  isBeautyLoggedIn
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {isBeautyLoggedIn ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isBeautyLoggedIn ? 'Sesión Iniciada' : 'Simular Login'}</span>
              </button>
            </div>
          </div>

          {/* Visual Kanban Board (Glide / Softr Style CRM) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1: Por Confirmar */}
            <div className="rounded-2xl bg-slate-900 border border-red-500/20 p-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">🔴 Por Confirmar</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold font-mono">
                  {pendingBeauty.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pt-3 space-y-3">
                {pendingBeauty.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                    <p>No hay citas pendientes por confirmar.</p>
                    <p className="text-[10px] mt-1 text-slate-400">Escribe al WhatsApp para que la IA Mía agende en vivo.</p>
                  </div>
                ) : (
                  pendingBeauty.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20 text-[10px] font-bold">
                          {item.service}
                        </span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs">
                          S/ {item.amount}
                        </span>
                      </div>

                      <h5 className="font-bold text-white text-sm mt-2">{item.clientName}</h5>
                      
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Cita: <strong className="text-slate-200">{item.dateTimeRequested}</strong></span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 italic">
                        "{item.notes}"
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <a
                          href={`https://wa.me/${item.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${item.clientName}! ✨ Te saludamos de Glow Centro de Belleza para confirmar tu cita de ${item.service} el ${item.dateTimeRequested} (Monto: S/ ${item.amount}).`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Contactar WhatsApp</span>
                        </a>
                        <button
                          onClick={() => onUpdateBeautyStatus(item.id, 'En Atención')}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white text-[11px] font-semibold"
                          title="Pasar a En Atención"
                        >
                          ➔
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: En Atención */}
            <div className="rounded-2xl bg-slate-900 border border-amber-500/20 p-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">🟡 En Atención (En Local)</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold font-mono">
                  {inProgressBeauty.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pt-3 space-y-3">
                {inProgressBeauty.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                    <p>No hay clientas en cabina en este momento.</p>
                  </div>
                ) : (
                  inProgressBeauty.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                          {item.service}
                        </span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs">
                          S/ {item.amount}
                        </span>
                      </div>

                      <h5 className="font-bold text-white text-sm mt-2">{item.clientName}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Estilista: {item.stylist || 'Gabriela'}</p>

                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onUpdateBeautyStatus(item.id, 'Finalizado / Pagado')}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalizar y Cobrar S/ {item.amount}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Finalizado / Pagado */}
            <div className="rounded-2xl bg-slate-900 border border-emerald-500/20 p-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">🟢 Finalizado / Pagado</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold font-mono">
                  {completedBeauty.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pt-3 space-y-3">
                {completedBeauty.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 opacity-90"
                  >
                    <div className="flex items-start justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {item.service}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        S/ {item.amount} (Pagado)
                      </span>
                    </div>
                    <h5 className="font-bold text-white text-sm mt-2">{item.clientName}</h5>
                    <p className="text-[10px] text-slate-400 mt-1">{item.date} • Atendido con éxito</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: PORTAL WEB INTEGRADO */}
      {activeTab === 'bono_web' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                  Presencia Digital & Captación
                </span>
                <h3 className="text-base font-extrabold text-white">🌐 Portal Web & Catálogo Digital Integrado</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Sitio web institucional y catálogo interactivo diseñado para captar visitantes y dirigirlos con un clic directo al canal oficial de WhatsApp y al sistema de reservas.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedWebPreview('dental')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedWebPreview === 'dental'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🦷 Web Odontología (1 Página)
              </button>
              <button
                onClick={() => setSelectedWebPreview('beauty')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedWebPreview === 'beauty'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💅 Web Centro de Belleza (5 Pestañas)
              </button>
            </div>
          </div>

          {/* Interactive Web Mockup Preview */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Browser Frame Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <div className="ml-3 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedWebPreview === 'dental' ? 'https://sonrisasvip-clinica.pe' : 'https://glow-belleza.pe'}</span>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-bold">100% Responsiva (Celular & Laptop)</span>
            </div>

            {/* Template Body */}
            {selectedWebPreview === 'dental' ? (
              <div className="p-8 bg-slate-950 text-slate-100 space-y-8">
                {/* Dental Hero */}
                <div className="max-w-4xl mx-auto text-center space-y-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                    Clínica Odontológica Especializada
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">
                    Tu Mejor Sonrisa Comienza con los Mejores Especialistas
                  </h1>
                  <p className="text-slate-400 text-sm max-w-xl mx-auto">
                    Tecnología dental avanzada, ortodoncia invisible y blanqueamiento láser con atención personalizada en Lima.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={`https://wa.me/51986150562?text=Hola! Deseo agendar una cita odontológica en Sonrisas VIP`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Agendar Cita por WhatsApp (+51 986 150 562)</span>
                    </a>
                  </div>
                </div>

                {/* Services Grid */}
                <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold">
                      🦷
                    </div>
                    <h4 className="font-bold text-sm text-white">Limpieza Dental Ultrasónica</h4>
                    <p className="text-xs text-slate-400">Eliminación completa de sarro y pulido profesional.</p>
                    <p className="text-sm font-extrabold text-emerald-400 font-mono pt-1">S/ 50 PEN</p>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center font-bold">
                      ✨
                    </div>
                    <h4 className="font-bold text-sm text-white">Evaluación Ortodoncia</h4>
                    <p className="text-xs text-slate-400">Brackets metálicos, estéticos y alineadores invisibles.</p>
                    <p className="text-sm font-extrabold text-indigo-400 font-mono pt-1">S/ 150 PEN</p>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold">
                      💎
                    </div>
                    <h4 className="font-bold text-sm text-white">Blanqueamiento Láser</h4>
                    <p className="text-xs text-slate-400">Aclara hasta 4 tonos en una sola sesión indolora.</p>
                    <p className="text-sm font-extrabold text-amber-400 font-mono pt-1">S/ 120 PEN</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-950 text-slate-100 space-y-8">
                {/* Beauty Navbar */}
                <div className="max-w-4xl mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💅</span>
                    <span className="font-extrabold text-lg tracking-tight text-white">GLOW BELLEZA & SPA</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-300">
                    <span className="text-pink-400 cursor-pointer">Inicio</span>
                    <span className="hover:text-white cursor-pointer">Servicios</span>
                    <span className="hover:text-white cursor-pointer">Especialistas</span>
                    <span className="hover:text-white cursor-pointer">Galería</span>
                    <span className="hover:text-white cursor-pointer">Contacto</span>
                  </div>
                </div>

                {/* Beauty Hero */}
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/30 text-[11px] font-bold">
                      ✨ El Santuario de Tu Belleza en Lima
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight font-['Outfit']">
                      Realza tu brillo único con nuestras especialistas
                    </h2>
                    <p className="text-xs text-slate-400">
                      Manicure en acrílico, spa de pies, alisados con queratina orgánica y tratamientos faciales con reserva inmediata.
                    </p>
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/51986150562?text=Hola! Quiero agendar con Mía en Glow Centro de Belleza`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Chatear con Mía Recepción IA (+51 986 150 562)</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Menú de Tarifas</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span>💅 Manicure Acrílica</span>
                        <span className="font-bold text-pink-400">S/ 60</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span>🌸 Pedicure Spa Relajante</span>
                        <span className="font-bold text-pink-400">S/ 45</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span>💇‍♀️ Corte + Cepillado</span>
                        <span className="font-bold text-pink-400">S/ 50</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>✨ Alisado Queratina Orgánica</span>
                        <span className="font-bold text-pink-400">Desde S/ 150</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: GREEN-API CONFIGURATION (MULTI-INSTANCE) */}
      {activeTab === 'green_api' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Instance Switcher Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">Gestor Multi-Instancia Green-API (Mismo Proyecto, 2 Números)</h3>
                <p className="text-xs text-slate-400">
                  No necesitas crear otro proyecto: vincula una segunda instancia gratuita/pro en <strong className="text-slate-200">console.green-api.com</strong> para tu número <strong className="text-cyan-400">+51 929 327 654</strong> y administra ambos aquí.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedGreenInstance('sales');
                  setDiagnoseResult(null);
                  setQueueModeResult(null);
                  setPollResult(null);
                  setSetWebhookResult(null);
                  setTestPhone('+51 929 327 654');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedGreenInstance === 'sales'
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <span>🚀 Línea 2: Digital MYK Lab (Ventas PRO)</span>
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mt-0.5">{salesConnectedPhone}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Responde de inmediato ante cualquier palabra</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  salesIdInstance && salesApiTokenInstance
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                }`}>
                  {salesIdInstance && salesApiTokenInstance ? 'Configurada' : 'Vincular QR'}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedGreenInstance('demos');
                  setDiagnoseResult(null);
                  setQueueModeResult(null);
                  setPollResult(null);
                  setSetWebhookResult(null);
                  setTestPhone('+51 986 150 562');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedGreenInstance === 'demos'
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <span>📱 Línea 1: Central de Demos</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 mt-0.5">{connectedPhone}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Menú 1 (Odontología) y 2 (Belleza Glow)</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                  Activa
                </span>
              </button>
            </div>
          </div>

          {/* Green API Status Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold ${
                  selectedGreenInstance === 'sales'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedGreenInstance === 'sales'
                      ? 'Instancia Ventas Digital MYK Lab (+51 929 327 654)'
                      : 'Instancia Demos Odontología & Belleza (+51 986 150 562)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conecta el número <strong className={selectedGreenInstance === 'sales' ? 'text-cyan-400' : 'text-emerald-400'}>{activeConnectedPhone}</strong> escaneando el QR de su propia instancia en <span className="text-slate-200">console.green-api.com</span>.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {selectedGreenInstance === 'sales' ? 'Bot Ventas Listo 24/7' : 'Webhook Receptor Listo'}
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número WhatsApp:
                </label>
                <input
                  type="text"
                  value={activeConnectedPhone}
                  onChange={(e) => selectedGreenInstance === 'sales' ? setSalesConnectedPhone(e.target.value) : setConnectedPhone(e.target.value)}
                  placeholder="+51 929 327 654"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  idInstance (Green-API):
                </label>
                <input
                  type="text"
                  value={activeIdInstance}
                  onChange={(e) => handleIdInstanceChange(e.target.value)}
                  placeholder="ej. 7107123456"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  apiTokenInstance (Token Secreto):
                </label>
                <input
                  type="password"
                  value={activeTokenInstance}
                  onChange={(e) => selectedGreenInstance === 'sales' ? setSalesApiTokenInstance(e.target.value) : setApiTokenInstance(e.target.value)}
                  placeholder="Pega aquí tu token de Green-API"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Host API URL (Cluster):
                </label>
                <input
                  type="text"
                  value={activeApiUrl}
                  onChange={(e) => selectedGreenInstance === 'sales' ? setSalesApiUrl(e.target.value) : setApiUrl(e.target.value)}
                  placeholder="https://7107.api.greenapi.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Auto-Receiver & Queue Sync Engine Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 to-indigo-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    Receptor Automático Activo (Polling 24/7 sin bloqueo de Webhook)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  El servidor consulta y procesa directamente la cola de mensajes de esta instancia cada 1.5s, respondiendo al instante.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleActivateQueueMode}
                  disabled={queueModeLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950"
                >
                  {queueModeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{queueModeLoading ? 'Configurando...' : '⚡ Activar Modo Cola Directo'}</span>
                </button>

                <button
                  onClick={handleTogglePolling}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                    (selectedGreenInstance === 'sales' ? isSalesPollingActive : isLocalPollingActive)
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border-amber-500/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{(selectedGreenInstance === 'sales' ? isSalesPollingActive : isLocalPollingActive) ? '⏸️ Pausar Polling' : '▶️ Reanudar Polling'}</span>
                </button>

                <button
                  onClick={handleForcePoll}
                  disabled={forcePolling}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950"
                >
                  {forcePolling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{forcePolling ? 'Procesando...' : '🔄 Sincronizar Cola'}</span>
                </button>
              </div>
            </div>

            {queueModeResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-indigo-200 font-mono">
                {queueModeResult}
              </div>
            )}

            {pollResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                {pollResult}
              </div>
            )}

            {/* Diagnostic Inspector Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-xs text-slate-400">
                Verifica si el teléfono <strong>{activeConnectedPhone}</strong> está debidamente vinculado y autorizado en Green-API.
              </div>
              <button
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
              >
                {diagnosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-indigo-300" />}
                <span>{diagnosing ? 'Diagnosticando...' : '🔍 Diagnosticar Estado de Instancia'}</span>
              </button>
            </div>

            {/* Diagnostic Result Card */}
            {diagnoseResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${diagnoseResult.isAuthorized ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/30 border-amber-500/40 text-amber-300'}`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-2">
                    {diagnoseResult.isAuthorized ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {diagnoseResult.isAuthorized ? '¡Instancia WhatsApp Conectada y Autorizada!' : `Estado de Instancia: ${diagnoseResult.stateInstance?.stateInstance || 'Desconocido'}`}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{diagnoseResult.baseUrl}</span>
                </div>
                {diagnoseResult.error && (
                  <p className="text-rose-400 text-xs font-mono">{diagnoseResult.error}</p>
                )}
                {diagnoseResult.settings && (
                  <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg font-mono">
                    <div>Webhook configurado en Green-API: <strong className="text-indigo-300">{diagnoseResult.settings.webhookUrl || '(Modo Cola / Polling Activo)'}</strong></div>
                    <div>Incoming Webhook activado: <strong className={diagnoseResult.settings.incomingWebhook === 'yes' ? 'text-emerald-400' : 'text-amber-400'}>{diagnoseResult.settings.incomingWebhook || 'no'}</strong></div>
                  </div>
                )}
              </div>
            )}

            {/* Webhook Callback Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  📌 URL de Webhook para esta Instancia:
                </label>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Endpoint Activo 24/7
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullWebhookUrl}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullWebhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedWebhook ? '¡Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={handleSetWebhookUrl}
                  disabled={setWebhookLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950"
                >
                  {setWebhookLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{setWebhookLoading ? 'Configurando...' : '⚡ Configurar en Green-API'}</span>
                </button>
              </div>

              {setWebhookResult && (
                <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200 font-mono">
                  {setWebhookResult}
                </div>
              )}

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-200">Cómo conectar tu segundo número (+51 929 327 654) en Green-API:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>En <strong>console.green-api.com</strong> haz clic en <strong>Create an instance</strong> y escanea el QR con el WhatsApp de <strong>929 327 654</strong>.</li>
                  <li>Copia el nuevo <strong>idInstance</strong> y <strong>apiTokenInstance</strong> y pégalos arriba.</li>
                  <li>Haz clic en <strong>Guardar y Aplicar Credenciales</strong> y luego en <strong>⚡ Activar Modo Cola Directo</strong> (o configura el Webhook).</li>
                  <li>¡Listo! Cualquier palabra que llegue al <strong>929 327 654</strong> disparará la respuesta PRO de Digital MYK Lab al instante.</li>
                </ol>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> ¡Configuración guardada y sincronizada con el servidor!
                </span>
              )}
              <button
                onClick={handleSaveGreenApi}
                className="ml-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar y Aplicar Credenciales</span>
              </button>
            </div>
          </div>

          {/* Test WhatsApp Direct Sender */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Enviar WhatsApp Directo de Prueba ({activeConnectedPhone})</span>
            </h4>
            <p className="text-xs text-slate-400">
              Envía un mensaje saliente desde esta instancia hacia tu celular para verificar la conexión.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Destino:</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+51 929 327 654"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mensaje de Prueba:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                  <button
                    onClick={handleSendTestWhatsApp}
                    disabled={testSending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Enviar WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                {testResult}
              </div>
            )}
          </div>

          {/* Real-time Traffic Terminal & Logs */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Monitor de Tráfico en Vivo — {selectedGreenInstance === 'sales' ? 'Línea Ventas (+51 929 327 654)' : 'Línea Demos (+51 986 150 562)'}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Auto-actualización cada 3s ({activeLogs.length} eventos)
              </span>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-2">
              {activeLogs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center text-xs">
                  Esperando eventos de esta instancia... Envía un mensaje al WhatsApp conectado para verlo reflejado aquí en tiempo real.
                </div>
              ) : (
                activeLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500 text-[10px] whitespace-nowrap">{log.timestamp}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-slate-800 text-indigo-300">
                        {log.status}
                      </span>
                      {log.phone && (
                        <span className="text-emerald-400 text-[11px] font-bold">{log.phone}</span>
                      )}
                      {log.sender && (
                        <span className="text-slate-400 text-[11px]">({log.sender}):</span>
                      )}
                      {log.text && (
                        <span className="text-slate-200 text-xs truncate max-w-xs">{log.text}</span>
                      )}
                    </div>
                    {log.details && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {log.details?.statusMessage || log.details?.idMessage || ''}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Dental Appointment Modal */}
      {showAddDentalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🦷 Registrar Paciente (Demo Odontología)</span>
              </h4>
              <button
                onClick={() => setShowAddDentalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDentalRow} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="ej. Carlos Mendoza"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp:</label>
                <input
                  type="text"
                  required
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tratamiento:</label>
                <select
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Limpieza Dental">Limpieza Dental (S/ 50)</option>
                  <option value="Evaluación Ortodoncia">Evaluación Ortodoncia (S/ 150)</option>
                  <option value="Blanqueamiento">Blanqueamiento (S/ 120)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fecha y Hora Solicitada:</label>
                <input
                  type="text"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  placeholder="Mañana - 4:00 PM"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDentalModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Guardar en Hoja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Sales Lead Modal */}
      {showAddSalesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🚀 Nuevo Cliente — CRM PRO Digital MYK Lab</span>
              </h4>
              <button onClick={() => setShowAddSalesModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateSalesLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Cliente:</label>
                <input
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="ej. Luis Navarro"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp:</label>
                <input
                  type="text"
                  required
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Solución:</label>
                  <select
                    value={newLeadService}
                    onChange={(e) => setNewLeadService(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Combo Asistente IA + Web Gratis">Combo IA + Web Gratis</option>
                    <option value="Chatbot IA 24/7">Chatbot IA 24/7</option>
                    <option value="Web Profesional PRO">Web Profesional PRO</option>
                    <option value="App a la Medida">App a la Medida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Estimado (S/):</label>
                  <input
                    type="number"
                    value={newLeadValue}
                    onChange={(e) => setNewLeadValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rubro / Empresa:</label>
                  <input
                    type="text"
                    value={newLeadBusiness}
                    onChange={(e) => setNewLeadBusiness(e.target.value)}
                    placeholder="ej. Clínica, Tienda"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Medio de Pago:</label>
                  <select
                    value={newLeadPaymentMethod}
                    onChange={(e) => setNewLeadPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Yape (929327654)">Yape (929327654)</option>
                    <option value="Plin (921034349)">Plin (921034349)</option>
                    <option value="Banco de la Nación">Banco de la Nación</option>
                    <option value="Scotiabank Ahorro Soles">Scotiabank Ahorro Soles</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSalesModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Guardar en CRM PRO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM PRO Lead Detail & Conversation Modal */}
      {activeSelectedLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-extrabold">
                  {activeSelectedLead.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">{activeSelectedLead.clientName}</h4>
                  <p className="text-xs font-mono text-cyan-400">{activeSelectedLead.whatsapp} • {activeSelectedLead.serviceInterest}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSalesLeadId(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Left: Editable CRM Fields */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Datos Comerciales & Cobranza</h5>

                <div>
                  <label className="block text-slate-400 mb-1">Etapa del Pipeline:</label>
                  <select
                    value={activeSelectedLead.status}
                    onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    {crmStages.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Valor Proyecto (S/):</label>
                    <input
                      type="number"
                      value={activeSelectedLead.estimatedValue || 0}
                      onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { estimatedValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Estado del Pago:</label>
                    <select
                      value={activeSelectedLead.paymentStatus || 'Pendiente'}
                      onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { paymentStatus: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Por Verificar">Por Verificar</option>
                      <option value="Confirmado">Confirmado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Medio de Pago:</label>
                    <select
                      value={activeSelectedLead.paymentMethod || 'Por definir'}
                      onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="Por definir">Por definir</option>
                      <option value="Yape (929327654)">Yape (929327654)</option>
                      <option value="Plin (921034349)">Plin (921034349)</option>
                      <option value="Banco de la Nación">Banco de la Nación</option>
                      <option value="Scotiabank Ahorro Soles">Scotiabank Ahorro Soles</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Rubro / Empresa:</label>
                    <input
                      type="text"
                      value={activeSelectedLead.businessType || ''}
                      onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { businessType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Notas de Seguimiento:</label>
                  <textarea
                    rows={3}
                    value={activeSelectedLead.notes || ''}
                    onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={`https://wa.me/${activeSelectedLead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${activeSelectedLead.clientName}, te saluda Maycol Castañeda de Digital MYK Lab. Te comparto nuestras cuentas oficiales para iniciar tu proyecto:\n\n• Yape: 929327654\n• Plin: 921034349\n• Banco de la Nación: Cta 04765342509 | CCI 018-765-004765342509-81\n• Scotiabank Soles: Cta 8330613655 | CCI 00972420833061365561\nTitular: Maycol Castañeda`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar Cuentas por WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Right: Live Bot Chat Transcript */}
              <div className="space-y-2 flex flex-col">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Historial de Conversación WhatsApp</h5>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-[320px] overflow-y-auto">
                  {activeSelectedLead.history && activeSelectedLead.history.length > 0 ? (
                    activeSelectedLead.history.map((m, i) => (
                      <div key={i} className={`p-2 rounded-lg text-[11px] ${m.sender === 'user' ? 'bg-emerald-950/50 border border-emerald-500/20 text-emerald-100 ml-4' : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'}`}>
                        <div className="text-[9px] font-bold text-slate-400 mb-0.5">
                          {m.sender === 'user' ? activeSelectedLead.clientName : 'Digital MYK Lab Bot'}
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-8 text-[11px]">
                      Último mensaje registrado: "{activeSelectedLead.lastMessage}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
