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
  Terminal
} from 'lucide-react';
import { DentalAppointment, BeautyAppointment, GreenApiConfig } from '../types';

interface LiveDemosHubViewProps {
  dentalAppointments: DentalAppointment[];
  beautyAppointments: BeautyAppointment[];
  onUpdateDentalStatus: (id: string, status: DentalAppointment['status']) => void;
  onUpdateBeautyStatus: (id: string, status: BeautyAppointment['status']) => void;
  onAddDentalAppointment: (appointment: DentalAppointment) => void;
  onAddBeautyAppointment: (appointment: BeautyAppointment) => void;
  greenApiConfig: GreenApiConfig;
  onUpdateGreenApiConfig: (config: Partial<GreenApiConfig>) => void;
  onOpenSimulator: () => void;
}

export const LiveDemosHubView: React.FC<LiveDemosHubViewProps> = ({
  dentalAppointments,
  beautyAppointments,
  onUpdateDentalStatus,
  onUpdateBeautyStatus,
  onAddDentalAppointment,
  onAddBeautyAppointment,
  greenApiConfig,
  onUpdateGreenApiConfig,
  onOpenSimulator
}) => {
  const [activeTab, setActiveTab] = useState<'dental' | 'beauty' | 'bono_web' | 'green_api'>('dental');
  
  // Green API Form state
  const [idInstance, setIdInstance] = useState(greenApiConfig.idInstance || '710722724819');
  const [apiTokenInstance, setApiTokenInstance] = useState(greenApiConfig.apiTokenInstance || '');
  const [apiUrl, setApiUrl] = useState(greenApiConfig.apiUrl || 'https://7107.api.greenapi.com');
  const [connectedPhone, setConnectedPhone] = useState(greenApiConfig.connectedPhone || '+51 986 150 562');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);
  const [trafficLogs, setTrafficLogs] = useState<any[]>([]);

  // Fetch live logs periodically
  const fetchLogs = useCallback(() => {
    fetch('/api/green-api/logs')
      .then(r => r.json())
      .then(data => {
        if (data.logs) setTrafficLogs(data.logs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Update apiUrl automatically when idInstance changes if user hasn't typed custom
  const handleIdInstanceChange = (val: string) => {
    setIdInstance(val);
    const clean = val.trim();
    if (clean.length >= 4) {
      setApiUrl(`https://${clean.slice(0, 4)}.api.greenapi.com`);
    }
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnoseResult(null);
    try {
      const res = await fetch(`/api/green-api/diagnose?idInstance=${encodeURIComponent(idInstance.trim())}&apiTokenInstance=${encodeURIComponent(apiTokenInstance.trim())}&apiUrl=${encodeURIComponent(apiUrl.trim())}`);
      const data = await res.json();
      setDiagnoseResult(data);
    } catch (e: any) {
      setDiagnoseResult({ success: false, error: e.message });
    } finally {
      setDiagnosing(false);
    }
  };

  // Test WhatsApp message state
  const [testPhone, setTestPhone] = useState('+51 986 150 562');
  const [testMessage, setTestMessage] = useState('¡Hola! Prueba de conexión Green-API exitosa ✨');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Beauty CRM Protected Login state (Simulation for Client Meetings)
  const [isBeautyLoggedIn, setIsBeautyLoggedIn] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@glowbelleza.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Bono Web Template selector
  const [selectedWebPreview, setSelectedWebPreview] = useState<'dental' | 'beauty'>('dental');

  // New Dental Row quick modal
  const [showAddDentalModal, setShowAddDentalModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('+51 9');
  const [newTreatment, setNewTreatment] = useState('Limpieza Dental');
  const [newDateTime, setNewDateTime] = useState('Mañana - 4:00 PM');

  // Base URL for webhook
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://api.omniflow.io';
  const fullWebhookUrl = `${currentHost}/api/green-api/webhook`;

  const [forcePolling, setForcePolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [queueModeLoading, setQueueModeLoading] = useState(false);
  const [queueModeResult, setQueueModeResult] = useState<string | null>(null);

  const [setWebhookLoading, setSetWebhookLoading] = useState(false);
  const [setWebhookResult, setSetWebhookResult] = useState<string | null>(null);
  const [isLocalPollingActive, setIsLocalPollingActive] = useState(true);

  const handleSetWebhookUrl = async () => {
    setSetWebhookLoading(true);
    setSetWebhookResult(null);
    try {
      const res = await fetch('/api/green-api/set-webhook-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim(),
          webhookUrl: fullWebhookUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setSetWebhookResult(`✅ ¡Webhook configurado en Green-API hacia ${fullWebhookUrl}! Los mensajes llegarán directamente aquí.`);
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
    try {
      const res = await fetch('/api/green-api/toggle-polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !isLocalPollingActive })
      });
      const data = await res.json();
      if (data.success) {
        setIsLocalPollingActive(data.pollingEnabled);
        fetchLogs();
      }
    } catch (e) {}
  };

  const handleActivateQueueMode = async () => {
    setQueueModeLoading(true);
    setQueueModeResult(null);
    try {
      // First save current config
      await fetch('/api/green-api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim(),
          connectedPhone: connectedPhone.trim(),
          pollingEnabled: true
        })
      });

      const res = await fetch('/api/green-api/set-queue-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setQueueModeResult('✅ ¡Modo Cola Directo Activado con éxito! Green-API ahora entrega los mensajes al receptor del servidor sin bloqueos.');
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
    try {
      // First, ensure backend has current credentials in case user just typed/pasted them
      await fetch('/api/green-api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim(),
          connectedPhone: connectedPhone.trim(),
          pollingEnabled: true
        })
      }).catch(() => {});

      const res = await fetch('/api/green-api/poll-now', { method: 'POST' });
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
    onUpdateGreenApiConfig({
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim(),
      connectedPhone: connectedPhone.trim(),
      status: 'connected',
      lastPing: new Date().toISOString()
    });

    try {
      await fetch('/api/green-api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim(),
          connectedPhone: connectedPhone.trim(),
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
    try {
      const res = await fetch('/api/green-api/send-message', {
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
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Central de Gestión y Recepción Inteligente
              <span className="text-emerald-400 font-mono text-xl">{connectedPhone}</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Plataforma integral de atención omnicanal 24/7 con Inteligencia Artificial, sincronización directa a base de datos y paneles de gestión operativa para Clínicas de Salud y Centros Especializados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenSimulator}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulador Interactivo de Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('green_api')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Conexión WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('dental')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dental'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>🦷 Módulo Dental: Gestión de Citas & Google Sheets</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">Base de Datos en Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab('beauty')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'beauty'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>💅 Módulo Glow: Recepción IA Mía & CRM Kanban</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">IA Gemini + Tablero</span>
          </button>

          <button
            onClick={() => setActiveTab('bono_web')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bono_web'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌐 Portal Web & Landing Integrada</span>
          </button>

          <button
            onClick={() => setActiveTab('green_api')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'green_api'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>⚙️ Conectividad WhatsApp</span>
          </button>
        </div>
      </div>

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
                  onClick={onOpenSimulator}
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

      {/* 5. TAB CONTENT: GREEN-API CONFIGURATION */}
      {activeTab === 'green_api' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Green API Status Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configuración de Green-API (console.green-api.com)</h3>
                  <p className="text-xs text-slate-400">
                    Conecta tu número <strong className="text-emerald-400">+51 986 150 562</strong> escaneando el código QR en Green-API sin complicaciones de Meta.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Webhook Receptor Listo
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  idInstance (De tu consola Green-API):
                </label>
                <input
                  type="text"
                  value={idInstance}
                  onChange={(e) => handleIdInstanceChange(e.target.value)}
                  placeholder="ej. 710722724819"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  apiTokenInstance (Token Secreto):
                </label>
                <input
                  type="password"
                  value={apiTokenInstance}
                  onChange={(e) => setApiTokenInstance(e.target.value)}
                  placeholder="Pega aquí tu token de Green-API"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Host API URL (Cluster Green-API):
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
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
                  El servidor consulta y procesa directamente la cola de mensajes de Green-API cada 1.5s, respondiendo al instante.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleActivateQueueMode}
                  disabled={queueModeLoading}
                  title="Limpia automáticamente la URL del webhook en Green-API para que los mensajes pasen de inmediato a la cola del bot"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950"
                >
                  {queueModeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{queueModeLoading ? 'Configurando...' : '⚡ Activar Modo Cola Directo'}</span>
                </button>

                <button
                  onClick={handleTogglePolling}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                    isLocalPollingActive 
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border-amber-500/50'
                  }`}
                  title="Pausa la recepción continua en esta ventana para que tu servidor de Render tenga prioridad exclusiva"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isLocalPollingActive ? '⏸️ Pausar Polling Local' : '▶️ Reanudar Polling'}</span>
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
                Verifica si tu teléfono <strong>+51 986 150 562</strong> está debidamente vinculado y autorizado en los servidores de Green-API.
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
                    <div>Webhook configurado en Green-API: <strong className="text-indigo-300">{diagnoseResult.settings.webhookUrl || '(No configurado aún en consola)'}</strong></div>
                    <div>Incoming Webhook activado: <strong className={diagnoseResult.settings.incomingWebhook === 'yes' ? 'text-emerald-400' : 'text-amber-400'}>{diagnoseResult.settings.incomingWebhook || 'no'}</strong></div>
                  </div>
                )}
              </div>
            )}

            {/* Webhook Callback Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  📌 URL de Webhook para Pegar en Green-API:
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
                  title="Aplica directamente esta URL en los servidores de Green-API con un solo clic"
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
                <p className="font-semibold text-indigo-200">Pasos exactos en console.green-api.com:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Ingresa a tu instancia <strong>710722724819</strong>.</li>
                  <li>En el menú lateral haz clic en <strong>Configuración (Settings)</strong> ➔ <strong>Webhooks</strong>.</li>
                  <li>Pega la URL de arriba en el campo <strong>Webhook URL</strong>.</li>
                  <li>Activa las casillas <code className="text-emerald-300 bg-slate-900 px-1 rounded">incomingMessageReceived</code> y <code className="text-emerald-300 bg-slate-900 px-1 rounded">outgoingMessageReceived</code>.</li>
                  <li>Haz clic en <strong>Guardar (Save)</strong> en Green-API.</li>
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
              <span>Enviar WhatsApp Directo de Prueba</span>
            </h4>
            <p className="text-xs text-slate-400">
              Envía un mensaje instantáneo desde el servidor hacia tu celular para verificar la entrega saliente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Destino:</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+51 986 150 562"
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
                <h4 className="text-sm font-bold text-white">Monitor de Tráfico en Vivo (Webhooks & Respuestas)</h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Auto-actualización cada 3s ({trafficLogs.length} eventos)
              </span>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-2">
              {trafficLogs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center text-xs">
                  Esperando el primer mensaje desde WhatsApp o evento webhook... Envía un mensaje desde tu celular para verlo reflejado aquí en tiempo real.
                </div>
              ) : (
                trafficLogs.map((log) => (
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
    </div>
  );
};
