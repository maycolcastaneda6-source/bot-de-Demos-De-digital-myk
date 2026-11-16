import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.DISABLE_HMR ? 3000 : (Number(process.env.PORT) || 3000);

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini SDK with telemetry header and fallback
let aiClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getAiClient(): GoogleGenAI | null {
  const currentKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!currentKey) return null;
  
  if (!aiClient || lastApiKey !== currentKey) {
    lastApiKey = currentKey;
    aiClient = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function generateAiText(prompt: string): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) return null;

  const modelsToTry = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err: any) {
      console.warn(`[Gemini Try Model ${modelName} failed]:`, err?.message || err);
    }
  }
  return null;
}

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), aiReady: !!(process.env.GEMINI_API_KEY?.trim()) });
});

// Endpoint: AI Smart Reply / Autonomous Bot Response
app.post("/api/ai/chat-reply", async (req, res) => {
  try {
    const { 
      messages, 
      channel, 
      contactName, 
      systemPrompt, 
      knowledgeBase, 
      agentRole = "bot",
      tone = "profesional y amigable" 
    } = req.body;

    const ai = getAiClient();
    if (!ai) {
      // Graceful fallback if API key is not yet set in environment
      return res.json({
        reply: `¡Hola ${contactName || ""}! Gracias por comunicarte con nosotros a través de ${channel || "nuestras redes"}. Hemos recibido tu mensaje y un asesor especializado te atenderá en breve. ¿En qué más podemos ayudarte hoy?`,
        source: "fallback_rule",
        suggestedActions: ["Ver catálogo", "Hablar con asesor", "Horarios de atención"]
      });
    }

    const conversationHistory = (messages || [])
      .slice(-10)
      .map((m: any) => `${m.sender === "user" || m.sender === "customer" ? (contactName || "Cliente") : "Asistente"}: ${m.text}`)
      .join("\n");

    const prompt = `Eres el asistente inteligente de atención al cliente y ventas omnicanal para una empresa.
Canal de comunicación: ${channel || "WhatsApp / Red Social"}
Cliente: ${contactName || "Usuario"}
Tono de comunicación: ${tone}
Rol: ${agentRole === "copilot" ? "Generar sugerencia de respuesta para el agente humano" : "Respuesta directa y automática al cliente"}

BASE DE CONOCIMIENTO DE LA EMPRESA:
${knowledgeBase || "Empresa de comercio y servicios. Horario: Lun-Sáb 8am-8pm. Envíos nacionales en 24-48h. Métodos de pago: Tarjeta, Transferencia, Efectivo contraentrega."}

INSTRUCCIONES ESPECÍFICAS DEL NEGOCIO:
${systemPrompt || "Sé cortés, conciso, empático y orientado a resolver la duda o guiar a la compra. Si el cliente solicita precios o catálogo, ofrece opciones claras. Si solicita hablar con un humano, indícale amablemente que transferirás la conversación."}

HISTORIAL DE LA CONVERSACIÓN:
${conversationHistory}

Genera la respuesta más adecuada, natural y personalizada. Responde en el mismo idioma del cliente (español por defecto). No uses markdown excesivo si el canal es WhatsApp/SMS, mantén emojis pertinentes.`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
    });

    const reply = response.text?.trim() || "Hola, ¿en qué podemos ayudarte?";

    res.json({
      reply,
      source: "gemini-4-hydrogen",
      status: "success"
    });
  } catch (error: any) {
    console.error("Error in /api/ai/chat-reply:", error);
    res.status(500).json({
      error: error.message || "Error al procesar la respuesta con IA",
      reply: "Hola, gracias por tu mensaje. Un asesor te responderá a la brevedad."
    });
  }
});

// Endpoint: AI Lead Analyzer (Sentiment, Lead Score, Buying Intent, Tags, Summary)
app.post("/api/ai/analyze-lead", async (req, res) => {
  try {
    const { messages, contactInfo } = req.body;

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        sentiment: "neutral",
        leadScore: 65,
        intent: "Consulta General",
        urgency: "media",
        suggestedTags: ["Interesado", "WhatsApp"],
        summary: "Cliente solicitando información sobre productos y servicios.",
        recommendedStage: "Calificado"
      });
    }

    const conversationText = (messages || [])
      .map((m: any) => `${m.sender === "user" || m.sender === "customer" ? "Cliente" : "Agente"}: ${m.text}`)
      .join("\n");

    const prompt = `Analiza la siguiente conversación de un cliente en CRM de mensajería omnicanal:
${conversationText}

Información actual del contacto:
${JSON.stringify(contactInfo || {})}

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "sentiment": "positivo" | "neutral" | "negativo" | "urgente",
  "leadScore": (número entero entre 0 y 100, donde 100 es altísima intención de compra),
  "intent": "(ej: Consulta de Precios, Soporte Técnico, Reclamo, Intención de Compra Inmediata, Seguimiento de Envío)",
  "urgency": "alta" | "media" | "baja",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "summary": "(Resumen conciso de 1-2 oraciones del estado y necesidad del cliente)",
  "recommendedStage": "Prospecto" | "Calificado" | "Propuesta" | "Negociación" | "Cerrado Ganado" | "Soporte"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/ai/analyze-lead:", error);
    res.json({
      sentiment: "neutral",
      leadScore: 60,
      intent: "Consulta",
      urgency: "media",
      suggestedTags: ["Lead"],
      summary: "Interacción registrada.",
      recommendedStage: "Prospecto"
    });
  }
});

// Endpoint: AI Text Enhancer / Translator / Tone Adjuster for Agents
app.post("/api/ai/enhance-text", async (req, res) => {
  try {
    const { text, action, targetLanguage } = req.body;

    const ai = getAiClient();
    if (!ai) {
      return res.json({ enhancedText: text });
    }

    let instruction = "";
    if (action === "improve_tone") {
      instruction = "Reescribe el siguiente borrador de mensaje para que suene altamente profesional, empático, claro y persuasivo para atención al cliente:";
    } else if (action === "make_concise") {
      instruction = "Haz el siguiente mensaje más breve, directo y fácil de leer en un chat rápido de WhatsApp/Instagram:";
    } else if (action === "translate") {
      instruction = `Traduce con precisión y tono natural de mensajería comercial el siguiente texto al idioma: ${targetLanguage || "inglés"}:`;
    } else if (action === "formal") {
      instruction = "Reescribe el mensaje con un tono formal, elegante y respetuoso para clientes VIP o corporativos:";
    } else if (action === "friendly") {
      instruction = "Reescribe el mensaje con un tono cálido, cercano, alegre y moderno con emojis adecuados:";
    } else {
      instruction = "Mejora la redacción y ortografía de este mensaje para atención al cliente:";
    }

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `${instruction}\n\n"${text}"\n\nDevuelve únicamente el texto mejorado sin comentarios adicionales ni comillas.`,
    });

    res.json({ enhancedText: response.text?.trim() || text });
  } catch (error: any) {
    console.error("Error in /api/ai/enhance-text:", error);
    res.json({ enhancedText: req.body.text });
  }
});

// In-memory demo states and Green-API configuration (Line 1: Demos + Line 2: Digital MYK Lab Ventas)
interface GreenApiConfigState {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
  connectedPhone: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastPing?: string;
  lastWebhookReceived?: string;
  pollingEnabled?: boolean;
  autoRespondAll?: boolean;
}

const GREEN_CONFIG_PATH = path.join(process.cwd(), "green_api_store.json");
const SALES_GREEN_CONFIG_PATH = path.join(process.cwd(), "sales_green_api_store.json");

function loadStoredJsonConfig(filePath: string): Partial<GreenApiConfigState> {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`Could not read stored green config (${filePath}):`, e);
  }
  return {};
}

function saveStoredJsonConfig(filePath: string, cfg: GreenApiConfigState) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (e) {
    console.warn(`Could not save green config (${filePath}) to disk:`, e);
  }
}

const storedConfig = loadStoredJsonConfig(GREEN_CONFIG_PATH);
const storedSalesConfig = loadStoredJsonConfig(SALES_GREEN_CONFIG_PATH);

let greenApiConfig: GreenApiConfigState = {
  idInstance: storedConfig.idInstance || process.env.GREEN_API_ID_INSTANCE || "710722724819",
  apiTokenInstance: storedConfig.apiTokenInstance || process.env.GREEN_API_TOKEN || "",
  apiUrl: storedConfig.apiUrl || process.env.GREEN_API_URL || "https://7107.api.greenapi.com",
  connectedPhone: storedConfig.connectedPhone || "+51 986 150 562",
  status: "connected",
  lastPing: new Date().toISOString(),
  pollingEnabled: storedConfig.pollingEnabled !== undefined ? storedConfig.pollingEnabled : true
};

let salesGreenApiConfig: GreenApiConfigState = {
  idInstance: storedSalesConfig.idInstance || process.env.SALES_GREEN_API_ID_INSTANCE || "",
  apiTokenInstance: storedSalesConfig.apiTokenInstance || process.env.SALES_GREEN_API_TOKEN || "",
  apiUrl: storedSalesConfig.apiUrl || process.env.SALES_GREEN_API_URL || "https://api.greenapi.com",
  connectedPhone: storedSalesConfig.connectedPhone || "+51 929 327 654",
  status: (storedSalesConfig.idInstance && storedSalesConfig.apiTokenInstance) ? "connected" : "disconnected",
  lastPing: new Date().toISOString(),
  pollingEnabled: storedSalesConfig.pollingEnabled !== undefined ? storedSalesConfig.pollingEnabled : true,
  autoRespondAll: storedSalesConfig.autoRespondAll !== undefined ? storedSalesConfig.autoRespondAll : true
};

// In-memory activity log for Green-API (supports both lines)
interface GreenApiLogEntry {
  id: string;
  timestamp: string;
  line?: 'demos' | 'sales';
  type: 'incoming_webhook' | 'outgoing_send' | 'error' | 'diagnostic';
  sender?: string;
  phone?: string;
  text?: string;
  status: string;
  details?: any;
}

const greenApiLogs: GreenApiLogEntry[] = [];
const salesGreenApiLogs: GreenApiLogEntry[] = [];

function addGreenApiLog(entry: Omit<GreenApiLogEntry, 'id' | 'timestamp'>, targetLine: 'demos' | 'sales' = 'demos') {
  const fullEntry: GreenApiLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    line: targetLine,
    ...entry
  };
  if (targetLine === 'sales') {
    salesGreenApiLogs.unshift(fullEntry);
    if (salesGreenApiLogs.length > 50) salesGreenApiLogs.pop();
  } else {
    greenApiLogs.unshift(fullEntry);
    if (greenApiLogs.length > 50) greenApiLogs.pop();
  }
}

function getGreenApiBaseUrl(idInstance: string, customApiUrl?: string): string {
  const custom = (customApiUrl || "").trim().replace(/\/+$/, "");
  if (custom && custom.startsWith("http")) {
    return custom;
  }
  const cleanId = (idInstance || "").trim();
  if (cleanId.length >= 4) {
    const prefix = cleanId.slice(0, 4);
    return `https://${prefix}.api.greenapi.com`;
  }
  return "https://api.greenapi.com";
}

function getGreenApiUrl(idInstance: string, apiTokenInstance: string, method: string, customApiUrl?: string): string {
  const baseUrl = getGreenApiBaseUrl(idInstance, customApiUrl);
  return `${baseUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`;
}

// Global Poller & Processor for Green-API incoming queue (bypasses webhook delivery blocks)
let isPollingCurrently = false;
async function fetchAndProcessSingleNotification(): Promise<boolean> {
  const id = (greenApiConfig.idInstance || "").trim();
  const token = (greenApiConfig.apiTokenInstance || "").trim();
  if (!id || !token) return false;

  const baseUrl = getGreenApiBaseUrl(id, greenApiConfig.apiUrl);
  const receiveUrl = `${baseUrl}/waInstance${id}/receiveNotification/${token}`;

  try {
    const res = await fetch(receiveUrl, { method: "GET" });
    if (!res.ok) return false;

    const data: any = await res.json().catch(() => null);
    if (!data || !data.receiptId) return false;

    const receiptId = data.receiptId;
    const body = data.body || {};
    const typeWebhook = body.typeWebhook || "";

    console.log(`[Green-API Received Notification ${receiptId}]:`, typeWebhook);

    if (typeWebhook === "incomingMessageReceived" || body.messageData) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const rawSender = senderData.sender || senderData.chatId || "";
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Cliente WhatsApp";

      let textMessage = "";
      if (messageData.typeMessage === "textMessage") {
        textMessage = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        textMessage = messageData.extendedTextMessageData?.text || "";
      } else if (messageData.typeMessage === "quotedMessage") {
        textMessage = messageData.extendedTextMessageData?.text || messageData.quotedMessage?.text || "";
      } else if (typeof messageData.textMessage === "string") {
        textMessage = messageData.textMessage;
      }

      addGreenApiLog({
        type: 'incoming_webhook',
        phone: senderPhone,
        sender: senderName,
        text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
        status: textMessage ? '📥 Mensaje Recibido (Auto-Receiver)' : 'ℹ️ Mensaje Multimedia',
        details: body
      });

      if (textMessage && senderPhone) {
        console.log(`[Auto-Receiver Processing] De: ${senderName} (${senderPhone}): "${textMessage}"`);
        await processDemoMessage(senderPhone, senderName, textMessage);
      }
    }

    // Always delete the notification from Green-API queue once handled
    const deleteUrl = `${baseUrl}/waInstance${id}/deleteNotification/${token}/${receiptId}`;
    await fetch(deleteUrl, { method: "DELETE" }).catch(() => {});
    return true;
  } catch (err: any) {
    console.warn("[Green-API Polling Fetch Error]:", err.message);
    return false;
  }
}

async function runGreenApiDrainBatch(maxItems = 10): Promise<number> {
  if (isPollingCurrently) return 0;
  isPollingCurrently = true;
  let processed = 0;
  try {
    for (let i = 0; i < maxItems; i++) {
      const hadItem = await fetchAndProcessSingleNotification();
      if (!hadItem) break;
      processed++;
    }
  } finally {
    isPollingCurrently = false;
  }
  return processed;
}

// Background auto-polling worker for Line 1 (Demos: +51 986 150 562)
setInterval(() => {
  if (greenApiConfig.pollingEnabled && greenApiConfig.idInstance && greenApiConfig.apiTokenInstance) {
    runGreenApiDrainBatch(5).catch(() => {});
  }
}, 1500);

// Global Poller & Processor for Line 2 (Digital MYK Lab Ventas: +51 929 327 654)
let isSalesPollingCurrently = false;
async function fetchAndProcessSalesNotification(): Promise<boolean> {
  const id = (salesGreenApiConfig.idInstance || "").trim();
  const token = (salesGreenApiConfig.apiTokenInstance || "").trim();
  if (!id || !token) return false;

  const baseUrl = getGreenApiBaseUrl(id, salesGreenApiConfig.apiUrl);
  const receiveUrl = `${baseUrl}/waInstance${id}/receiveNotification/${token}`;

  try {
    const res = await fetch(receiveUrl, { method: "GET" });
    if (!res.ok) return false;

    const data: any = await res.json().catch(() => null);
    if (!data || !data.receiptId) return false;

    const receiptId = data.receiptId;
    const body = data.body || {};
    const typeWebhook = body.typeWebhook || "";

    if (typeWebhook === "incomingMessageReceived" || body.messageData) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const rawSender = senderData.sender || senderData.chatId || "";
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Prospecto WhatsApp";

      let textMessage = "";
      if (messageData.typeMessage === "textMessage") {
        textMessage = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        textMessage = messageData.extendedTextMessageData?.text || "";
      } else if (messageData.typeMessage === "quotedMessage") {
        textMessage = messageData.extendedTextMessageData?.text || messageData.quotedMessage?.text || "";
      } else if (typeof messageData.textMessage === "string") {
        textMessage = messageData.textMessage;
      }

      addGreenApiLog({
        type: 'incoming_webhook',
        phone: senderPhone,
        sender: senderName,
        text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
        status: textMessage ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : 'ℹ️ Mensaje Multimedia',
        details: body
      }, 'sales');

      if (textMessage && senderPhone) {
        console.log(`[Sales Line Auto-Receiver] De: ${senderName} (${senderPhone}): "${textMessage}"`);
        await processDigitalMykSalesMessage(senderPhone, senderName, textMessage);
      }
    }

    const deleteUrl = `${baseUrl}/waInstance${id}/deleteNotification/${token}/${receiptId}`;
    await fetch(deleteUrl, { method: "DELETE" }).catch(() => {});
    return true;
  } catch (err: any) {
    console.warn("[Sales Green-API Polling Error]:", err.message);
    return false;
  }
}

async function runSalesGreenApiDrainBatch(maxItems = 10): Promise<number> {
  if (isSalesPollingCurrently) return 0;
  isSalesPollingCurrently = true;
  let processed = 0;
  try {
    for (let i = 0; i < maxItems; i++) {
      const hadItem = await fetchAndProcessSalesNotification();
      if (!hadItem) break;
      processed++;
    }
  } finally {
    isSalesPollingCurrently = false;
  }
  return processed;
}

// Background auto-polling worker for Line 2 (Ventas Digital MYK Lab: +51 929 327 654)
setInterval(() => {
  if (salesGreenApiConfig.pollingEnabled && salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) {
    runSalesGreenApiDrainBatch(5).catch(() => {});
  }
}, 1500);

// In-memory session tracking for WhatsApp phone numbers
interface SessionState {
  chatId: string;
  phone: string;
  name: string;
  currentDemo: 'menu' | 'dental' | 'beauty';
  dentalStep?: 'treatment_select' | 'patient_info' | 'completed';
  selectedTreatment?: string;
  beautyStep?: 'service_select' | 'details' | 'completed';
  beautyService?: string;
  beautyPrice?: number;
  beautyClientName?: string;
  beautyDateTime?: string;
  isBookingCompleted?: boolean;
  history: Array<{ sender: 'user' | 'bot'; text: string; timestamp: string }>;
  lastActivity: string;
}

const userSessions = new Map<string, SessionState>();

// Disk persistence for appointments
const APPOINTMENTS_STORAGE_PATH = path.join(process.cwd(), "appointments-store.json");

function loadStoredAppointments() {
  try {
    if (fs.existsSync(APPOINTMENTS_STORAGE_PATH)) {
      const raw = fs.readFileSync(APPOINTMENTS_STORAGE_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.dentalAppointments)) dentalAppointments = data.dentalAppointments;
      if (Array.isArray(data.beautyAppointments)) beautyAppointments = data.beautyAppointments;
    }
  } catch (e) {
    console.warn("Could not load stored appointments:", e);
  }
}

function saveStoredAppointments() {
  try {
    fs.writeFileSync(APPOINTMENTS_STORAGE_PATH, JSON.stringify({
      dentalAppointments,
      beautyAppointments
    }, null, 2));
  } catch (e) {
    console.warn("Could not save stored appointments:", e);
  }
}

// In-memory appointments list for live synchronization
let dentalAppointments: any[] = [
  {
    id: 'dent_1',
    registrationDate: '27/08 08:15 AM',
    patientName: 'Carlos Mendoza',
    whatsapp: '+51 987654321',
    treatment: 'Limpieza Dental',
    requestedDateTime: '28/08 - 4:00 PM',
    status: '🟢 Nueva Cita',
    notes: 'Registrado automáticamente vía Bot WhatsApp Esencial'
  },
  {
    id: 'dent_2',
    registrationDate: '27/08 09:30 AM',
    patientName: 'Lucía Castro',
    whatsapp: '+51 912345678',
    treatment: 'Evaluación Ortodoncia',
    requestedDateTime: '29/08 - 10:00 AM',
    status: '🟡 Confirmado',
    notes: 'Confirmado por recepción para Dr. Ramírez'
  },
  {
    id: 'dent_3',
    registrationDate: '27/08 11:45 AM',
    patientName: 'Roberto Sánchez',
    whatsapp: '+51 955443322',
    treatment: 'Blanqueamiento',
    requestedDateTime: '27/08 - 6:00 PM',
    status: '🔵 Atendido',
    notes: 'Tratamiento completado con éxito'
  }
];

let beautyAppointments: any[] = [
  {
    id: 'bt_1',
    date: '27/08 10:30 AM',
    clientName: 'Valeria Morales',
    whatsapp: '+51 977112233',
    service: 'Manicure Acrílica',
    amount: 60,
    dateTimeRequested: '28/08 - 3:00 PM',
    status: 'Por Confirmar',
    stylist: 'Mía Recepción IA',
    notes: 'Diseño baby boomer solicitado en chat'
  },
  {
    id: 'bt_2',
    date: '27/08 11:15 AM',
    clientName: 'Andrea Benítez',
    whatsapp: '+51 966223344',
    service: 'Alisado con Queratina',
    amount: 180,
    dateTimeRequested: '28/08 - 5:00 PM',
    status: 'Por Confirmar',
    stylist: 'Mía Recepción IA',
    notes: 'Cabello largo, promo tratamiento intensivo'
  },
  {
    id: 'bt_3',
    date: '27/08 09:00 AM',
    clientName: 'Sofía Paredes',
    whatsapp: '+51 944556677',
    service: 'Pedicure Spa',
    amount: 45,
    dateTimeRequested: '27/08 - 11:00 AM',
    status: 'En Atención',
    stylist: 'Gabriela (Especialista)',
    notes: 'En cabina 2 de reflexología'
  },
  {
    id: 'bt_4',
    date: '26/08 04:00 PM',
    clientName: 'Camila Vega',
    whatsapp: '+51 933889900',
    service: 'Corte de Cabello + Cepillado',
    amount: 50,
    dateTimeRequested: '26/08 - 5:30 PM',
    status: 'Finalizado / Pagado',
    stylist: 'Valeria Estilista',
    notes: 'Pago con Yape completado S/ 50'
  }
];

// Disk persistence for sales leads (Line 2: +51 929 327 654)
const SALES_LEADS_STORAGE_PATH = path.join(process.cwd(), "sales-leads-store.json");

let salesLeads: any[] = [
  {
    id: 'lead_1',
    registrationDate: 'Hoy 09:15 AM',
    clientName: 'Jorge Paredes',
    whatsapp: '+51 945112233',
    serviceInterest: 'Combo Asistente IA + Web Gratis',
    businessType: 'Clínica Dental',
    lastMessage: 'Vi el anuncio de asistente IA + web gratis, quiero info',
    status: '🔥 Nuevo Lead',
    notes: 'Atendido automáticamente por Bot Comercial Digital MYK Lab'
  },
  {
    id: 'lead_2',
    registrationDate: 'Hoy 11:40 AM',
    clientName: 'Mariana Quispe',
    whatsapp: '+51 981223344',
    serviceInterest: 'App a la Medida',
    businessType: 'Tienda de Pedidos / Delivery',
    lastMessage: 'Necesito una app para gestionar pedidos de mi negocio',
    status: '💬 En Asesoría',
    notes: 'Solicitó demostración de panel de pedidos y reportes'
  }
];

function loadStoredSalesLeads() {
  try {
    if (fs.existsSync(SALES_LEADS_STORAGE_PATH)) {
      const raw = fs.readFileSync(SALES_LEADS_STORAGE_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.salesLeads)) salesLeads = data.salesLeads;
    }
  } catch (e) {
    console.warn("Could not load stored sales leads:", e);
  }
}

function saveStoredSalesLeads() {
  try {
    fs.writeFileSync(SALES_LEADS_STORAGE_PATH, JSON.stringify({ salesLeads }, null, 2));
  } catch (e) {
    console.warn("Could not save stored sales leads:", e);
  }
}

loadStoredAppointments();
loadStoredSalesLeads();

// Session tracking for Line 2: Digital MYK Lab Commercial Sales (+51 929 327 654)
interface SalesSessionState {
  chatId: string;
  phone: string;
  name: string;
  serviceInterest: string;
  businessType?: string;
  history: Array<{ sender: 'user' | 'bot'; text: string; timestamp: string }>;
  lastActivity: string;
}

const salesSessions = new Map<string, SalesSessionState>();

function detectDigitalMykServiceIntent(lowerText: string): string {
  if (lowerText.includes("gratis") || lowerText.includes("oferta") || lowerText.includes("combo") || lowerText.includes("promo") || lowerText.includes("pack")) {
    return "Combo Asistente IA + Web Gratis";
  }
  if (lowerText.includes("app") || lowerText.includes("aplicacion") || lowerText.includes("aplicación") || lowerText.includes("movil") || lowerText.includes("móvil") || lowerText.includes("android") || lowerText.includes("ios") || lowerText.includes("sistema")) {
    return "App a la Medida";
  }
  if (lowerText.includes("chatbot") || lowerText.includes("bot") || lowerText.includes("ia") || lowerText.includes("inteligencia") || lowerText.includes("whatsapp") || lowerText.includes("automatiz") || lowerText.includes("asistente")) {
    return "Chatbot IA 24/7";
  }
  if (lowerText.includes("web") || lowerText.includes("pagina") || lowerText.includes("página") || lowerText.includes("sitio") || lowerText.includes("landing") || lowerText.includes("seo") || lowerText.includes("vercel")) {
    return "Página Web Profesional";
  }
  return "Información General de Servicios";
}

function buildProFallbackSalesReply(cleanText: string, senderName: string, isFirstMessage: boolean, detectedService: string): string {
  const lower = cleanText.toLowerCase();
  const greetingName = (senderName && senderName !== "Prospecto WhatsApp" && senderName !== "Cliente") ? ` ${senderName}` : "";

  if (lower === "1" || detectedService === "Chatbot IA 24/7") {
    return `¡Excelente elección${greetingName}! 🤖🚀 En *Digital MYK Lab* desarrollamos *Chatbots y Asistentes con Inteligencia Artificial 24/7* que trabajan por tu negocio todo el día:

✅ *Atención inmediata 24/7:* Responde a tus clientes en menos de 1 minuto sin perder ventas.
✅ *Genera Leads Calificados:* Convierte cada conversación en oportunidades reales.
✅ *Agenda Citas Automáticamente:* Sincroniza reservas directo con tu calendario, Google Sheets o CRM.
✅ *Integración Total:* WhatsApp, Instagram, Messenger, Shopify y HubSpot.

🎁 *Bono Activo:* Al implementar tu *Asistente IA 24/7*, te llevas tu *Sitio Web Profesional TOTALMENTE GRATIS* _(consultar por dominio/hosting externo)_.

Para recomendarte el plan ideal, cuéntame: *¿De qué rubro es tu negocio y cuántas consultas recibes al día aproximadamente?* 💬✨`;
  }

  if (lower === "2" || detectedService === "App a la Medida") {
    return `¡Genial${greetingName}! 📱✨ En *Digital MYK Lab* creamos *la App hecha a la medida que tu negocio necesita* para que tengas tu empresa en la palma de la mano:

🚀 *Funcionalidades clave que incluimos:*
• Panel de ventas en tiempo real y reportes inteligentes.
• Gestión de productos, pedidos, catálogo y clientes.
• Notificaciones automáticas y seguimiento de entregas.
• *Seguras, rápidas y escalables* con tecnología de vanguardia.

🛡️ Además cuentas con *Asesoría Gratuita*, entrega a tiempo y soporte continuo.

Cuéntame brevemente: *¿Qué procesos o ventas te gustaría controlar desde tu propia App?* 📲`;
  }

  if (lower === "3" || detectedService === "Página Web Profesional") {
    return `¡Perfecto${greetingName}! 🌐⚡ En *Digital MYK Lab* diseñamos *Páginas Web Profesionales de Alto Rendimiento* pensadas para convertir visitas en clientes:

💎 *¿Qué incluye nuestro desarrollo web?*
• *Tecnología de Punta:* Código limpio alojado en servidores de altísimo rendimiento (carga en milisegundos).
• *Máxima Seguridad:* Certificado SSL 100% incluido 🔒.
• *SEO de Alto Impacto:* Estructura optimizada para posicionar tu marca en Google 📈.
• *Botón directo a WhatsApp* para cerrar ventas al instante.

🔗 Puedes ver nuestro portafolio en: https://digitalmyklab.vercel.app/

*¿Tu negocio ya cuenta con dominio/web actual o empezaríamos desde cero?* 🚀`;
  }

  if (lower === "4" || detectedService === "Combo Asistente IA + Web Gratis") {
    return `🔥 *¡Has elegido nuestra Oferta Estrella${greetingName}!* 🎁✨

Al adquirir tu *Asistente Virtual con Inteligencia Artificial 24/7* en *Digital MYK Lab*, te llevas tu *Sitio Web Profesional TOTALMENTE GRATIS* _(consultar por hosting/dominio externos)_.

⚡ *Con este ecosistema completo obtienes:*
1️⃣ *Asistente IA 24/7:* Responde en < 1 minuto, califica clientes y agenda citas automáticamente.
2️⃣ *Sitio Web Profesional GRATIS:* Diseño moderno, SSL de seguridad, optimizado para Google y conectado a tu WhatsApp.
3️⃣ *99.9% Uptime y Soporte 24/7/365* con garantía real.

¿De qué rubro es tu empresa o emprendimiento para enviarte una propuesta a medida hoy mismo? 🚀💼`;
  }

  // Default immediate response to ANY word/greeting on +51 929 327 654
  return `¡Hola${greetingName}! 👋 Bienvenido a *Digital MYK Lab* — _Seguridad y Garantía_ 🛡️🚀

Gracias por comunicarte con nosotros. Ayudamos a empresas y emprendedores a *automatizar sus ventas y multiplicar sus clientes* con tecnología de vanguardia:

1️⃣ *Chatbots & Asistentes IA 24/7* 🤖
   _Atención inmediata, calificación de leads y agendamiento automático de citas._

2️⃣ *Páginas Web Profesionales* 🌐
   _Carga ultrarrápida, Certificado SSL incluido, SEO para Google y diseño enfocado en ventas._

3️⃣ *Aplicaciones Móviles / Web a la Medida* 📱
   _Controla ventas, pedidos, clientes y reportes en tiempo real desde cualquier lugar._

4️⃣ *🎁 OFERTA ESPECIAL:* *Asistente IA 24/7 + Sitio Web Profesional GRATIS* 🔥

🔗 Portafolio: https://digitalmyklab.vercel.app/

Cuéntame, *¿cuál de estas soluciones te interesa potenciar y de qué trata tu negocio?* (También puedes responder *1, 2, 3 o 4* para darte detalles al instante) 👇✨`;
}

// Core Engine for Line 2 (+51 929 327 654): Responds IMMEDIATELY to ANY incoming word/message
async function processDigitalMykSalesMessage(phone: string, senderName: string, text: string) {
  const cleanText = (text || "").trim() || "Hola";
  const lowerText = cleanText.toLowerCase();

  const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`;
  const sessionKey = formattedPhone.replace(/[^0-9]/g, "");

  let session = salesSessions.get(sessionKey);
  const isFirstMessage = !session || session.history.length === 0;

  if (!session) {
    session = {
      chatId: sessionKey,
      phone: formattedPhone,
      name: senderName || "Prospecto WhatsApp",
      serviceInterest: "Información General",
      history: [],
      lastActivity: new Date().toISOString()
    };
    salesSessions.set(sessionKey, session);
  }

  if (senderName && senderName !== "Prospecto WhatsApp" && senderName !== "Cliente") {
    session.name = senderName;
  }

  const detectedService = detectDigitalMykServiceIntent(lowerText);
  if (detectedService !== "Información General de Servicios" || isFirstMessage) {
    session.serviceInterest = detectedService;
  }

  let botReply = "";
  let capturedLeadData: any = null;

  const historyText = session.history
    .slice(-8)
    .map(h => `${h.sender === 'user' ? 'Prospecto' : 'Asesor Digital MYK Lab'}: ${h.text}`)
    .join("\n");

  // Always respond immediately and professionally on ANY incoming text
  const salesPrompt = `Eres el Asesor Comercial Senior de "Digital MYK Lab" (Slogan: "Seguridad y Garantía | Innova. Automatiza. Convierte.").
Tu canal oficial de WhatsApp comercial es +51 929 327 654.
Web oficial: https://digitalmyklab.vercel.app/
Correo: compumasster@gmail.com

PORTAFOLIO OFICIAL DE SERVICIOS DE DIGITAL MYK LAB:
1. Chatbots & Automatización con Inteligencia Artificial 24/7:
   - Atención inmediata 24/7 (< 1 minuto de respuesta), generación de leads calificados, agendamiento automático de citas, sincronización con Google Sheets / CRM, integración con WhatsApp, Instagram, Messenger, Shopify y HubSpot.
2. Páginas Web Profesionales de Alto Rendimiento:
   - Código limpio a medida, servidores de altísimo rendimiento (Vercel + GitHub), carga en milisegundos, Certificado SSL incluido, SEO de alto impacto para posicionar en Google y diseño enfocado en convertir visitas en clientes.
3. Desarrollo de Aplicaciones Móviles y Web Apps a la Medida:
   - Apps seguras, rápidas y escalables con panel de ventas, gestión de productos, pedidos, clientes, reportes y notificaciones en tiempo real. Incluye asesoría gratuita, entrega a tiempo y soporte continuo.
4. OFERTA ESTRELLA / COMBO IRRESISTIBLE:
   - "Consigue tu Asistente IA 24/7 y llévate tu Sitio Web Profesional TOTALMENTE GRATIS" (*consultar por hosting/dominio externos*). Incluye 99.9% Uptime y soporte real 24/7/365.

REGLAS DE RESPUESTA PRO:
1. Responde de INMEDIATO ante CUALQUIER palabra o mensaje que envíe el usuario, incluso si solo dice "hola", "info", ".", "precio", etc.
2. Mantén un tono ejecutivo, persuasivo, cercano, moderno y estructurado para WhatsApp (usa negritas *así*, viñetas claras y emojis estratégicos como 🚀, 🤖, 🌐, 📱, 🎁, 🛡️).
3. Si es el PRIMER mensaje o un saludo general, presenta de forma ordenada y atractiva los 4 servicios principales (destacando el Combo IA + Web Gratis) e invita al cliente a contar de qué trata su negocio o elegir qué servicio le interesa.
4. Si pregunta por un servicio específico (Chatbot, Web, App u Oferta), profundiza en sus beneficios de negocio, transmite confianza ("Seguridad y Garantía") y haz una pregunta de calificación (ej. rubro del negocio, qué necesita automatizar o si desea agendar una asesoría gratuita / demo).
5. No inventes precios cerrados falsos si no se han definido; enfócate en el valor, asesoría gratuita y cotización personalizada según el proyecto.
6. Al final de tu respuesta, si identificas el interés o rubro del cliente, agrega en una línea oculta al final:
[SALES_LEAD: {"clientName":"${session.name}", "serviceInterest":"...", "businessType":"...", "stage":"🔥 Nuevo Lead" | "💬 En Asesoría" | "📄 Cotizado"}]

Historial reciente:
${historyText || "(Primera interacción)"}

Mensaje actual del prospecto (${session.name} - ${formattedPhone}):
"${cleanText}"`;

  let rawAiReply = await generateAiText(salesPrompt);

  if (rawAiReply) {
    const leadMatch = rawAiReply.match(/\[SALES_LEAD:\s*(\{.*?\})\]/s);
    if (leadMatch) {
      try {
        capturedLeadData = JSON.parse(leadMatch[1]);
      } catch (e) {}
      rawAiReply = rawAiReply.replace(/\[SALES_LEAD:\s*\{.*?\}\]/gs, "").trim();
    }
    botReply = rawAiReply;
  } else {
    botReply = buildProFallbackSalesReply(cleanText, session.name, isFirstMessage, detectedService);
  }

  // Upsert Lead in salesLeads store so it appears immediately in the dashboard
  const leadIndex = salesLeads.findIndex(l => l.whatsapp.replace(/[^0-9]/g, "") === sessionKey);
  const serviceToSave = capturedLeadData?.serviceInterest || session.serviceInterest || detectedService;
  const businessToSave = capturedLeadData?.businessType || session.businessType || "Por calificar";
  const statusToSave = capturedLeadData?.stage || (leadIndex >= 0 ? "💬 En Asesoría" : "🔥 Nuevo Lead");

  const leadPayload = {
    id: leadIndex >= 0 ? salesLeads[leadIndex].id : `lead_${Date.now()}`,
    registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    clientName: capturedLeadData?.clientName || session.name || "Prospecto WhatsApp",
    whatsapp: formattedPhone,
    serviceInterest: serviceToSave,
    businessType: businessToSave,
    lastMessage: cleanText.slice(0, 120),
    status: statusToSave,
    notes: "Atendido automáticamente por Bot Comercial Digital MYK Lab (+51 929 327 654)"
  };

  if (leadIndex >= 0) {
    salesLeads[leadIndex] = { ...salesLeads[leadIndex], ...leadPayload };
  } else {
    salesLeads.unshift(leadPayload);
  }
  saveStoredSalesLeads();

  session.history.push({ sender: 'user', text: cleanText, timestamp: new Date().toISOString() });
  session.history.push({ sender: 'bot', text: botReply, timestamp: new Date().toISOString() });
  session.lastActivity = new Date().toISOString();

  // Send out via Line 2 Green-API if configured
  let greenApiSendStatus = "not_sent";
  if (salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance && sessionKey.length >= 7) {
    const cleanPhone = formattedPhone.replace(/[^0-9]/g, "");
    const chatId = `${cleanPhone}@c.us`;
    const targetUrl = getGreenApiUrl(salesGreenApiConfig.idInstance, salesGreenApiConfig.apiTokenInstance, "sendMessage", salesGreenApiConfig.apiUrl);

    try {
      const sendRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: botReply })
      });
      const sendJson: any = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) {
        greenApiSendStatus = "sent_success";
        addGreenApiLog({
          type: 'outgoing_send',
          phone: formattedPhone,
          sender: session.name,
          text: botReply.slice(0, 120) + (botReply.length > 120 ? "..." : ""),
          status: '🟢 Respuesta PRO Enviada (929 327 654)',
          details: sendJson
        }, 'sales');
      } else {
        greenApiSendStatus = `error_${sendRes.status}`;
        addGreenApiLog({
          type: 'error',
          phone: formattedPhone,
          sender: session.name,
          status: `🔴 Error HTTP ${sendRes.status}: ${sendJson?.message || 'Fallo de envío'}`,
          details: sendJson
        }, 'sales');
      }
    } catch (err: any) {
      greenApiSendStatus = "network_error";
      addGreenApiLog({
        type: 'error',
        phone: formattedPhone,
        sender: session.name,
        status: '🔴 Error de Red / Timeout',
        details: { message: err.message }
      }, 'sales');
    }
  }

  return {
    reply: botReply,
    lead: leadPayload,
    actionTriggered: "SALES_LEAD_UPSERT",
    greenApiSendStatus,
    session
  };
}

// Core Engine: Process incoming message for Demo 1 or Demo 2
async function processDemoMessage(phone: string, senderName: string, text: string) {
  const cleanText = (text || "").trim();
  const lowerText = cleanText.toLowerCase();
  
  // Format phone number
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`;
  const sessionKey = formattedPhone.replace(/[^0-9]/g, "");

  let session = userSessions.get(sessionKey);
  if (!session) {
    session = {
      chatId: sessionKey,
      phone: formattedPhone,
      name: senderName || "Cliente",
      currentDemo: 'menu',
      history: [],
      lastActivity: new Date().toISOString()
    };
    userSessions.set(sessionKey, session);
  }

  // Check if session was idle for more than 15 minutes
  const lastActiveTime = new Date(session.lastActivity).getTime();
  const isIdleExpired = Date.now() - lastActiveTime > 15 * 60 * 1000;

  // Update session contact name if provided
  if (senderName && senderName !== "Cliente") {
    session.name = senderName;
  }

  let botReply = "";
  let actionTriggered: string | null = null;
  let newDentalRow: any = null;
  let newBeautyRow: any = null;

  // 1. Global Reset / Direct Commands
  const isExplicitReset = ["menu", "menú", "reiniciar", "reset", "inicio", "empezar", "opciones", "volver", "salir"].includes(lowerText);
  const isGreeting = ["hola", "ola", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "hola bot", "hi", "hello"].includes(lowerText);
  
  // If user says "1" or "odontologia" from ANYWHERE, switch directly to Demo 1
  const wantsDemo1 = lowerText === "1" || lowerText === "1️⃣" || lowerText.startsWith("1 ") || (session.currentDemo === 'menu' && (lowerText.includes("odontolog") || lowerText.includes("diente") || lowerText.includes("dental")));
  
  // If user says "2" or "belleza" from ANYWHERE, switch directly to Demo 2
  const wantsDemo2 = lowerText === "2" || lowerText === "2️⃣" || lowerText.startsWith("2 ") || (session.currentDemo === 'menu' && (lowerText.includes("belleza") || lowerText.includes("glow") || lowerText.includes("spa") || lowerText.includes("salon")));

  // If a booking was already completed or session expired, and user sends a simple greeting like "Hola"
  const shouldResetToMenu = isExplicitReset || (isGreeting && (session.isBookingCompleted || isIdleExpired || session.currentDemo === 'menu'));

  if (shouldResetToMenu) {
    session.currentDemo = 'menu';
    session.dentalStep = undefined;
    session.selectedTreatment = undefined;
    session.beautyService = undefined;
    session.beautyClientName = undefined;
    session.beautyDateTime = undefined;
    session.isBookingCompleted = false;
    session.history = [];

    botReply = `¡Hola! 👋 Bienvenido al Asistente Inteligente de *Digital MYK Lab*.

Por favor selecciona el área o módulo con el que deseas interactuar:

1️⃣ *Clínica Odontológica Sonrisas VIP*
   _Agendamiento estructurado de citas médicas y sincronización en tiempo real_

2️⃣ *Centro de Belleza & Spa Glow*
   _Recepción con Inteligencia Artificial (Mía) y gestión de servicios_

👉 *Responde con 1 o 2 para comenzar.*`;
  } 
  // 2. User chooses Option 1: Odontología
  else if (wantsDemo1 && (session.currentDemo === 'menu' || isExplicitReset || session.isBookingCompleted || session.dentalStep === undefined)) {
    session.currentDemo = 'dental';
    session.dentalStep = 'treatment_select';
    session.isBookingCompleted = false;
    session.history = [];

    botReply = `¡Hola! 👋 Bienvenido a *Clínica Odontológica Sonrisas VIP*.

Para ayudarte rápido y agendar tu cita, ¿qué tratamiento buscas?

1️⃣ *Limpieza Dental* (S/ 50)
2️⃣ *Evaluación Ortodoncia* (S/ 150)
3️⃣ *Blanqueamiento* (S/ 120)

_Escribe 1, 2 o 3, o el nombre del tratamiento deseado:_`;
  } 
  // 2.1 Demo 1 Step: Treatment Selection
  else if (session.currentDemo === 'dental' && session.dentalStep === 'treatment_select') {
    let treatment = "Limpieza Dental (S/ 50)";
    if (lowerText === "1" || lowerText.includes("limpieza")) {
      treatment = "Limpieza Dental (S/ 50)";
    } else if (lowerText === "2" || lowerText.includes("ortodoncia") || lowerText.includes("brackets")) {
      treatment = "Evaluación Ortodoncia (S/ 150)";
    } else if (lowerText === "3" || lowerText.includes("blanqueamiento")) {
      treatment = "Blanqueamiento (S/ 120)";
    } else if (cleanText.length > 2) {
      treatment = cleanText;
    }

    session.selectedTreatment = treatment;
    session.dentalStep = 'patient_info';

    botReply = `¡Excelente elección! (${treatment}) 🦷✨

Por favor, envíame tu *Nombre completo* y la *Fecha/Hora* en la que deseas venir a la clínica (por ejemplo: *${session.name && session.name !== 'Cliente' ? session.name : 'Carlos Mendoza'}, Mañana 4:00 PM*).`;
  }
  // 2.2 Demo 1 Step: Capture Patient & Date/Time -> Final Confirmation & Sheet Sync
  else if (session.currentDemo === 'dental' && session.dentalStep === 'patient_info') {
    const rawInfo = cleanText;
    let patientName = (session.name && session.name !== "Cliente") ? session.name : "Paciente WhatsApp";
    let dateTimeRequested = "Fecha por coordinar";

    if (rawInfo.includes(",")) {
      const parts = rawInfo.split(",");
      patientName = parts[0].trim() || patientName;
      dateTimeRequested = parts.slice(1).join(",").trim() || dateTimeRequested;
    } else if (rawInfo.includes("\n")) {
      const lines = rawInfo.split("\n");
      patientName = lines[0].trim() || patientName;
      dateTimeRequested = lines.slice(1).join(" ").trim() || dateTimeRequested;
    } else {
      const nameMatch = rawInfo.match(/(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([A-Za-zÁÉÍÓÚáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñ]+){0,3})/i);
      if (nameMatch && nameMatch[1]) {
        patientName = nameMatch[1].trim();
        dateTimeRequested = rawInfo.replace(/(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+[A-Za-zÁÉÍÓÚáéíóúñ\s]+[,.\n]?/i, "").trim() || dateTimeRequested;
      } else {
        const words = rawInfo.split(" ");
        if (words.length >= 3) {
          patientName = words.slice(0, 2).join(" ");
          dateTimeRequested = words.slice(2).join(" ");
        } else if (words.length >= 1) {
          if (rawInfo.toLowerCase().includes("am") || rawInfo.toLowerCase().includes("pm") || rawInfo.includes(":") || rawInfo.toLowerCase().includes("mañana") || rawInfo.toLowerCase().includes("tarde")) {
            dateTimeRequested = rawInfo;
          } else {
            patientName = rawInfo;
          }
        }
      }
    }

    // Clean conversational fillers
    patientName = patientName.replace(/^(mi nombre es|me llamo|soy)\s+/i, "").replace(/\s+(la|el|para|de|y)$/i, "").trim();
    dateTimeRequested = dateTimeRequested
      .replace(/^(?:la\s+cita\s+la\s+deseo\s+(?:para\s+el|para)?|la\s+deseo\s+(?:para\s+el|para)?|deseo\s+(?:para\s+el|para)?|quiero\s+(?:para\s+el|para)?|seria\s+(?:para\s+el|para)?|agendame\s+(?:para\s+el|para)?|para\s+el|para)\s+/i, "")
      .trim() || "Fecha por coordinar";

    const newAppointment = {
      id: `dent_${Date.now()}`,
      registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      patientName: patientName,
      whatsapp: formattedPhone,
      treatment: session.selectedTreatment || "Limpieza Dental (S/ 50)",
      requestedDateTime: dateTimeRequested,
      status: "🟢 Nueva Cita",
      notes: "Registrado automáticamente desde Bot WhatsApp (+51 986 150 562)"
    };

    dentalAppointments.unshift(newAppointment);
    saveStoredAppointments();
    newDentalRow = newAppointment;
    actionTriggered = "DENTAL_SHEET_INSERT";
    session.dentalStep = 'completed';
    session.isBookingCompleted = true;

    botReply = `¡Listo ${patientName}! 🎉 Hemos registrado tu solicitud de cita con éxito en Sonrisas VIP.

📋 *Resumen de la Cita:*
• *Tratamiento:* ${session.selectedTreatment}
• *Horario Solicitado:* ${dateTimeRequested}
• *Paciente:* ${patientName} (${formattedPhone})
• *Estado:* 🟢 Registrado en base de datos en tiempo real

📍 *Clínica Sonrisas VIP*: Te esperamos con gusto. ¡Nos vemos pronto! 🦷

_💡 Tip: Escribe *menu* para ver las opciones principales o agendar nuevamente._`;
  }
  // 3. User chooses Option 2: Centro de Belleza Glow (Plan PRO con IA Mía)
  else if (wantsDemo2 && (session.currentDemo === 'menu' || isExplicitReset || session.isBookingCompleted || session.currentDemo !== 'beauty')) {
    session.currentDemo = 'beauty';
    session.beautyStep = 'service_select';
    session.beautyService = undefined;
    session.beautyPrice = 50;
    session.beautyClientName = undefined;
    session.beautyDateTime = undefined;
    session.isBookingCompleted = false;
    session.history = [];

    botReply = `¡Hola hermosa! ✨🌸 Bienvenida a *Glow Centro de Belleza*. Soy *Mía*, tu recepcionista virtual inteligente 💅.

¿En qué podemos consentirte hoy? 💖

✨ *Nuestros Servicios Estrella:*
💅 Manicure Acrílica: S/ 60
🌸 Pedicure Spa: S/ 45
💇‍♀️ Corte de Cabello + Cepillado: S/ 50
✨ Alisado con Queratina: Desde S/ 150

Cuéntame, ¿qué servicio te gustaría y para qué día u horario te gustaría agendar? ✨`;
  }
  // 3.1 Demo 2: Conversational AI with Gemini (Mía from Glow Centro de Belleza)
  else if (session.currentDemo === 'beauty') {
    // If the user already finished a booking and is sending a new message
    if (session.isBookingCompleted && isGreeting) {
      session.isBookingCompleted = false;
      session.beautyStep = 'service_select';
      session.beautyService = undefined;
      session.beautyClientName = undefined;
      session.beautyDateTime = undefined;
      session.history = [];
      botReply = `¡Hola hermosa de nuevo! 💕✨ Con gusto te atiendo otra vez en *Glow Centro de Belleza*. 

¿Deseas agendar otro servicio para ti o una amiga? 🌸
💇‍♀️ Corte + Cepillado (S/ 50)
💅 Manicure Acrílica (S/ 60)
🌸 Pedicure Spa (S/ 45)
✨ Alisado con Queratina (S/ 150)

_O escribe *menu* para volver a la central de demostraciones._`;
    } else {
      // 1. Context Extraction from User's text
      if (lowerText.includes("pedicure") || lowerText.includes("pie") || lowerText.includes("spa")) {
        session.beautyService = "Pedicure Spa";
        session.beautyPrice = 45;
      } else if (lowerText.includes("manicure") || lowerText.includes("uñas") || lowerText.includes("acrilic") || lowerText.includes("acrílic")) {
        session.beautyService = "Manicure Acrílica";
        session.beautyPrice = 60;
      } else if (lowerText.includes("alisado") || lowerText.includes("queratina") || lowerText.includes("keratina")) {
        session.beautyService = "Alisado con Queratina";
        session.beautyPrice = 150;
      } else if (lowerText.includes("corte") || lowerText.includes("cepillado") || lowerText.includes("cabello")) {
        session.beautyService = "Corte de Cabello + Cepillado";
        session.beautyPrice = 50;
      }

      // Helper to clean common conversational fillers from date/time
      const cleanDateString = (rawDate: string) => {
        let res = rawDate
          .replace(/^(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+[A-Za-zÁÉÍÓÚáéíóúñ\s]+[,.\n]?\s*/i, "")
          .replace(/^(?:la\s+cita\s+la\s+deseo\s+(?:para\s+el|para)?|la\s+cita\s+para\s+el|la\s+cita\s+es\s+para\s+el|la\s+deseo\s+(?:para\s+el|para)?|deseo\s+(?:para\s+el|para)?|quiero\s+(?:para\s+el|para)?|seria\s+(?:para\s+el|para)?|agendame\s+(?:para\s+el|para)?|para\s+el|para)\s+/i, "")
          .trim();
        // Capitalize first letter
        return res ? res.charAt(0).toUpperCase() + res.slice(1) : res;
      };

      // Advanced multi-line / conversational Name extraction
      const lines = cleanText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
      const isTimeWord = (t: string) => {
        const l = t.toLowerCase();
        return l.includes("pm") || l.includes("am") || l.includes(":") || l.includes("mañana") || 
               l.includes("tarde") || l.includes("noche") || l.includes("lunes") || l.includes("martes") || 
               l.includes("miercoles") || l.includes("miércoles") || l.includes("jueves") || l.includes("viernes") || 
               l.includes("sabado") || l.includes("sábado") || l.includes("domingo") || l.includes("para el") ||
               l.includes("la cita");
      };

      const namePrefixMatch = cleanText.match(/(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([A-Za-zÁÉÍÓÚáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñ]+){0,3})/i);
      if (namePrefixMatch && namePrefixMatch[1].trim()) {
        const extracted = namePrefixMatch[1].replace(/[,.\n].*$/, "").trim();
        // Remove trailing filler words
        session.beautyClientName = extracted.replace(/\s+(la|el|para|de|y)$/i, "").trim();
      } else if (lines.length >= 2 && !isTimeWord(lines[0]) && lines[0].split(" ").length <= 4) {
        // Line 1 is the name (e.g. "Karina linares"), Line 2 is the date/time
        session.beautyClientName = lines[0].trim();
      } else if (!session.beautyClientName && cleanText.split(" ").length <= 3 && !isTimeWord(cleanText) && !lowerText.includes("pedicure") && !lowerText.includes("manicure") && !lowerText.includes("corte") && !lowerText.includes("alisado")) {
        session.beautyClientName = cleanText.trim();
      }

      // Date / Time extraction
      if (isTimeWord(lowerText)) {
        if (lines.length >= 2 && session.beautyClientName === lines[0]) {
          session.beautyDateTime = cleanDateString(lines.slice(1).join(" ").trim());
        } else {
          session.beautyDateTime = cleanDateString(cleanText);
        }
      }

      // 2. Try Gemini Generative AI first
      const historyText = session.history.slice(-8).map(h => `${h.sender === 'user' ? 'Clienta' : 'Mía (Recepcionista IA)'}: ${h.text}`).join("\n");
      const systemPrompt = `Eres 'Mía', la recepcionista virtual con Inteligencia Artificial de "Glow Centro de Belleza".
Tu objetivo es atender amablemente, dar precios y agendar citas.

Catálogo de Servicios:
* Manicure Acrílica: S/ 60
* Pedicure Spa: S/ 45
* Corte de Cabello + Cepillado: S/ 50
* Alisado con Queratina: Desde S/ 150

Reglas de Atención:
1. Saluda de forma muy cálida y femenina (usa emojis como ✨, 💅, 🌸, 💖).
2. Si la clienta pregunta por un servicio, dale el precio exacto y pregúntale para qué día y hora desea agendar.
3. Entiende el lenguaje natural (ej. si dice 'mañana a las 5pm' o 'miércoles en la noche', confirma ese horario).
4. Para cerrar la cita, recopila: Nombre de la clienta, Servicio, Fecha y Hora aproximada.
5. Al tener los datos, confirma la cita detallando el resumen (Cliente, Servicio, Fecha y Hora, Total en S/) y despídete con calidez.
6. IMPORTANTE: En el momento en que confirmes o agendes la cita con éxito, DEBES agregar al final de tu mensaje el bloque exacto:
[APPOINTMENT: {"clientName":"...", "service":"...", "amount":50, "dateTime":"..."}]

Historial reciente:
${historyText}

Mensaje actual de la clienta (${session.beautyClientName || session.name || "Clienta"} - ${formattedPhone}):
"${cleanText}"`;

      let rawAiText = await generateAiText(systemPrompt);

      let detectedAppointment: any = null;

      if (rawAiText) {
        // Parse Appointment from AI text
        const appointmentMatch = rawAiText.match(/\[APPOINTMENT:\s*(\{.*?\})\]/s);
        if (appointmentMatch) {
          try {
            detectedAppointment = JSON.parse(appointmentMatch[1]);
          } catch (e) {
            console.error("Error parsing appointment JSON from AI:", e);
          }
          rawAiText = rawAiText.replace(/\[APPOINTMENT:\s*\{.*?\}\]/gs, "").trim();
        }

        if (!detectedAppointment) {
          const hasConfirmation = rawAiText.toLowerCase().includes("ha quedado agendada") || 
                                  rawAiText.toLowerCase().includes("cita agendada") || 
                                  rawAiText.includes("Detalle de tu Cita") ||
                                  rawAiText.includes("Resumen de tu Cita") ||
                                  (rawAiText.toLowerCase().includes("te esperamos") && (rawAiText.includes("S/") || rawAiText.includes("Total")));

          if (hasConfirmation) {
            let clientName = session.beautyClientName || (session.name && session.name !== "Cliente" ? session.name : "Clienta VIP");
            const nmMatch = rawAiText.match(/\*Cliente:\*\s*([^\n\r*]+)/i) || rawAiText.match(/\*Nombre:\*\s*([^\n\r*]+)/i) || rawAiText.match(/hermosa\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)/i);
            if (nmMatch && nmMatch[1].trim()) clientName = nmMatch[1].trim();

            detectedAppointment = {
              clientName,
              service: session.beautyService || "Corte de Cabello + Cepillado",
              amount: session.beautyPrice || 50,
              dateTime: session.beautyDateTime || "Horario acordado"
            };
          }
        }
        botReply = rawAiText;
      }

      // 3. Robust Autonomous Rule-Engine Fallback (if AI is offline or in progress)
      if (!rawAiText) {
        const clientName = session.beautyClientName || (session.name && session.name !== 'Cliente' ? session.name : "hermosa");
        const service = session.beautyService || "Corte de Cabello + Cepillado";
        const price = session.beautyPrice || 50;
        const dateTime = session.beautyDateTime;

        // If we have both name (or phone) and date/time and service -> COMPLETE BOOKING!
        if (dateTime && (session.beautyClientName || cleanText.length > 5)) {
          const finalCleanDateTime = cleanDateString(dateTime);
          detectedAppointment = {
            clientName: session.beautyClientName || (session.name !== 'Cliente' ? session.name : 'Salomé Linares'),
            service: service,
            amount: price,
            dateTime: finalCleanDateTime
          };
          botReply = `¡Excelente, hermosa ${detectedAppointment.clientName}! 💖✨ Con mucho gusto he reservado tu espacio para consentirte.

🌸 *Resumen de tu Cita:*
👤 *Clienta:* ${detectedAppointment.clientName}
💅 *Servicio:* ${service}
📅 *Fecha y Hora:* ${finalCleanDateTime}
💰 *Total:* S/ ${price}

¡Te esperamos en *Glow Centro de Belleza* para dejarte radiante! 💅✨ Si necesitas algún cambio o consulta adicional, avísame con confianza. ¡Que tengas un maravilloso día! 🌸💖`;
        } else if (session.beautyClientName && !dateTime) {
          botReply = `¡Mucho gusto, ${session.beautyClientName}! 💕🌸 ¿Para qué *día y hora* te gustaría agendar tu *${service}*? (por ejemplo: *Mañana a las 4:00 PM* o *Sábado a las 11:00 AM*) ✨💅.`;
        } else if (session.beautyService) {
          botReply = `¡Excelente elección! 🌸✨ El servicio de *${service}* cuesta *S/ ${price}*.

Por favor compárteme tu *Nombre completo* y para qué *día y horario* deseas agendar tu cita 💅.`;
        } else {
          botReply = `¡Hola hermosa! ✨🌸 Gracias por comunicarte con *Glow Centro de Belleza*. 

¿Qué servicio te gustaría agendar hoy?
💅 *Manicure Acrílica (S/ 60)*
🌸 *Pedicure Spa (S/ 45)*
💇‍♀️ *Corte de Cabello + Cepillado (S/ 50)*
✨ *Alisado con Queratina (S/ 150)*

Cuéntame tu nombre y el servicio deseado 💖.`;
        }
      }

      // 4. If an appointment was detected (via AI or rule engine), Save to Kanban CRM & Disk!
      if (detectedAppointment) {
        const newBeautyCard = {
          id: `bt_${Date.now()}`,
          date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          clientName: detectedAppointment.clientName || session.beautyClientName || session.name || "Clienta VIP",
          whatsapp: formattedPhone,
          service: detectedAppointment.service || session.beautyService || "Corte de Cabello + Cepillado",
          amount: Number(detectedAppointment.amount) || session.beautyPrice || 50,
          dateTimeRequested: detectedAppointment.dateTime || session.beautyDateTime || "Horario acordado",
          status: "Por Confirmar",
          stylist: "Mía Recepción IA",
          notes: "Agendado automáticamente por IA Mía (Plan PRO) vía WhatsApp"
        };

        beautyAppointments.unshift(newBeautyCard);
        saveStoredAppointments();
        newBeautyRow = newBeautyCard;
        actionTriggered = "BEAUTY_CRM_INSERT";
        session.isBookingCompleted = true;

        // Append helper tip if not present
        if (!botReply.includes("menu")) {
          botReply += `\n\n_💡 Tip: Escribe *menu* para ver las opciones principales o agendar nuevamente._`;
        }
      }
    }
  }

  // Update session history
  session.history.push({ sender: 'user', text: cleanText, timestamp: new Date().toISOString() });
  session.history.push({ sender: 'bot', text: botReply, timestamp: new Date().toISOString() });
  session.lastActivity = new Date().toISOString();

  // If Green-API is configured and this was a real WhatsApp chat, trigger sending back via Green API!
  let greenApiSendStatus = "not_sent";
  if (greenApiConfig.idInstance && greenApiConfig.apiTokenInstance && (sessionKey.length >= 7)) {
    const cleanPhone = formattedPhone.replace(/[^0-9]/g, "");
    const chatId = `${cleanPhone}@c.us`;
    const targetUrl = getGreenApiUrl(greenApiConfig.idInstance, greenApiConfig.apiTokenInstance, "sendMessage", greenApiConfig.apiUrl);

    try {
      console.log(`[Green-API Sending] POST to ${targetUrl} for ${chatId}`);
      const sendRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId,
          message: botReply
        })
      });

      const sendJson: any = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) {
        greenApiSendStatus = "sent_success";
        addGreenApiLog({
          type: 'outgoing_send',
          phone: formattedPhone,
          sender: session.name,
          text: botReply.slice(0, 120) + (botReply.length > 120 ? "..." : ""),
          status: '🟢 Enviado 200 OK',
          details: sendJson
        });
      } else {
        greenApiSendStatus = `error_${sendRes.status}`;
        console.warn(`[Green-API Send Failed] HTTP ${sendRes.status}:`, sendJson);
        addGreenApiLog({
          type: 'error',
          phone: formattedPhone,
          sender: session.name,
          status: `🔴 Error HTTP ${sendRes.status}: ${sendJson?.message || 'Fallo de envío'}`,
          details: { status: sendRes.status, response: sendJson, url: targetUrl }
        });
      }
    } catch (greenErr: any) {
      console.warn("[Green-API Send] Network Exception:", greenErr);
      greenApiSendStatus = "network_error";
      addGreenApiLog({
        type: 'error',
        phone: formattedPhone,
        sender: session.name,
        status: '🔴 Error de Red / Timeout',
        details: { message: greenErr.message, url: targetUrl }
      });
    }
  }

  return {
    reply: botReply,
    currentDemo: session.currentDemo,
    dentalStep: session.dentalStep,
    actionTriggered,
    newDentalRow,
    newBeautyRow,
    greenApiSendStatus,
    session
  };
}

// Endpoint: Green-API Configuration Get & Update (Line 1: Demos)
app.get("/api/green-api/config", (req, res) => {
  res.json(greenApiConfig);
});

app.post("/api/green-api/config", (req, res) => {
  const { idInstance, apiTokenInstance, apiUrl, connectedPhone, pollingEnabled } = req.body;
  if (idInstance !== undefined && idInstance.trim()) {
    greenApiConfig.idInstance = idInstance.trim();
  }
  if (apiTokenInstance !== undefined && apiTokenInstance.trim()) {
    greenApiConfig.apiTokenInstance = apiTokenInstance.trim();
  }
  if (apiUrl !== undefined && apiUrl.trim()) {
    greenApiConfig.apiUrl = apiUrl.trim();
  } else if (greenApiConfig.idInstance) {
    greenApiConfig.apiUrl = getGreenApiBaseUrl(greenApiConfig.idInstance);
  }
  if (connectedPhone !== undefined && connectedPhone.trim()) {
    greenApiConfig.connectedPhone = connectedPhone.trim();
  }
  if (pollingEnabled !== undefined) {
    greenApiConfig.pollingEnabled = !!pollingEnabled;
  }
  greenApiConfig.lastPing = new Date().toISOString();
  greenApiConfig.status = "connected";

  saveStoredJsonConfig(GREEN_CONFIG_PATH, greenApiConfig);

  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Configuración Guardada en Servidor (idInstance: ${greenApiConfig.idInstance})`,
    details: { apiUrl: greenApiConfig.apiUrl, hasToken: !!greenApiConfig.apiTokenInstance, polling: greenApiConfig.pollingEnabled }
  });

  runGreenApiDrainBatch(10).catch(() => {});
  res.json({ success: true, config: greenApiConfig });
});

// Endpoints: Green-API Line 2 (Digital MYK Lab Comercial +51 929 327 654)
app.get("/api/green-api/sales/config", (req, res) => {
  res.json(salesGreenApiConfig);
});

app.post("/api/green-api/sales/config", (req, res) => {
  const { idInstance, apiTokenInstance, apiUrl, connectedPhone, pollingEnabled, autoRespondAll } = req.body;
  if (idInstance !== undefined) {
    salesGreenApiConfig.idInstance = idInstance.trim();
  }
  if (apiTokenInstance !== undefined && apiTokenInstance.trim()) {
    salesGreenApiConfig.apiTokenInstance = apiTokenInstance.trim();
  }
  if (apiUrl !== undefined && apiUrl.trim()) {
    salesGreenApiConfig.apiUrl = apiUrl.trim();
  } else if (salesGreenApiConfig.idInstance) {
    salesGreenApiConfig.apiUrl = getGreenApiBaseUrl(salesGreenApiConfig.idInstance);
  }
  if (connectedPhone !== undefined && connectedPhone.trim()) {
    salesGreenApiConfig.connectedPhone = connectedPhone.trim();
  }
  if (pollingEnabled !== undefined) {
    salesGreenApiConfig.pollingEnabled = !!pollingEnabled;
  }
  if (autoRespondAll !== undefined) {
    salesGreenApiConfig.autoRespondAll = !!autoRespondAll;
  }
  salesGreenApiConfig.lastPing = new Date().toISOString();
  salesGreenApiConfig.status = (salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) ? "connected" : "disconnected";

  saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);

  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Línea Ventas 929 327 654 Guardada (idInstance: ${salesGreenApiConfig.idInstance || 'pendiente'})`,
    details: { apiUrl: salesGreenApiConfig.apiUrl, hasToken: !!salesGreenApiConfig.apiTokenInstance, polling: salesGreenApiConfig.pollingEnabled }
  }, 'sales');

  if (salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) {
    runSalesGreenApiDrainBatch(10).catch(() => {});
  }

  res.json({ success: true, config: salesGreenApiConfig });
});

app.post("/api/green-api/sales/set-queue-mode", async (req, res) => {
  const id = String(req.body.idInstance || salesGreenApiConfig.idInstance || "").trim();
  const token = String(req.body.apiTokenInstance || salesGreenApiConfig.apiTokenInstance || "").trim();
  const customApiUrl = String(req.body.apiUrl || salesGreenApiConfig.apiUrl || "").trim();

  if (!id || !token) {
    return res.status(400).json({ success: false, error: "Faltan credenciales de la Instancia Ventas (idInstance y apiTokenInstance)" });
  }

  const baseUrl = getGreenApiBaseUrl(id, customApiUrl);
  const setSettingsUrl = `${baseUrl}/waInstance${id}/setSettings/${token}`;

  try {
    const apiRes = await fetch(setSettingsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: "",
        incomingWebhook: "yes",
        outgoingMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });

    const data = await apiRes.json().catch(() => ({}));
    addGreenApiLog({
      type: 'diagnostic',
      status: '🚀 Modo Cola Activado en Línea Ventas (+51 929 327 654)',
      details: data
    }, 'sales');

    setTimeout(() => {
      runSalesGreenApiDrainBatch(10).catch(() => {});
    }, 1000);

    res.json({
      success: apiRes.ok,
      message: "¡Modo Cola 24/7 activado en la Línea Ventas (+51 929 327 654)!",
      data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/green-api/sales/set-webhook-url", async (req, res) => {
  const id = String(req.body.idInstance || salesGreenApiConfig.idInstance || "").trim();
  const token = String(req.body.apiTokenInstance || salesGreenApiConfig.apiTokenInstance || "").trim();
  const customApiUrl = String(req.body.apiUrl || salesGreenApiConfig.apiUrl || "").trim();
  const webhookUrl = String(req.body.webhookUrl || "").trim();

  if (!id || !token) {
    return res.status(400).json({ success: false, error: "Faltan credenciales (idInstance y apiTokenInstance)" });
  }
  if (!webhookUrl) {
    return res.status(400).json({ success: false, error: "Ingresa la URL del webhook" });
  }

  const baseUrl = getGreenApiBaseUrl(id, customApiUrl);
  const setSettingsUrl = `${baseUrl}/waInstance${id}/setSettings/${token}`;

  try {
    const apiRes = await fetch(setSettingsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl,
        incomingWebhook: "yes",
        outgoingMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });
    const data = await apiRes.json().catch(() => ({}));
    addGreenApiLog({
      type: 'diagnostic',
      status: `🔗 Webhook Configurado en Línea Ventas: ${webhookUrl}`,
      details: data
    }, 'sales');
    res.json({ success: apiRes.ok, message: `¡Webhook configurado hacia ${webhookUrl}!`, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/green-api/sales/toggle-polling", (req, res) => {
  const { enabled } = req.body;
  salesGreenApiConfig.pollingEnabled = enabled !== undefined ? !!enabled : !salesGreenApiConfig.pollingEnabled;
  saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);
  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Polling Ventas ${salesGreenApiConfig.pollingEnabled ? 'ACTIVADO' : 'PAUSADO'}`,
    details: { pollingEnabled: salesGreenApiConfig.pollingEnabled }
  }, 'sales');
  res.json({ success: true, pollingEnabled: salesGreenApiConfig.pollingEnabled });
});

app.post("/api/green-api/sales/poll-now", async (req, res) => {
  try {
    const count = await runSalesGreenApiDrainBatch(15);
    res.json({
      success: true,
      processedCount: count,
      message: count > 0 ? `¡Se procesaron ${count} mensajes en la Línea Ventas!` : "La cola de la Línea Ventas está al día."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/green-api/sales/diagnose", async (req, res) => {
  const queryId = String(req.query.idInstance || salesGreenApiConfig.idInstance || "").trim();
  const queryToken = String(req.query.apiTokenInstance || salesGreenApiConfig.apiTokenInstance || "").trim();
  const queryApiUrl = String(req.query.apiUrl || salesGreenApiConfig.apiUrl || "").trim();

  if (!queryId || !queryToken) {
    return res.json({ success: false, error: "Ingresa el idInstance y apiTokenInstance de la línea +51 929 327 654." });
  }

  const baseUrl = getGreenApiBaseUrl(queryId, queryApiUrl);
  const stateUrl = `${baseUrl}/waInstance${queryId}/getStateInstance/${queryToken}`;
  const settingsUrl = `${baseUrl}/waInstance${queryId}/getSettings/${queryToken}`;

  try {
    const [stateRes, settingsRes] = await Promise.all([
      fetch(stateUrl).then(r => r.json().catch(() => ({ status: r.status }))),
      fetch(settingsUrl).then(r => r.json().catch(() => ({ status: r.status })))
    ]);
    const isAuthorized = stateRes?.stateInstance === "authorized";
    addGreenApiLog({
      type: 'diagnostic',
      status: isAuthorized ? '🟢 Diagnóstico Ventas: WhatsApp AUTORIZADO' : `🟡 Estado Ventas: ${stateRes?.stateInstance || 'No Autorizada'}`,
      details: { stateInstance: stateRes, settings: settingsRes, baseUrl }
    }, 'sales');
    res.json({ success: true, baseUrl, stateInstance: stateRes, settings: settingsRes, isAuthorized });
  } catch (err: any) {
    res.json({ success: false, baseUrl, error: err.message });
  }
});

app.get("/api/green-api/sales/logs", (req, res) => {
  res.json({ config: salesGreenApiConfig, logs: salesGreenApiLogs });
});

app.post("/api/green-api/sales/send-message", async (req, res) => {
  try {
    const { phone, message } = req.body;
    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || !message) {
      return res.status(400).json({ error: "phone y message son requeridos" });
    }
    if (!salesGreenApiConfig.idInstance || !salesGreenApiConfig.apiTokenInstance) {
      return res.status(400).json({ error: "Configura primero el idInstance y apiTokenInstance de la línea Ventas (929 327 654)" });
    }

    const targetUrl = getGreenApiUrl(salesGreenApiConfig.idInstance, salesGreenApiConfig.apiTokenInstance, "sendMessage", salesGreenApiConfig.apiUrl);
    const chatId = `${cleanPhone}@c.us`;
    const apiRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message })
    });
    const data = await apiRes.json().catch(() => ({}));
    addGreenApiLog({
      type: 'outgoing_send',
      phone: `+${cleanPhone}`,
      sender: 'Prueba Manual (Ventas)',
      text: message,
      status: apiRes.ok ? '🟢 Mensaje Enviado (929 327 654)' : `🔴 Error HTTP ${apiRes.status}`,
      details: data
    }, 'sales');
    res.json({ success: apiRes.ok, status: apiRes.status, targetUrl, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/green-api/sales/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    salesGreenApiConfig.lastWebhookReceived = new Date().toISOString();
    const typeWebhook = body.typeWebhook || "";

    if (typeWebhook === "incomingMessageReceived" || body.messageData) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};
      const rawSender = senderData.sender || senderData.chatId || "";
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Prospecto WhatsApp";

      let textMessage = "";
      if (messageData.typeMessage === "textMessage") {
        textMessage = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        textMessage = messageData.extendedTextMessageData?.text || "";
      } else if (messageData.typeMessage === "quotedMessage") {
        textMessage = messageData.extendedTextMessageData?.text || messageData.quotedMessage?.text || "";
      } else if (typeof messageData.textMessage === "string") {
        textMessage = messageData.textMessage;
      }

      addGreenApiLog({
        type: 'incoming_webhook',
        phone: senderPhone,
        sender: senderName,
        text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
        status: textMessage ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : '⚠️ Mensaje sin texto',
        details: body
      }, 'sales');

      if (textMessage && senderPhone) {
        const result = await processDigitalMykSalesMessage(senderPhone, senderName, textMessage);
        return res.json({ status: "processed", result });
      }
    }
    res.json({ status: "ok", received: true });
  } catch (error: any) {
    res.status(200).json({ error: error.message });
  }
});

// Endpoint: Configure Green-API to Queue Mode by clearing webhookUrl
app.post("/api/green-api/set-queue-mode", async (req, res) => {
  const id = String(req.body.idInstance || greenApiConfig.idInstance || "").trim();
  const token = String(req.body.apiTokenInstance || greenApiConfig.apiTokenInstance || "").trim();
  const customApiUrl = String(req.body.apiUrl || greenApiConfig.apiUrl || "").trim();

  if (!id || !token) {
    return res.status(400).json({ success: false, error: "Faltan credenciales (idInstance y apiTokenInstance)" });
  }

  const baseUrl = getGreenApiBaseUrl(id, customApiUrl);
  const setSettingsUrl = `${baseUrl}/waInstance${id}/setSettings/${token}`;

  try {
    const apiRes = await fetch(setSettingsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: "", // Clear webhook so Green-API routes messages to the HTTP ReceiveNotification queue
        incomingWebhook: "yes",
        outgoingMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });

    const data = await apiRes.json().catch(() => ({}));
    
    addGreenApiLog({
      type: 'diagnostic',
      status: '🚀 Modo Cola Activado en Green-API (WebhookUrl limpiado)',
      details: data
    });

    // Run immediate drain
    setTimeout(() => {
      runGreenApiDrainBatch(10).catch(() => {});
    }, 1000);

    res.json({
      success: apiRes.ok,
      message: "¡Modo Cola 24/7 activado en Green-API! El servidor ahora recibirá los mensajes directamente.",
      data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Configure Green-API to Webhook Mode with specific URL
app.post("/api/green-api/set-webhook-url", async (req, res) => {
  const id = String(req.body.idInstance || greenApiConfig.idInstance || "").trim();
  const token = String(req.body.apiTokenInstance || greenApiConfig.apiTokenInstance || "").trim();
  const customApiUrl = String(req.body.apiUrl || greenApiConfig.apiUrl || "").trim();
  const webhookUrl = String(req.body.webhookUrl || "").trim();

  if (!id || !token) {
    return res.status(400).json({ success: false, error: "Faltan credenciales (idInstance y apiTokenInstance)" });
  }
  if (!webhookUrl) {
    return res.status(400).json({ success: false, error: "Ingresa la URL del webhook" });
  }

  const baseUrl = getGreenApiBaseUrl(id, customApiUrl);
  const setSettingsUrl = `${baseUrl}/waInstance${id}/setSettings/${token}`;

  try {
    const apiRes = await fetch(setSettingsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl,
        incomingWebhook: "yes",
        outgoingMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });

    const data = await apiRes.json().catch(() => ({}));
    
    addGreenApiLog({
      type: 'diagnostic',
      status: `🔗 Webhook Oficial Configurado en Green-API: ${webhookUrl}`,
      details: data
    });

    res.json({
      success: apiRes.ok,
      message: `¡Webhook configurado exitosamente hacia ${webhookUrl}! Los mensajes llegarán en tiempo real.`,
      data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Toggle Polling on this specific server instance
app.post("/api/green-api/toggle-polling", (req, res) => {
  const { enabled } = req.body;
  if (enabled !== undefined) {
    greenApiConfig.pollingEnabled = !!enabled;
  } else {
    greenApiConfig.pollingEnabled = !greenApiConfig.pollingEnabled;
  }
  saveStoredJsonConfig(GREEN_CONFIG_PATH, greenApiConfig);
  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Polling ${greenApiConfig.pollingEnabled ? 'ACTIVADO' : 'PAUSADO'} en este servidor`,
    details: { pollingEnabled: greenApiConfig.pollingEnabled }
  });
  res.json({ success: true, pollingEnabled: greenApiConfig.pollingEnabled });
});

// Endpoint: Force drain / check queued WhatsApp notifications now
app.post("/api/green-api/poll-now", async (req, res) => {
  try {
    const count = await runGreenApiDrainBatch(15);
    res.json({
      success: true,
      processedCount: count,
      message: count > 0 ? `¡Se procesaron ${count} mensajes entrantes con éxito!` : "La cola de WhatsApp está al día (no hay mensajes pendientes en espera)."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Diagnostic Test for Green-API Connection
app.get("/api/green-api/diagnose", async (req, res) => {
  const queryId = String(req.query.idInstance || greenApiConfig.idInstance || "").trim();
  const queryToken = String(req.query.apiTokenInstance || greenApiConfig.apiTokenInstance || "").trim();
  const queryApiUrl = String(req.query.apiUrl || greenApiConfig.apiUrl || "").trim();

  if (!queryId || !queryToken) {
    return res.json({
      success: false,
      error: "Ingresa tu idInstance y apiTokenInstance para realizar el diagnóstico."
    });
  }

  const baseUrl = getGreenApiBaseUrl(queryId, queryApiUrl);
  const stateUrl = `${baseUrl}/waInstance${queryId}/getStateInstance/${queryToken}`;
  const settingsUrl = `${baseUrl}/waInstance${queryId}/getSettings/${queryToken}`;

  try {
    const [stateRes, settingsRes] = await Promise.all([
      fetch(stateUrl).then(r => r.json().catch(() => ({ status: r.status }))),
      fetch(settingsUrl).then(r => r.json().catch(() => ({ status: r.status })))
    ]);

    const isAuthorized = stateRes?.stateInstance === "authorized";

    addGreenApiLog({
      type: 'diagnostic',
      status: isAuthorized ? '🟢 Diagnóstico: Instancia WhatsApp AUTORIZADA' : `🟡 Estado: ${stateRes?.stateInstance || 'No Autorizada'}`,
      details: { stateInstance: stateRes, settings: settingsRes, baseUrl }
    });

    res.json({
      success: true,
      baseUrl,
      stateInstance: stateRes,
      settings: settingsRes,
      isAuthorized
    });
  } catch (err: any) {
    addGreenApiLog({
      type: 'error',
      status: '🔴 Error durante diagnóstico de Green-API',
      details: { message: err.message, baseUrl }
    });
    res.json({
      success: false,
      baseUrl,
      error: err.message
    });
  }
});

// Endpoint: Activity Logs for Green-API Traffic
app.get("/api/green-api/logs", (req, res) => {
  res.json({
    config: greenApiConfig,
    logs: greenApiLogs
  });
});

// Endpoint: Test Sending via Green-API
app.post("/api/green-api/send-message", async (req, res) => {
  try {
    const { phone, message } = req.body;
    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || !message) {
      return res.status(400).json({ error: "phone y message son requeridos" });
    }

    if (!greenApiConfig.idInstance || !greenApiConfig.apiTokenInstance) {
      return res.status(400).json({ error: "Configura primero tu idInstance y apiTokenInstance de Green-API" });
    }

    const targetUrl = getGreenApiUrl(greenApiConfig.idInstance, greenApiConfig.apiTokenInstance, "sendMessage", greenApiConfig.apiUrl);
    const chatId = `${cleanPhone}@c.us`;

    console.log(`[Green-API Test Send] URL: ${targetUrl}, ChatId: ${chatId}`);

    const apiRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message })
    });

    const data = await apiRes.json().catch(() => ({}));
    
    addGreenApiLog({
      type: 'outgoing_send',
      phone: `+${cleanPhone}`,
      sender: 'Prueba Manual',
      text: message,
      status: apiRes.ok ? '🟢 Mensaje Manual Enviado con Éxito' : `🔴 Error HTTP ${apiRes.status}`,
      details: data
    });

    res.json({ success: apiRes.ok, status: apiRes.status, targetUrl, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Official Green-API Webhook Receiver
// Receives notifications from console.green-api.com
app.post(["/api/green-api/webhook", "/api/webhooks/green-api"], async (req, res) => {
  try {
    const body = req.body || {};
    console.log("[Green-API Webhook Received]:", JSON.stringify(body));
    greenApiConfig.lastWebhookReceived = new Date().toISOString();

    // Auto-route to Sales Line if incoming instanceId matches salesGreenApiConfig.idInstance
    const incomingInstanceId = body.instanceData?.idInstance ? String(body.instanceData.idInstance) : "";
    const isSalesInstance = !!(incomingInstanceId && salesGreenApiConfig.idInstance && incomingInstanceId === salesGreenApiConfig.idInstance);

    if (!isSalesInstance && incomingInstanceId) {
      greenApiConfig.idInstance = incomingInstanceId;
      if (!greenApiConfig.apiUrl) {
        greenApiConfig.apiUrl = getGreenApiBaseUrl(greenApiConfig.idInstance);
      }
    }

    const typeWebhook = body.typeWebhook || "";

    // Check if it is an incoming message
    if (typeWebhook === "incomingMessageReceived" || body.messageData) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const rawSender = senderData.sender || senderData.chatId || "";
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Cliente WhatsApp";

      let textMessage = "";
      if (messageData.typeMessage === "textMessage") {
        textMessage = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        textMessage = messageData.extendedTextMessageData?.text || "";
      } else if (messageData.typeMessage === "quotedMessage") {
        textMessage = messageData.extendedTextMessageData?.text || messageData.quotedMessage?.text || "";
      } else if (typeof messageData.textMessage === "string") {
        textMessage = messageData.textMessage;
      }

      addGreenApiLog({
        type: 'incoming_webhook',
        phone: senderPhone,
        sender: senderName,
        text: textMessage || `[${messageData.typeMessage || 'Mensaje Multimedia'}]`,
        status: textMessage
          ? (isSalesInstance ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : '📥 Mensaje Recibido de WhatsApp')
          : '⚠️ Mensaje sin texto reconocible',
        details: body
      }, isSalesInstance ? 'sales' : 'demos');

      if (textMessage && senderPhone) {
        console.log(`[Green-API Message Incoming] [${isSalesInstance ? 'SALES' : 'DEMOS'}] De: ${senderName} (${senderPhone}): "${textMessage}"`);
        const result = isSalesInstance
          ? await processDigitalMykSalesMessage(senderPhone, senderName, textMessage)
          : await processDemoMessage(senderPhone, senderName, textMessage);
        return res.json({ status: "processed", result });
      }
    } else {
      addGreenApiLog({
        type: 'incoming_webhook',
        status: `ℹ️ Notificación: ${typeWebhook || 'Ping Event'}`,
        details: body
      }, isSalesInstance ? 'sales' : 'demos');
    }

    // Acknowledge webhook
    res.json({ status: "ok", received: true });
  } catch (error: any) {
    console.error("Error processing Green-API webhook:", error);
    addGreenApiLog({
      type: 'error',
      status: '🔴 Error en Webhook Receiver',
      details: { error: error.message }
    });
    res.status(200).json({ error: error.message });
  }
});

// Endpoint: Unified Demo Message Processor (Used by Frontend Simulator & Webhook)
app.post("/api/demo/process-message", async (req, res) => {
  try {
    const { phone = "+51 987 654 321", senderName = "Cliente", message = "1" } = req.body;
    const result = await processDemoMessage(phone, senderName, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Commercial Sales Message Processor (Line 2: +51 929 327 654)
app.post("/api/sales/process-message", async (req, res) => {
  try {
    const { phone = "+51 944 888 111", senderName = "Prospecto", message = "Hola" } = req.body;
    const result = await processDigitalMykSalesMessage(phone, senderName, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Live Data for Demos & Sales
app.get("/api/demo/data", (req, res) => {
  res.json({
    dentalAppointments,
    beautyAppointments,
    salesLeads,
    greenApiConfig,
    salesGreenApiConfig
  });
});

app.post("/api/demo/dental/update-status", (req, res) => {
  const { id, status } = req.body;
  dentalAppointments = dentalAppointments.map(d => d.id === id ? { ...d, status } : d);
  saveStoredAppointments();
  res.json({ success: true, dentalAppointments });
});

app.post("/api/demo/beauty/update-status", (req, res) => {
  const { id, status } = req.body;
  beautyAppointments = beautyAppointments.map(b => b.id === id ? { ...b, status } : b);
  saveStoredAppointments();
  res.json({ success: true, beautyAppointments });
});

app.post("/api/sales/update-status", (req, res) => {
  const { id, status } = req.body;
  salesLeads = salesLeads.map(l => l.id === id ? { ...l, status } : l);
  saveStoredSalesLeads();
  res.json({ success: true, salesLeads });
});

app.post("/api/sales/add-lead", (req, res) => {
  const lead = req.body;
  if (!lead || !lead.clientName) {
    return res.status(400).json({ error: "Datos del prospecto requeridos" });
  }
  const newLead = {
    id: lead.id || `lead_${Date.now()}`,
    registrationDate: lead.registrationDate || new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    clientName: lead.clientName,
    whatsapp: lead.whatsapp || "+51 9",
    serviceInterest: lead.serviceInterest || "Combo Asistente IA + Web Gratis",
    businessType: lead.businessType || "Por calificar",
    lastMessage: lead.lastMessage || "Ingreso manual",
    status: lead.status || "🔥 Nuevo Lead",
    notes: lead.notes || "Agregado manualmente desde el panel comercial"
  };
  salesLeads.unshift(newLead);
  saveStoredSalesLeads();
  res.json({ success: true, lead: newLead, salesLeads });
});

// Endpoint: Webhook simulator / Live Incoming message receiver
app.post("/api/webhooks/incoming", async (req, res) => {
  try {
    const { channel, senderId, senderName, message, metadata } = req.body;
    console.log(`[Webhook Incoming] [${channel}] From: ${senderName} (${senderId}) - "${message}"`);
    
    // Process through demo engine if it's WhatsApp or testing
    const demoResult = await processDemoMessage(senderId || "+51 987 654 321", senderName || "Cliente", message || "");

    res.json({
      status: "received",
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      processed: true,
      demoResult
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Setup Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OmniFlow Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
