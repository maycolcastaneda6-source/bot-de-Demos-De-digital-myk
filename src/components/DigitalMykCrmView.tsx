import React, { useState, useEffect, useCallback } from 'react';
import {
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
  Clock,
  UserCheck,
  TrendingUp,
  MessageCircle,
  Plus,
  Activity,
  Terminal,
  Search,
  Wallet,
  Building2,
  Eye,
  BadgeCheck,
  Filter,
  ShoppingBag,
  Trash2,
  Sparkles,
  AlertTriangle,
  QrCode,
  KeyRound,
  PlugZap,
  Power,
  ShieldCheck
} from 'lucide-react';
import { GreenApiConfig, SalesLead, SalesLeadStage } from '../types';

type SocialPlatformKey = 'tiktok' | 'instagram' | 'facebook' | 'youtube';

interface SocialTier {
  id: string;
  label: string;
  price: number;
  combinable?: boolean;
}

interface SocialCategory {
  name: string;
  combinableNote?: string;
  tiers: SocialTier[];
}

interface SocialPlatformCatalog {
  key: SocialPlatformKey;
  label: string;
  emoji: string;
  serviceName: string;
  accentClass: string;
  categories: SocialCategory[];
}

const SOCIAL_CATALOG: SocialPlatformCatalog[] = [
  {
    key: 'tiktok',
    label: 'TikTok',
    emoji: '🎵',
    serviceName: 'Crecimiento TikTok',
    accentClass: 'border-cyan-500/40 text-cyan-300',
    categories: [
      {
        name: 'Seguidores',
        tiers: [
          { id: 'tt_seg_500', label: '500 Seguidores', price: 12 },
          { id: 'tt_seg_1k', label: '1K Seguidores', price: 22 },
          { id: 'tt_seg_3k', label: '3K Seguidores', price: 60 },
          { id: 'tt_seg_5k', label: '5K Seguidores', price: 95 }
        ]
      },
      {
        name: 'Espectadores En Vivo',
        tiers: [
          { id: 'tt_live_30m', label: '30 minutos', price: 35 },
          { id: 'tt_live_1h', label: '1 hora', price: 65 },
          { id: 'tt_live_1h30', label: '1 hr 30 min', price: 95 }
        ]
      },
      {
        name: 'Likes',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'tt_likes_500', label: '500 Likes (Combinar)', price: 6, combinable: true },
          { id: 'tt_likes_1k', label: '1K Likes', price: 10 },
          { id: 'tt_likes_3k', label: '3K Likes', price: 22 },
          { id: 'tt_likes_5k', label: '5K Likes', price: 35 }
        ]
      },
      {
        name: 'Vistas',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'tt_views_1k', label: '1K Vistas (Combinar)', price: 6, combinable: true },
          { id: 'tt_views_2k', label: '2K Vistas', price: 10 },
          { id: 'tt_views_5k', label: '5K Vistas', price: 18 },
          { id: 'tt_views_10k', label: '10K Vistas', price: 32 }
        ]
      },
      {
        name: 'Comentarios Personalizados',
        tiers: [
          { id: 'tt_com_100', label: '100 Comentarios', price: 10 },
          { id: 'tt_com_300', label: '300 Comentarios', price: 22 },
          { id: 'tt_com_500', label: '500 Comentarios', price: 35 },
          { id: 'tt_com_1k', label: '1K Comentarios', price: 65 }
        ]
      }
    ]
  },
  {
    key: 'instagram',
    label: 'Instagram',
    emoji: '📸',
    serviceName: 'Crecimiento Instagram',
    accentClass: 'border-pink-500/40 text-pink-300',
    categories: [
      {
        name: 'Seguidores',
        tiers: [
          { id: 'ig_seg_500', label: '500 Seguidores', price: 12 },
          { id: 'ig_seg_1k', label: '1K Seguidores', price: 22 },
          { id: 'ig_seg_3k', label: '3K Seguidores', price: 60 },
          { id: 'ig_seg_5k', label: '5K Seguidores', price: 95 }
        ]
      },
      {
        name: 'Visualizaciones En Vivo',
        tiers: [
          { id: 'ig_live_500', label: '500 En Vivo', price: 10 },
          { id: 'ig_live_1k', label: '1K En Vivo', price: 16 },
          { id: 'ig_live_3k', label: '3K En Vivo', price: 40 },
          { id: 'ig_live_5k', label: '5K En Vivo', price: 65 }
        ]
      },
      {
        name: 'Likes',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'ig_likes_1k', label: '1K Likes (Combinar)', price: 6, combinable: true },
          { id: 'ig_likes_2k', label: '2K Likes', price: 10 },
          { id: 'ig_likes_5k', label: '5K Likes', price: 22 },
          { id: 'ig_likes_10k', label: '10K Likes', price: 40 }
        ]
      },
      {
        name: 'Vistas',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'ig_views_1k', label: '1K Vistas (Combinar)', price: 6, combinable: true },
          { id: 'ig_views_2k', label: '2K Vistas', price: 10 },
          { id: 'ig_views_5k', label: '5K Vistas', price: 18 },
          { id: 'ig_views_10k', label: '10K Vistas', price: 32 }
        ]
      },
      {
        name: 'Comentarios Personalizados',
        tiers: [
          { id: 'ig_com_500', label: '500 Comentarios', price: 18 },
          { id: 'ig_com_1k', label: '1K Comentarios', price: 30 },
          { id: 'ig_com_3k', label: '3K Comentarios', price: 80 }
        ]
      }
    ]
  },
  {
    key: 'facebook',
    label: 'Facebook',
    emoji: '📘',
    serviceName: 'Crecimiento Facebook',
    accentClass: 'border-blue-500/40 text-blue-300',
    categories: [
      {
        name: 'Seguidores',
        tiers: [
          { id: 'fb_seg_500', label: '500 Seguidores', price: 12 },
          { id: 'fb_seg_1k', label: '1K Seguidores', price: 22 },
          { id: 'fb_seg_3k', label: '3K Seguidores', price: 60 },
          { id: 'fb_seg_5k', label: '5K Seguidores', price: 95 }
        ]
      },
      {
        name: 'Transmisión En Vivo',
        tiers: [
          { id: 'fb_live_60m', label: '60 minutos', price: 45 },
          { id: 'fb_live_10h', label: '10 horas', price: 95 }
        ]
      },
      {
        name: 'Likes',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'fb_likes_500', label: '500 Likes (Combinar)', price: 6, combinable: true },
          { id: 'fb_likes_1k', label: '1K Likes', price: 10 },
          { id: 'fb_likes_3k', label: '3K Likes', price: 25 },
          { id: 'fb_likes_5k', label: '5K Likes', price: 40 }
        ]
      },
      {
        name: 'Comentarios Personalizados',
        tiers: [
          { id: 'fb_com_100', label: '100 Comentarios', price: 10 },
          { id: 'fb_com_300', label: '300 Comentarios', price: 22 },
          { id: 'fb_com_500', label: '500 Comentarios', price: 35 }
        ]
      },
      {
        name: 'Vistas',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'fb_views_1k', label: '1K Vistas (Combinar)', price: 6, combinable: true },
          { id: 'fb_views_2k', label: '2K Vistas', price: 10 },
          { id: 'fb_views_5k', label: '5K Vistas', price: 18 },
          { id: 'fb_views_10k', label: '10K Vistas', price: 32 }
        ]
      }
    ]
  },
  {
    key: 'youtube',
    label: 'YouTube',
    emoji: '🔴',
    serviceName: 'Crecimiento YouTube',
    accentClass: 'border-red-500/40 text-red-300',
    categories: [
      {
        name: 'Suscriptores / Seguidores',
        tiers: [
          { id: 'yt_sub_100', label: '100 Suscriptores', price: 10 },
          { id: 'yt_sub_500', label: '500 Suscriptores', price: 35 },
          { id: 'yt_sub_1k', label: '1K Suscriptores', price: 65 }
        ]
      },
      {
        name: 'Comentarios Aleatorios',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'yt_com_100', label: '100 Comentarios', price: 10 },
          { id: 'yt_com_500', label: '500 Comentarios', price: 25 },
          { id: 'yt_com_1k', label: '1K Comentarios', price: 45 }
        ]
      },
      {
        name: 'Likes',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'yt_likes_100', label: '100 Likes (Combinar)', price: 5, combinable: true },
          { id: 'yt_likes_300', label: '300 Likes', price: 10 },
          { id: 'yt_likes_500', label: '500 Likes', price: 14 },
          { id: 'yt_likes_1k', label: '1K Likes', price: 25 }
        ]
      },
      {
        name: 'Visualizaciones En Vivo',
        tiers: [
          { id: 'yt_live_1k', label: '1K En Vivo', price: 12 },
          { id: 'yt_live_5k', label: '5K En Vivo', price: 40 },
          { id: 'yt_live_10k', label: '10K En Vivo', price: 85 }
        ]
      },
      {
        name: 'Vistas',
        combinableNote: 'Combinables desde S/ 10',
        tiers: [
          { id: 'yt_views_100', label: '100 Vistas (Combinar)', price: 5, combinable: true },
          { id: 'yt_views_300', label: '300 Vistas', price: 10 },
          { id: 'yt_views_500', label: '500 Vistas', price: 14 },
          { id: 'yt_views_1k', label: '1K Vistas', price: 22 }
        ]
      }
    ]
  }
];

interface ComboCartItem {
  id: string;
  platform: string;
  serviceName: string;
  category: string;
  label: string;
  price: number;
  qty: number;
}

interface DigitalMykCrmViewProps {
  salesLeads: SalesLead[];
  salesGreenApiConfig: GreenApiConfig;
  onUpdateSalesLeadStatus: (id: string, status: SalesLead['status']) => void;
  onUpdateSalesLead: (id: string, updates: Partial<SalesLead>) => void;
  onAddSalesLead: (lead: SalesLead) => void;
  onUpdateSalesGreenApiConfig: (config: Partial<GreenApiConfig>) => void;
  onOpenSimulator: () => void;
}

export const DigitalMykCrmView: React.FC<DigitalMykCrmViewProps> = ({
  salesLeads,
  salesGreenApiConfig,
  onUpdateSalesLeadStatus,
  onUpdateSalesLead,
  onAddSalesLead,
  onUpdateSalesGreenApiConfig,
  onOpenSimulator
}) => {
  // CRM PRO UI states
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'table'>('kanban');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStageFilter, setSalesStageFilter] = useState<string>('ALL');
  const [selectedSalesLeadId, setSelectedSalesLeadId] = useState<string | null>(null);
  const [showPaymentAccounts, setShowPaymentAccounts] = useState(false);
  const [showSocialCatalog, setShowSocialCatalog] = useState(false);
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<SocialPlatformKey>('tiktok');
  const [comboCart, setComboCart] = useState<ComboCartItem[]>([]);
  const [copiedComboQuote, setCopiedComboQuote] = useState(false);
  const [showGreenPanel, setShowGreenPanel] = useState(false);
  const [copiedAccountKey, setCopiedAccountKey] = useState<string | null>(null);

  // Add Lead Modal state
  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('+51 9');
  const [newLeadService, setNewLeadService] = useState('Combo Asistente IA + Web Gratis');
  const [newLeadBusiness, setNewLeadBusiness] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('390');
  const [newLeadPaymentMethod, setNewLeadPaymentMethod] = useState('Yape (929327654)');

  // Line 2 Multi-Engine WhatsApp State (+51 929 327 654)
  const [salesProvider, setSalesProvider] = useState<'baileys' | 'cloud_api' | 'green_api'>(
    salesGreenApiConfig.provider || 'baileys'
  );
  const [salesIdInstance, setSalesIdInstance] = useState(salesGreenApiConfig.idInstance || '710722803080');
  const [salesApiTokenInstance, setSalesApiTokenInstance] = useState(salesGreenApiConfig.apiTokenInstance || '');
  const [salesApiUrl, setSalesApiUrl] = useState(salesGreenApiConfig.apiUrl || 'https://7107.api.greenapi.com');
  const [salesConnectedPhone, setSalesConnectedPhone] = useState(salesGreenApiConfig.connectedPhone || '+51 929 327 654');
  const [salesReplyMode, setSalesReplyMode] = useState<'poll_and_text' | 'interactive' | 'text_only'>(
    salesGreenApiConfig.replyMode || 'poll_and_text'
  );
  const [baileysStatus, setBaileysStatus] = useState<any>(null);
  const [pairingPhoneInput, setPairingPhoneInput] = useState('51929327654');
  const [baileysLoading, setBaileysLoading] = useState(false);
  const [exportedAuthB64, setExportedAuthB64] = useState<string | null>(null);
  const [copiedAuthB64, setCopiedAuthB64] = useState(false);
  const [cloudPhoneNumberId, setCloudPhoneNumberId] = useState(salesGreenApiConfig.cloudPhoneNumberId || '');
  const [cloudAccessToken, setCloudAccessToken] = useState(salesGreenApiConfig.cloudAccessToken || '');
  const [cloudVerifyToken, setCloudVerifyToken] = useState(salesGreenApiConfig.cloudVerifyToken || 'digitalmyklab_verify');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);
  const [salesTrafficLogs, setSalesTrafficLogs] = useState<any[]>([]);
  const [testPhone, setTestPhone] = useState('+51 929 327 654');
  const [testMessage, setTestMessage] = useState('Hola, prueba de conexión Digital MYK Lab (+51 929 327 654)');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [forcePolling, setForcePolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [queueModeLoading, setQueueModeLoading] = useState(false);
  const [queueModeResult, setQueueModeResult] = useState<string | null>(null);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [setWebhookResult, setSetWebhookResult] = useState<string | null>(null);
  const [isSalesPollingActive, setIsSalesPollingActive] = useState(true);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://digitalmyklab.onrender.com';
  const salesWebhookUrl = `${currentHost}/api/green-api/sales/webhook`;
  const cloudWebhookUrl = `${currentHost}/api/whatsapp/sales/cloud-webhook`;

  const fetchSalesLogs = useCallback(() => {
    fetch('/api/green-api/sales/logs')
      .then(r => r.json())
      .then(data => {
        if (data.logs) setSalesTrafficLogs(data.logs);
        if (data.baileys) setBaileysStatus(data.baileys);
        if (data.config?.pollingEnabled !== undefined) {
          setIsSalesPollingActive(data.config.pollingEnabled);
        }
        if (data.config?.replyMode) {
          setSalesReplyMode(data.config.replyMode);
        }
        if (data.config?.provider) {
          setSalesProvider(data.config.provider);
        }
        if (data.config?.apiTokenInstance) {
          setSalesApiTokenInstance(prev => prev || data.config.apiTokenInstance);
        }
        if (data.config?.cloudPhoneNumberId) {
          setCloudPhoneNumberId(prev => prev || data.config.cloudPhoneNumberId);
        }
        if (data.config?.cloudAccessToken) {
          setCloudAccessToken(prev => prev || data.config.cloudAccessToken);
        }
        if (data.config?.cloudVerifyToken) {
          setCloudVerifyToken(prev => prev || data.config.cloudVerifyToken);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSalesLogs();
    const interval = setInterval(fetchSalesLogs, 2000);
    return () => clearInterval(interval);
  }, [fetchSalesLogs]);

  useEffect(() => {
    if (salesGreenApiConfig.idInstance && !salesIdInstance) {
      setSalesIdInstance(salesGreenApiConfig.idInstance);
    }
    if (salesGreenApiConfig.apiTokenInstance && !salesApiTokenInstance) {
      setSalesApiTokenInstance(salesGreenApiConfig.apiTokenInstance);
    }
    if (salesGreenApiConfig.apiUrl && salesApiUrl === 'https://api.greenapi.com') {
      setSalesApiUrl(salesGreenApiConfig.apiUrl);
    }
    if (salesGreenApiConfig.replyMode) {
      setSalesReplyMode(salesGreenApiConfig.replyMode);
    }
    if (salesGreenApiConfig.provider) {
      setSalesProvider(salesGreenApiConfig.provider);
    }
  }, [salesGreenApiConfig]);

  const handleIdInstanceChange = (val: string) => {
    setSalesIdInstance(val);
    const clean = val.trim();
    if (clean.length >= 4) {
      setSalesApiUrl(`https://${clean.slice(0, 4)}.api.greenapi.com`);
    }
  };

  const handleSwitchProvider = (nextProvider: 'baileys' | 'cloud_api' | 'green_api') => {
    setSalesProvider(nextProvider);
    onUpdateSalesGreenApiConfig({
      provider: nextProvider,
      replyMode: salesReplyMode
    });
    setTimeout(fetchSalesLogs, 350);
  };

  const handleConnectBaileysQR = async (forceReset = false) => {
    setBaileysLoading(true);
    try {
      const res = await fetch('/api/whatsapp/sales/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReset })
      });
      const data = await res.json();
      if (data.baileys) setBaileysStatus(data.baileys);
      setSalesProvider('baileys');
      setTimeout(fetchSalesLogs, 500);
    } catch {} finally {
      setBaileysLoading(false);
    }
  };

  const handleConnectBaileysPairing = async () => {
    const clean = pairingPhoneInput.replace(/[^0-9]/g, '');
    if (clean.length < 8) return;
    setBaileysLoading(true);
    try {
      const res = await fetch('/api/whatsapp/sales/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingPhone: clean, forceReset: true })
      });
      const data = await res.json();
      if (data.baileys) setBaileysStatus(data.baileys);
      setSalesProvider('baileys');
      setTimeout(fetchSalesLogs, 1800);
    } catch {} finally {
      setBaileysLoading(false);
    }
  };

  const handleDisconnectBaileys = async (clearAuth = false) => {
    setBaileysLoading(true);
    try {
      const res = await fetch('/api/whatsapp/sales/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAuth })
      });
      const data = await res.json();
      if (data.baileys) setBaileysStatus(data.baileys);
      setExportedAuthB64(null);
      fetchSalesLogs();
    } catch {} finally {
      setBaileysLoading(false);
    }
  };

  const handleExportBaileysAuth = async () => {
    try {
      const res = await fetch('/api/whatsapp/sales/export-auth');
      const data = await res.json();
      if (data.authBase64) {
        setExportedAuthB64(data.authBase64);
      }
    } catch {}
  };

  const handleSaveGreenConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSalesGreenApiConfig({
      provider: salesProvider,
      idInstance: salesIdInstance.trim(),
      apiTokenInstance: salesApiTokenInstance.trim(),
      apiUrl: salesApiUrl.trim(),
      connectedPhone: salesConnectedPhone.trim(),
      replyMode: salesReplyMode,
      cloudPhoneNumberId: cloudPhoneNumberId.trim(),
      cloudAccessToken: cloudAccessToken.trim(),
      cloudVerifyToken: cloudVerifyToken.trim() || 'digitalmyklab_verify',
      status: 'connected'
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setTimeout(fetchSalesLogs, 350);
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnoseResult(null);
    try {
      const res = await fetch(
        `/api/green-api/sales/diagnose?idInstance=${encodeURIComponent(salesIdInstance.trim())}&apiTokenInstance=${encodeURIComponent(salesApiTokenInstance.trim())}&apiUrl=${encodeURIComponent(salesApiUrl.trim())}`
      );
      const data = await res.json();
      setDiagnoseResult(data);
    } catch (e: any) {
      setDiagnoseResult({ success: false, error: e.message });
    } finally {
      setDiagnosing(false);
    }
  };

  const handleActivateQueueMode = async () => {
    setQueueModeLoading(true);
    setQueueModeResult(null);
    try {
      const res = await fetch('/api/green-api/sales/set-queue-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: salesIdInstance.trim(),
          apiTokenInstance: salesApiTokenInstance.trim(),
          apiUrl: salesApiUrl.trim()
        })
      });
      const data = await res.json();
      setQueueModeResult(data.success ? `✅ ${data.message}` : `❌ ${data.error}`);
      fetchSalesLogs();
    } catch (e: any) {
      setQueueModeResult(`❌ ${e.message}`);
    } finally {
      setQueueModeLoading(false);
    }
  };

  const handleSetWebhookUrl = async () => {
    setSettingWebhook(true);
    setSetWebhookResult(null);
    try {
      const res = await fetch('/api/green-api/sales/set-webhook-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: salesIdInstance.trim(),
          apiTokenInstance: salesApiTokenInstance.trim(),
          apiUrl: salesApiUrl.trim(),
          webhookUrl: salesWebhookUrl
        })
      });
      const data = await res.json();
      setSetWebhookResult(data.success ? `✅ ${data.message}` : `❌ ${data.error}`);
      fetchSalesLogs();
    } catch (e: any) {
      setSetWebhookResult(`❌ ${e.message}`);
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleTogglePolling = async () => {
    try {
      const res = await fetch('/api/green-api/sales/toggle-polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !isSalesPollingActive })
      });
      const data = await res.json();
      if (data.success) setIsSalesPollingActive(data.pollingEnabled);
    } catch (e) {}
  };

  const handleForcePoll = async () => {
    setForcePolling(true);
    setPollResult(null);
    try {
      const res = await fetch('/api/green-api/sales/poll-now', { method: 'POST' });
      const data = await res.json();
      setPollResult(data.success ? `✅ ${data.message}` : `❌ ${data.error}`);
      fetchSalesLogs();
    } catch (e: any) {
      setPollResult(`❌ ${e.message}`);
    } finally {
      setForcePolling(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setTestResult(null);
    try {
      const endpoint =
        salesProvider === 'green_api'
          ? '/api/green-api/sales/send-message'
          : '/api/whatsapp/sales/send-message';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, message: testMessage })
      });
      const data = await res.json();
      setTestResult(
        data.success
          ? '✅ Mensaje enviado con éxito'
          : `❌ Error: ${data.errorDetail || data.error || 'Verifica conexión'}`
      );
      fetchSalesLogs();
    } catch (e: any) {
      setTestResult(`❌ ${e.message}`);
    } finally {
      setTestSending(false);
    }
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
      lastMessage: 'Registro comercial directo en CRM PRO',
      status: '🔥 Nuevo Lead',
      estimatedValue: Number(newLeadValue) || 390,
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

  // CRM PRO Metrics & Filters
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

  const currentSocialPlatform = SOCIAL_CATALOG.find(p => p.key === activeSocialPlatform) || SOCIAL_CATALOG[0];
  const comboTotal = comboCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addTierToCombo = (platform: SocialPlatformCatalog, category: string, tier: SocialTier) => {
    setComboCart(prev => {
      const existing = prev.find(i => i.id === tier.id);
      if (existing) {
        return prev.map(i => (i.id === tier.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: tier.id,
          platform: platform.label,
          serviceName: platform.serviceName,
          category,
          label: tier.label,
          price: tier.price,
          qty: 1
        }
      ];
    });
  };

  const updateComboQty = (id: string, delta: number) => {
    setComboCart(prev =>
      prev
        .map(item => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter(item => item.qty > 0)
    );
  };

  const buildComboQuoteText = () => {
    const lines = comboCart.map(
      item => `• ${item.platform} — ${item.category}: ${item.label}${item.qty > 1 ? ` x${item.qty}` : ''} = S/ ${item.price * item.qty}`
    );
    return `🚀 *Cotización Crecimiento Redes Sociales — Digital MYK Lab*\n\n${lines.join('\n')}\n\n💰 *Total del Pack:* S/ ${comboTotal}\n📲 Envíanos el enlace (link) de tu perfil o publicación para iniciar.\n\n🟣 *Yape:* 929327654 | 🔵 *Plin:* 921034349 (Maycol Castañeda)`;
  };

  const handleCopyComboQuote = () => {
    if (comboCart.length === 0) return;
    navigator.clipboard.writeText(buildComboQuoteText());
    setCopiedComboQuote(true);
    setTimeout(() => setCopiedComboQuote(false), 1800);
  };

  const handleRegisterComboAsLead = () => {
    if (comboCart.length === 0) return;
    const uniqueServices = Array.from(new Set(comboCart.map(i => i.serviceName)));
    setNewLeadService(uniqueServices.length === 1 ? uniqueServices[0] : 'Redes Sociales (S/ 10+)');
    setNewLeadBusiness(
      comboCart.map(i => `${i.platform} ${i.label}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(' + ')
    );
    setNewLeadValue(String(comboTotal));
    setShowAddSalesModal(true);
  };

  const handleSelectNewLeadService = (service: string) => {
    setNewLeadService(service);
    if (service === 'Combo Asistente IA + Web Gratis') setNewLeadValue('390');
    else if (service === 'Chatbot IA 24/7') setNewLeadValue('350');
    else if (service === 'Web Profesional PRO') setNewLeadValue('290');
    else if (service === 'App a la Medida') setNewLeadValue('750');
    else setNewLeadValue('22');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 space-y-5">
      {/* Corporate Header Banner — 100% Dedicated to Digital MYK Lab */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
            <img src="/digital_myk_logo.jpg" alt="Digital MYK Lab" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight">CRM Comercial PRO — Digital MYK Lab</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold">
                {salesConnectedPhone}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  (salesProvider === 'baileys' && baileysStatus?.status === 'connected') ||
                  (salesProvider === 'cloud_api' && cloudPhoneNumberId && cloudAccessToken)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : salesProvider === 'baileys'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    (salesProvider === 'baileys' && baileysStatus?.status === 'connected') ||
                    (salesProvider === 'cloud_api' && cloudPhoneNumberId && cloudAccessToken)
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                {salesProvider === 'baileys'
                  ? baileysStatus?.status === 'connected'
                    ? 'Motor Directo Sin Límites 24/7'
                    : 'Motor Directo (Falta Vincular QR)'
                  : salesProvider === 'cloud_api'
                    ? 'Meta Cloud API Oficial'
                    : 'Green-API Legacy'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Canal comercial corporativo sin límite de números nuevos, cuentas oficiales a nombre de <strong>Maycol Castañeda</strong> y seguimiento CRM en tiempo real.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
              <a
                href="https://digitalmyklab.onrender.com/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 hover:text-cyan-200 font-semibold inline-flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>https://digitalmyklab.onrender.com/</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                Motor Activo:{' '}
                <strong className="text-emerald-300">
                  {salesProvider === 'baileys'
                    ? 'Directo Sin Límites (Gratis)'
                    : salesProvider === 'cloud_api'
                      ? 'Meta Cloud API Oficial'
                      : `Green-API (${salesIdInstance})`}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSocialCatalog(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
              showSocialCatalog
                ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-pink-300 border-pink-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Catálogo Redes S/ 10</span>
          </button>
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
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Chat con Botones</span>
          </button>
          <button
            onClick={() => setShowGreenPanel(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              showGreenPanel
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>
              {salesProvider === 'baileys'
                ? 'Conectar WhatsApp'
                : salesProvider === 'cloud_api'
                  ? 'Meta Cloud API'
                  : `Green-API (${salesIdInstance.slice(-4)})`}
            </span>
          </button>
        </div>
      </div>

      {/* Live WhatsApp Connection & Delivery Alert Banner */}
      {(() => {
        if (salesProvider === 'baileys') {
          if (baileysStatus?.status === 'connected') return null;
          return (
            <div className="p-4 rounded-2xl border bg-cyan-950/40 border-cyan-500/40 text-cyan-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl shrink-0 bg-cyan-500/20 text-cyan-300">
                  <PlugZap className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-cyan-200">
                    Nuevo Motor Directo WhatsApp Activado — Sin Límites de 3 Chats ni Pagos a Terceros
                  </p>
                  <p className="text-cyan-100/85 leading-relaxed">
                    Para empezar a responder automáticamente a <strong>todos los números nuevos</strong> que escriban al <strong>{salesConnectedPhone}</strong>, vincula tu WhatsApp escaneando el <strong>Código QR</strong> o con un <strong>Código de 8 dígitos</strong> (no requiere Green-API).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGreenPanel(true);
                  handleConnectBaileysQR(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center gap-2 shrink-0 cursor-pointer shadow-lg"
              >
                <QrCode className="w-4 h-4" />
                <span>Vincular WhatsApp Ahora (QR)</span>
              </button>
            </div>
          );
        }

        if (salesProvider === 'cloud_api') {
          if (cloudPhoneNumberId && cloudAccessToken) return null;
          return (
            <div className="p-4 rounded-2xl border bg-amber-950/45 border-amber-500/45 text-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl shrink-0 bg-amber-500/20 text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-amber-200">Configura tu Meta WhatsApp Cloud API Oficial</p>
                  <p className="text-amber-200/80">Ingresa el Phone Number ID y Permanent Access Token para responder con botones nativos oficiales.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGreenPanel(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Configurar Meta Cloud API
              </button>
            </div>
          );
        }

        const latestErrorLog = salesTrafficLogs.find(l => l.type === 'error');
        const isQuota466Error = Boolean(
          latestErrorLog &&
          (String(latestErrorLog.status || '').includes('466') ||
            String(latestErrorLog.status || '').toLowerCase().includes('developer'))
        );
        const isMissingToken = !salesApiTokenInstance.trim() && !salesGreenApiConfig.apiTokenInstance;

        if (!latestErrorLog && !isMissingToken) return null;

        return (
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isQuota466Error
                ? 'bg-rose-950/50 border-rose-500/45 text-rose-100'
                : 'bg-amber-950/45 border-amber-500/45 text-amber-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isQuota466Error ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                {isMissingToken ? (
                  <>
                    <p className="font-extrabold text-amber-200">
                      Falta configurar el apiTokenInstance para Green-API ({salesConnectedPhone})
                    </p>
                    <p className="text-amber-200/80 leading-relaxed">
                      O cambia al <strong>Motor Directo Sin Límites</strong> para conectar por QR sin tokens ni cuotas mensuales.
                    </p>
                  </>
                ) : isQuota466Error ? (
                  <>
                    <p className="font-extrabold text-rose-200">
                      Límite de Plan DEVELOPER en Green-API (HTTP 466) {latestErrorLog?.phone ? `• Número afectado: ${latestErrorLog.phone}` : ''}
                    </p>
                    <p className="text-rose-200/85 leading-relaxed">
                      Green-API bloqueó este número nuevo. Cambia ahora mismo al <strong>Motor Directo Sin Límites</strong> con un clic.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-extrabold text-amber-200">
                      Alerta de entrega WhatsApp: {latestErrorLog?.status} {latestErrorLog?.phone ? `(${latestErrorLog.phone})` : ''}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleSwitchProvider('baileys');
                  setShowGreenPanel(true);
                  handleConnectBaileysQR(false);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <PlugZap className="w-3.5 h-3.5" />
                <span>Cambiar a Motor Directo Sin Límites</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Interactive Social Media Growth Catalog & S/ 10+ Combo Builder */}
      {showSocialCatalog && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-pink-500/35 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  Catálogo Oficial Redes Sociales — Pedidos & Combos desde S/ 10
                </h4>
                <p className="text-[11px] text-slate-400">
                  Haz clic en cualquier paquete para armar un pedido o <strong className="text-pink-300">Pack Inicio desde S/ 10</strong> (combinando 2 o más servicios en el mismo enlace o distintos).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SOCIAL_CATALOG.map(plat => (
                <button
                  key={plat.key}
                  onClick={() => setActiveSocialPlatform(plat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSocialPlatform === plat.key
                      ? 'bg-pink-600 text-white border-pink-500 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{plat.emoji}</span>
                  <span>{plat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Catalog Categories for Active Platform */}
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentSocialPlatform.categories.map(cat => (
                <div key={cat.name} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span>{currentSocialPlatform.emoji}</span>
                      <span>{cat.name}</span>
                    </h5>
                    {cat.combinableNote && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        {cat.combinableNote}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {cat.tiers.map(tier => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => addTierToCombo(currentSocialPlatform, cat.name, tier)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          tier.combinable
                            ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400 text-amber-100'
                            : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50 text-slate-200'
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-tight">{tier.label}</span>
                        <span className="font-mono text-xs font-extrabold text-emerald-400 shrink-0">
                          S/ {tier.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Live S/ 10+ Combo Builder Cart */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h5 className="text-xs font-extrabold text-white">🔥 Armador de Pack / Cotización</h5>
                    <p className="text-[10px] text-slate-400">Pedido mínimo S/ 10 por transacción</p>
                  </div>
                  {comboCart.length > 0 && (
                    <button
                      onClick={() => setComboCart([])}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Vaciar</span>
                    </button>
                  )}
                </div>

                {comboCart.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-500 space-y-1.5">
                    <p>Selecciona paquetes de TikTok, Instagram, Facebook o YouTube.</p>
                    <p className="text-cyan-400/80">Ej. YouTube 100 Likes (S/ 5) + 100 Vistas (S/ 5) = Pack Inicio S/ 10</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {comboCart.map(item => (
                      <div key={item.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{item.platform} • {item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.category} • S/ {item.price} c/u</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateComboQty(item.id, -1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-white w-4 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateComboQty(item.id, 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Total del Pedido:</span>
                  <span className="text-lg font-extrabold font-mono text-emerald-400">S/ {comboTotal}</span>
                </div>

                {comboCart.length > 0 && comboTotal < 10 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-relaxed">
                    💡 Llevas <strong>S/ {comboTotal}</strong>. Agrega otro servicio combinable (desde S/ 5 o S/ 6) para completar el <strong>Pack Inicio de S/ 10</strong>.
                  </div>
                )}

                {comboTotal >= 10 && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
                    ✅ Pack listo para activar por WhatsApp y cobrar con Yape/Plin.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={comboCart.length === 0}
                    onClick={handleCopyComboQuote}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{copiedComboQuote ? '¡Copiado!' : 'Copiar Cotización'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={comboTotal < 10}
                    onClick={handleRegisterComboAsLead}
                    className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Cliente CRM</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Official Payment Accounts Panel */}
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
                  El bot entrega estas cuentas automáticamente en WhatsApp cuando el cliente pulsa "Medios de Pago".
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

      {/* Collapsible Multi-Provider WhatsApp Hub for Line +51 929 327 654 */}
      {showGreenPanel && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/35 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Motor de Conexión WhatsApp — Digital MYK Lab ({salesConnectedPhone})
              </h4>
              <p className="text-xs text-slate-400">
                Elige la herramienta de conexión. Recomendado: <strong className="text-emerald-300">Motor Directo Sin Límites</strong> (gratis, sin límite de 3 chats).
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSwitchProvider('baileys')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
                  salesProvider === 'baileys'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <PlugZap className="w-3.5 h-3.5" />
                <span>Motor Directo (Sin Límites)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchProvider('cloud_api')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
                  salesProvider === 'cloud_api'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Meta Cloud API (Oficial)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchProvider('green_api')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
                  salesProvider === 'green_api'
                    ? 'bg-slate-700 text-white border-slate-600 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Green-API (Legacy)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DIRECT UNLIMITED ENGINE (BAILEYS) */}
          {salesProvider === 'baileys' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h5 className="font-extrabold text-white text-sm">Vinculación Directa Multi-Dispositivo</h5>
                    <p className="text-[11px] text-slate-400">
                      Responde a todos los números nuevos ilimitadamente con Texto + Encuesta Táctil.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0 ${
                      baileysStatus?.status === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : baileysStatus?.status === 'qr_ready' || baileysStatus?.status === 'pairing_ready'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {baileysStatus?.status === 'connected'
                      ? `🟢 Conectado (${baileysStatus.connectedPhone || salesConnectedPhone})`
                      : baileysStatus?.status === 'qr_ready'
                        ? '📱 Escanea el QR'
                        : baileysStatus?.status === 'pairing_ready'
                          ? '🔑 Código Listo'
                          : baileysStatus?.status === 'connecting'
                            ? '⏳ Conectando...'
                            : '⚪ Desconectado'}
                  </span>
                </div>

                {baileysStatus?.lastError && (
                  <p className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px]">
                    ⚠️ {baileysStatus.lastError}
                  </p>
                )}

                {baileysStatus?.status === 'qr_ready' && baileysStatus?.qrDataUrl && (
                  <div className="p-4 rounded-xl bg-white text-slate-900 flex flex-col items-center gap-2 max-w-xs mx-auto">
                    <img src={baileysStatus.qrDataUrl} alt="QR WhatsApp Digital MYK Lab" className="w-52 h-52" />
                    <p className="text-[11px] font-bold text-center text-slate-800">
                      WhatsApp → Dispositivos vinculados → Vincular un dispositivo
                    </p>
                  </div>
                )}

                {baileysStatus?.status === 'pairing_ready' && baileysStatus?.pairingCode && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/40 text-center space-y-2">
                    <p className="text-[11px] text-slate-300 font-semibold">
                      Ingresa este código de 8 dígitos en tu WhatsApp ({pairingPhoneInput}):
                    </p>
                    <p className="font-mono text-2xl font-extrabold tracking-widest text-cyan-300">
                      {baileysStatus.pairingCode}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      WhatsApp → Dispositivos vinculados → Vincular un dispositivo → <strong>Vincular con número de teléfono</strong>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={baileysLoading}
                    onClick={() => handleConnectBaileysQR(false)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{baileysStatus?.status === 'connected' ? 'Reconectar / Refrescar' : 'Generar QR para Escanear'}</span>
                  </button>

                  {baileysStatus?.status === 'connected' && (
                    <button
                      type="button"
                      disabled={baileysLoading}
                      onClick={() => handleDisconnectBaileys(true)}
                      className="px-3 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión / Cambiar Número</span>
                    </button>
                  )}
                </div>

                {baileysStatus?.status !== 'connected' && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="block text-slate-300 font-semibold">
                      O vincula sin escanear QR (Código de 8 dígitos en tu celular):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pairingPhoneInput}
                        onChange={(e) => setPairingPhoneInput(e.target.value)}
                        placeholder="51929327654"
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono"
                      />
                      <button
                        type="button"
                        disabled={baileysLoading}
                        onClick={handleConnectBaileysPairing}
                        className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Pedir Código</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-slate-300 font-semibold">Formato de Botones al Responder:</label>
                    <select
                      value={salesReplyMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'poll_and_text' | 'interactive' | 'text_only';
                        setSalesReplyMode(mode);
                        onUpdateSalesGreenApiConfig({ provider: 'baileys', replyMode: mode });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-semibold"
                    >
                      <option value="poll_and_text">Texto + Encuesta Táctil (Recomendado)</option>
                      <option value="text_only">Solo Texto + Opciones Numeradas (1, 2, 3)</option>
                    </select>
                  </div>

                  {baileysStatus?.hasSavedSession && (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-300 font-semibold">
                          Respaldo Permanente Render (<code className="text-cyan-300">SALES_WA_AUTH_B64</code>):
                        </span>
                        <button
                          type="button"
                          onClick={handleExportBaileysAuth}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Exportar Sesión Render
                        </button>
                      </div>
                      {exportedAuthB64 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={exportedAuthB64}
                            className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(exportedAuthB64);
                              setCopiedAuthB64(true);
                              setTimeout(() => setCopiedAuthB64(false), 1800);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold cursor-pointer"
                          >
                            {copiedAuthB64 ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Test Send + Live Logs */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <p className="font-bold text-slate-200">Probar Envío Real por Motor Directo (Sin Límites):</p>
                <form onSubmit={handleSendTest} className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+51 9..."
                    className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 font-mono"
                  />
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                  />
                  <button
                    type="submit"
                    disabled={testSending}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testSending ? '...' : 'Enviar'}</span>
                  </button>
                </form>
                {testResult && <p className="text-[11px] text-slate-300">{testResult}</p>}

                <div className="border-t border-slate-800 pt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tráfico en Vivo ({salesConnectedPhone})</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-[10px] font-mono">
                    {salesTrafficLogs.length === 0 ? (
                      <p className="text-slate-600">Sin eventos recientes en esta sesión.</p>
                    ) : (
                      salesTrafficLogs.slice(0, 10).map(log => (
                        <div key={log.id} className="flex items-start justify-between gap-2 text-slate-300 bg-slate-900/70 px-2 py-1 rounded">
                          <span className="truncate">{log.status} {log.phone ? `(${log.phone})` : ''} {log.text ? `• ${log.text}` : ''}</span>
                          <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: META WHATSAPP CLOUD API OFICIAL */}
          {salesProvider === 'cloud_api' && (
            <div className="space-y-4 text-xs">
              <form onSubmit={handleSaveGreenConfig} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number ID (Meta):</label>
                  <input
                    type="text"
                    value={cloudPhoneNumberId}
                    onChange={(e) => setCloudPhoneNumberId(e.target.value)}
                    placeholder="Ej: 123456789012345"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Permanent Access Token:</label>
                  <input
                    type="password"
                    value={cloudAccessToken}
                    onChange={(e) => setCloudAccessToken(e.target.value)}
                    placeholder="EAAG..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Verify Token (Webhook):</label>
                  <input
                    type="text"
                    value={cloudVerifyToken}
                    onChange={(e) => setCloudVerifyToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                  >
                    {saveSuccess ? '✓ Guardado' : 'Guardar Meta Cloud API'}
                  </button>
                </div>
              </form>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 font-semibold">Callback URL para Meta Developers:</span>
                  <p className="font-mono text-[11px] text-cyan-400 break-all">{cloudWebhookUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(cloudWebhookUrl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold shrink-0 cursor-pointer"
                >
                  Copiar Webhook Meta
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GREEN-API LEGACY */}
          {salesProvider === 'green_api' && (
            <>
              <div className="flex items-center justify-end">
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{diagnosing ? 'Verificando...' : 'Diagnóstico Instancia Green-API'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveGreenConfig} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número WhatsApp:</label>
                  <input
                    type="text"
                    value={salesConnectedPhone}
                    onChange={(e) => setSalesConnectedPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">idInstance:</label>
                  <input
                    type="text"
                    value={salesIdInstance}
                    onChange={(e) => handleIdInstanceChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">apiTokenInstance:</label>
                  <input
                    type="password"
                    value={salesApiTokenInstance}
                    onChange={(e) => setSalesApiTokenInstance(e.target.value)}
                    placeholder="Pega tu token aquí"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modo de Entrega (Botones):</label>
                  <select
                    value={salesReplyMode}
                    onChange={(e) => setSalesReplyMode(e.target.value as 'poll_and_text' | 'interactive' | 'text_only')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-semibold"
                  >
                    <option value="poll_and_text">Texto + Encuesta Táctil (100% Números Nuevos)</option>
                    <option value="interactive">Botones Interactivos (Android clásico)</option>
                    <option value="text_only">Solo Texto + Opciones Numeradas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Host API URL:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={salesApiUrl}
                      onChange={(e) => setSalesApiUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shrink-0 cursor-pointer"
                    >
                      {saveSuccess ? '✓' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Webhook Exclusivo Digital MYK Lab:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(salesWebhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 1800);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedWebhook ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-cyan-400 break-all">{salesWebhookUrl}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleSetWebhookUrl}
                      disabled={settingWebhook}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                    >
                      {settingWebhook ? 'Aplicando...' : '🔗 Aplicar Webhook'}
                    </button>
                    <button
                      onClick={handleActivateQueueMode}
                      disabled={queueModeLoading}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                    >
                      ⚡ Modo Cola Directo
                    </button>
                    <button
                      onClick={handleTogglePolling}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                    >
                      {isSalesPollingActive ? '⏸️ Pausar Polling' : '▶️ Reanudar Polling'}
                    </button>
                    <button
                      onClick={handleForcePoll}
                      disabled={forcePolling}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${forcePolling ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Ahora</span>
                    </button>
                  </div>
                  {(setWebhookResult || queueModeResult || pollResult) && (
                    <p className="text-[11px] text-emerald-300">{setWebhookResult || queueModeResult || pollResult}</p>
                  )}
                  {diagnoseResult && (
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                      <div>
                        Estado Instancia: <strong className="text-emerald-400">{diagnoseResult.stateInstance?.stateInstance || diagnoseResult.error || 'Desconocido'}</strong>
                        {diagnoseResult.settings?.tariff && (
                          <span className="ml-2 text-slate-400">• Plan: <strong className="text-amber-300">{diagnoseResult.settings.tariff}</strong></span>
                        )}
                      </div>
                      {Array.isArray(diagnoseResult.warnings) && diagnoseResult.warnings.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {diagnoseResult.warnings.map((w: string, i: number) => (
                            <p key={i} className="text-amber-300 text-[10px]">⚠️ {w}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <form onSubmit={handleSendTest} className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+51 9..."
                      className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 font-mono"
                    />
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                    <button
                      type="submit"
                      disabled={testSending}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>{testSending ? '...' : 'Enviar'}</span>
                    </button>
                  </form>
                  {testResult && <p className="text-[11px] text-slate-300">{testResult}</p>}

                  <div className="border-t border-slate-800 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tráfico en Vivo (+51 929 327 654)</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-[10px] font-mono">
                      {salesTrafficLogs.length === 0 ? (
                        <p className="text-slate-600">Sin eventos recientes en esta sesión.</p>
                      ) : (
                        salesTrafficLogs.slice(0, 8).map(log => (
                          <div key={log.id} className="flex items-start justify-between gap-2 text-slate-300 bg-slate-900/70 px-2 py-1 rounded">
                            <span className="truncate">{log.status} {log.phone ? `(${log.phone})` : ''} {log.text ? `• ${log.text}` : ''}</span>
                            <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
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

      {/* 5 Corporate Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg">🤖</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Desde S/ 350</span>
          </div>
          <h4 className="text-xs font-extrabold text-white">Chatbots IA 24/7</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Atención inmediata con botones y números en WhatsApp, leads calificados, agenda automática y lectura de comprobantes (Plan Emprendedor S/ 350 • Empresarial S/ 550).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg">📱</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">Desde S/ 750</span>
          </div>
          <h4 className="text-xs font-extrabold text-white">Apps a la Medida</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Panel de ventas del día, productos, pedidos, clientes, reportes y alertas en infraestructura GitHub + Render (PRO S/ 750 • Empresarial S/ 1,250).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-lg">🌐</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Desde S/ 290</span>
          </div>
          <h4 className="text-xs font-extrabold text-white">Webs Profesionales PRO</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ultrarrápidas en GitHub + Render, Certificado SSL 100%, SEO para Google y enlace WhatsApp (Landing S/ 290 • Corporativa S/ 450).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/35 via-slate-900 to-slate-900 border border-pink-500/40 space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-lg">📈</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">Desde S/ 10</span>
            </div>
            <h4 className="text-xs font-extrabold text-pink-200">Redes Sociales (S/ 10+)</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Seguidores, Likes, Vistas, Comentarios y En Vivo para TikTok, Instagram, Facebook y YouTube con combos desde S/ 10.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSocialCatalog(true)}
            className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-pink-600/25 hover:bg-pink-600/40 border border-pink-500/35 text-pink-200 text-[10px] font-bold cursor-pointer"
          >
            Abrir Catálogo & Armador S/ 10
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">🎁</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Oferta S/ 390</span>
          </div>
          <h4 className="text-xs font-extrabold text-amber-200">Asistente IA + Web GRATIS</h4>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Al implementar tu Asistente IA 24/7 (S/ 390) incluimos tu Sitio Web Profesional en GitHub + Render sin costo adicional, 99.9% Uptime y soporte continuo.
          </p>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddSalesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">💼 Nuevo Cliente — CRM PRO Digital MYK Lab</h4>
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
                    onChange={(e) => handleSelectNewLeadService(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Combo Asistente IA + Web Gratis">Combo IA + Web Gratis</option>
                    <option value="Chatbot IA 24/7">Chatbot IA 24/7</option>
                    <option value="Web Profesional PRO">Web Profesional PRO</option>
                    <option value="App a la Medida">App a la Medida</option>
                    <option value="Redes Sociales (S/ 10+)">Redes Sociales (S/ 10+)</option>
                    <option value="Crecimiento TikTok">Crecimiento TikTok</option>
                    <option value="Crecimiento Instagram">Crecimiento Instagram</option>
                    <option value="Crecimiento Facebook">Crecimiento Facebook</option>
                    <option value="Crecimiento YouTube">Crecimiento YouTube</option>
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
                    placeholder="ej. Constructora, Clínica"
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
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Datos Comerciales & Cobranza</h5>

                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-slate-400 mb-1">Servicio / Paquete:</label>
                    <select
                      value={activeSelectedLead.serviceInterest}
                      onChange={(e) => onUpdateSalesLead(activeSelectedLead.id, { serviceInterest: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                    >
                      <option value="Información General de Servicios">Información General</option>
                      <option value="Combo Asistente IA + Web Gratis">Combo IA + Web Gratis</option>
                      <option value="Chatbot IA 24/7">Chatbot IA 24/7</option>
                      <option value="Web Profesional PRO">Web Profesional PRO</option>
                      <option value="App a la Medida">App a la Medida</option>
                      <option value="Redes Sociales (S/ 10+)">Redes Sociales (S/ 10+)</option>
                      <option value="Crecimiento TikTok">Crecimiento TikTok</option>
                      <option value="Crecimiento Instagram">Crecimiento Instagram</option>
                      <option value="Crecimiento Facebook">Crecimiento Facebook</option>
                      <option value="Crecimiento YouTube">Crecimiento YouTube</option>
                    </select>
                  </div>
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
