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

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.7-flash"];
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
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    const reply = response.text?.trim() || "Hola, ¿en qué podemos ayudarte?";

    res.json({
      reply,
      source: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
      contents: `${instruction}\n\n"${text}"\n\nDevuelve únicamente el texto mejorado sin comentarios adicionales ni comillas.`,
    });

    res.json({ enhancedText: response.text?.trim() || text });
  } catch (error: any) {
    console.error("Error in /api/ai/enhance-text:", error);
    res.json({ enhancedText: req.body.text });
  }
});

// In-memory demo states and Green-API configuration
interface GreenApiConfigState {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
  connectedPhone: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastPing?: string;
  lastWebhookReceived?: string;
  pollingEnabled?: boolean;
}

const GREEN_CONFIG_PATH = path.join(process.cwd(), "green_api_store.json");

function loadStoredGreenConfig(): Partial<GreenApiConfigState> {
  try {
    if (fs.existsSync(GREEN_CONFIG_PATH)) {
      const data = fs.readFileSync(GREEN_CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn("Could not read stored green config:", e);
  }
  return {};
}

function saveStoredGreenConfig(cfg: GreenApiConfigState) {
  try {
    fs.writeFileSync(GREEN_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save green config to disk:", e);
  }
}

const storedConfig = loadStoredGreenConfig();

let greenApiConfig: GreenApiConfigState = {
  idInstance: storedConfig.idInstance || process.env.GREEN_API_ID_INSTANCE || "710722724819",
  apiTokenInstance: storedConfig.apiTokenInstance || process.env.GREEN_API_TOKEN || "",
  apiUrl: storedConfig.apiUrl || process.env.GREEN_API_URL || "https://7107.api.greenapi.com",
  connectedPhone: storedConfig.connectedPhone || "+51 986 150 562",
  status: "connected",
  lastPing: new Date().toISOString(),
  pollingEnabled: true
};

// In-memory activity log for Green-API
interface GreenApiLogEntry {
  id: string;
  timestamp: string;
  type: 'incoming_webhook' | 'outgoing_send' | 'error' | 'diagnostic';
  sender?: string;
  phone?: string;
  text?: string;
  status: string;
  details?: any;
}

const greenApiLogs: GreenApiLogEntry[] = [];
function addGreenApiLog(entry: Omit<GreenApiLogEntry, 'id' | 'timestamp'>) {
  greenApiLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...entry
  });
  if (greenApiLogs.length > 50) greenApiLogs.pop();
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

// Background auto-polling worker (runs every 1.5 seconds)
setInterval(() => {
  if (greenApiConfig.pollingEnabled && greenApiConfig.idInstance && greenApiConfig.apiTokenInstance) {
    runGreenApiDrainBatch(5).catch(() => {});
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

loadStoredAppointments();

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
    session.isBookingCompleted = false;
    session.history = [];

    botReply = `¡Hola! 👋 Bienvenido a la Central de Pruebas de *Digital MYK Lab* (Línea Oficial +51 986 150 562).

Elige la demostración que deseas probar en vivo:

1️⃣ *Demo Odontología (Plan Esencial — S/ 490)*
   _Flujo estructurado rápido hacia Base de Datos / Google Sheets_

2️⃣ *Demo Centro de Belleza (Plan PRO ⭐ — S/ 890)*
   _IA Conversacional Mía 24/7 + CRM Visual Kanban con Login_

👉 *Responde con 1 o 2 para ingresar a la demo.*`;
  } 
  // 2. User chooses Option 1: Odontología (Plan Esencial)
  else if (wantsDemo1 && (session.currentDemo === 'menu' || isExplicitReset || session.isBookingCompleted || session.dentalStep === undefined)) {
    session.currentDemo = 'dental';
    session.dentalStep = 'treatment_select';
    session.isBookingCompleted = false;
    session.history = [];

    botReply = `¡Hola! 👋 Bienvenido a *Sonrisas VIP* (Plan Esencial).

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

    // Capitalize patient name cleanly
    patientName = patientName.replace(/^(mi nombre es|me llamo|soy)\s+/i, "").trim();

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

_💡 Tip: Escribe *menu* para probar otra demo o agendar nuevamente._`;
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

      // Name extraction
      const nameMatch = cleanText.match(/(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([A-Za-zÁÉÍÓÚáéíóúñ\s]+)/i);
      if (nameMatch && nameMatch[1].trim()) {
        session.beautyClientName = nameMatch[1].trim();
      } else if (!session.beautyClientName && cleanText.split(" ").length <= 3 && !lowerText.includes("pm") && !lowerText.includes("am") && !lowerText.includes("mañana") && !lowerText.includes("pedicure") && !lowerText.includes("manicure") && !lowerText.includes("corte") && !lowerText.includes("alisado")) {
        session.beautyClientName = cleanText.trim();
      }

      // Date / Time extraction
      if (lowerText.includes("pm") || lowerText.includes("am") || lowerText.includes(":") || lowerText.includes("mañana") || lowerText.includes("lunes") || lowerText.includes("martes") || lowerText.includes("miercoles") || lowerText.includes("miércoles") || lowerText.includes("jueves") || lowerText.includes("viernes") || lowerText.includes("sabado") || lowerText.includes("sábado") || lowerText.includes("domingo")) {
        session.beautyDateTime = cleanText.replace(/^(mi nombre es|me llamo|soy)\s+[A-Za-zÁÉÍÓÚáéíóúñ\s]+[,.\n]?/i, "").trim() || cleanText;
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
          detectedAppointment = {
            clientName: session.beautyClientName || (session.name !== 'Cliente' ? session.name : 'Salomé Linares'),
            service: service,
            amount: price,
            dateTime: dateTime
          };
          botReply = `¡Excelente, hermosa ${detectedAppointment.clientName}! 💖✨ Con mucho gusto he reservado tu espacio para consentirte.

🌸 *Resumen de tu Cita:*
👤 *Clienta:* ${detectedAppointment.clientName}
💅 *Servicio:* ${service}
📅 *Fecha y Hora:* ${dateTime}
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
          botReply += `\n\n_💡 Tip: Escribe *menu* para probar la Demo de Odontología o reiniciar._`;
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

// Endpoint: Green-API Configuration Get & Update
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

  // Persist to disk
  saveStoredGreenConfig(greenApiConfig);

  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Configuración Guardada en Servidor (idInstance: ${greenApiConfig.idInstance})`,
    details: { apiUrl: greenApiConfig.apiUrl, hasToken: !!greenApiConfig.apiTokenInstance, polling: greenApiConfig.pollingEnabled }
  });

  // Immediately kick off a drain batch in case messages are waiting
  runGreenApiDrainBatch(10).catch(() => {});

  res.json({ success: true, config: greenApiConfig });
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

    // Auto-sync instance id from payload if available
    if (body.instanceData?.idInstance) {
      greenApiConfig.idInstance = String(body.instanceData.idInstance);
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
        status: textMessage ? '📥 Mensaje Recibido de WhatsApp' : '⚠️ Mensaje sin texto reconocible',
        details: body
      });

      if (textMessage && senderPhone) {
        console.log(`[Green-API Message Incoming] De: ${senderName} (${senderPhone}): "${textMessage}"`);
        const result = await processDemoMessage(senderPhone, senderName, textMessage);
        return res.json({ status: "processed", result });
      }
    } else {
      addGreenApiLog({
        type: 'incoming_webhook',
        status: `ℹ️ Notificación: ${typeWebhook || 'Ping Event'}`,
        details: body
      });
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

// Endpoint: Live Data for Demos (Odontología & Belleza)
app.get("/api/demo/data", (req, res) => {
  res.json({
    dentalAppointments,
    beautyAppointments,
    greenApiConfig
  });
});

app.post("/api/demo/dental/update-status", (req, res) => {
  const { id, status } = req.body;
  dentalAppointments = dentalAppointments.map(d => d.id === id ? { ...d, status } : d);
  res.json({ success: true, dentalAppointments });
});

app.post("/api/demo/beauty/update-status", (req, res) => {
  const { id, status } = req.body;
  beautyAppointments = beautyAppointments.map(b => b.id === id ? { ...b, status } : b);
  res.json({ success: true, beautyAppointments });
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
