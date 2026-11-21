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
  replyMode?: 'poll_and_text' | 'interactive' | 'text_only';
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

const resolvedSalesId = storedSalesConfig.idInstance || process.env.SALES_GREEN_API_ID_INSTANCE || "710722803080";
const resolvedSalesToken = storedSalesConfig.apiTokenInstance || process.env.SALES_GREEN_API_TOKEN || "";
let salesGreenApiConfig: GreenApiConfigState = {
  idInstance: resolvedSalesId,
  apiTokenInstance: resolvedSalesToken,
  apiUrl: storedSalesConfig.apiUrl || process.env.SALES_GREEN_API_URL || "https://7107.api.greenapi.com",
  connectedPhone: storedSalesConfig.connectedPhone || "+51 929 327 654",
  status: (resolvedSalesId && resolvedSalesToken) ? "connected" : "disconnected",
  lastPing: new Date().toISOString(),
  pollingEnabled: storedSalesConfig.pollingEnabled !== undefined ? storedSalesConfig.pollingEnabled : true,
  autoRespondAll: storedSalesConfig.autoRespondAll !== undefined ? storedSalesConfig.autoRespondAll : true,
  replyMode: storedSalesConfig.replyMode || 'poll_and_text'
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

const processedGreenApiMessageIds = new Set<string>();
function markAndCheckDuplicateGreenMessage(idMessage?: string): boolean {
  if (!idMessage || typeof idMessage !== "string") return false;
  if (processedGreenApiMessageIds.has(idMessage)) return true;
  processedGreenApiMessageIds.add(idMessage);
  if (processedGreenApiMessageIds.size > 500) {
    const first = processedGreenApiMessageIds.values().next().value;
    if (first) processedGreenApiMessageIds.delete(first);
  }
  return false;
}

function normalizeGreenChatId(raw: string): string {
  return (raw || "").trim().replace(/:\d+(?=@)/, "");
}

function resolveGreenApiCandidates(senderData: any): { primaryChatId: string; altChatId?: string } {
  if (!senderData || typeof senderData !== "object") return { primaryChatId: "" };
  const rawList = [senderData.chatId, senderData.sender, senderData.senderId]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map(normalizeGreenChatId);
  const unique = Array.from(new Set(rawList));
  const cUs = unique.find(v => v.endsWith("@c.us"));
  const lid = unique.find(v => v.endsWith("@lid"));
  const primaryChatId = cUs || lid || unique[0] || "";
  const altChatId = unique.find(v => v !== primaryChatId && (v.endsWith("@c.us") || v.endsWith("@lid")));
  return { primaryChatId, altChatId };
}

function resolveGreenApiSender(senderData: any): string {
  return resolveGreenApiCandidates(senderData).primaryChatId;
}

function isIgnorableGreenApiChat(rawSender: string): boolean {
  if (!rawSender) return true;
  return (
    rawSender.endsWith("@g.us") ||
    rawSender === "status@broadcast" ||
    rawSender.endsWith("@newsletter")
  );
}

function deepFindMessageText(obj: any, depth = 0): string {
  if (!obj || typeof obj !== "object" || depth > 6) return "";
  const priorityKeys = [
    "buttonId",
    "selectedButtonId",
    "selectedId",
    "buttonText",
    "selectedDisplayText",
    "selectedRowId",
    "title",
    "textMessage",
    "text"
  ];
  for (const key of priorityKeys) {
    if (typeof obj[key] === "string" && obj[key].trim()) {
      return obj[key].trim();
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "quotedMessage" || k === "stanzaId" || k === "participant") continue;
    if (v && typeof v === "object") {
      const nested = deepFindMessageText(v, depth + 1);
      if (nested) return nested;
    }
  }
  return "";
}

function extractGreenApiMessageText(messageData: any, rawSender: string): string {
  if (!messageData || typeof messageData !== "object") return "";
  const typeMsg = messageData.typeMessage || "";

  // Never auto-reply to emoji reactions, deleted/protocol system events
  if (
    typeMsg === "reactionMessage" ||
    typeMsg === "deletedMessage" ||
    typeMsg === "revokedMessage" ||
    typeMsg === "protocolMessage"
  ) {
    return "";
  }

  if (typeMsg === "textMessage") {
    return messageData.textMessageData?.textMessage || "";
  }
  if (typeMsg === "extendedTextMessage") {
    return messageData.extendedTextMessageData?.text || "";
  }
  if (typeMsg === "quotedMessage") {
    return (
      messageData.extendedTextMessageData?.text ||
      messageData.textMessageData?.textMessage ||
      messageData.interactiveButtonsResponse?.buttonId ||
      messageData.interactiveButtonsResponse?.buttonText ||
      messageData.templateButtonReplyMessage?.selectedId ||
      messageData.templateButtonReplyMessage?.selectedDisplayText ||
      messageData.templateButtonsReplyMessage?.selectedId ||
      messageData.templateButtonsReplyMessage?.selectedDisplayText ||
      messageData.quotedMessage?.text ||
      deepFindMessageText(messageData) ||
      ""
    );
  }
  if (typeMsg === "interactiveButtonsResponse" || typeMsg === "interactiveButtonsReply") {
    const payload =
      messageData.interactiveButtonsResponse ||
      messageData.interactiveButtonsReply ||
      messageData.interactiveButtons ||
      messageData;
    const direct =
      payload?.buttonId ||
      payload?.selectedButtonId ||
      payload?.selectedId ||
      payload?.buttonText ||
      payload?.selectedDisplayText ||
      payload?.text;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    return deepFindMessageText(messageData);
  }
  if (typeMsg === "buttonsResponseMessage" && messageData.buttonsResponseMessage) {
    return (
      messageData.buttonsResponseMessage.selectedButtonId ||
      messageData.buttonsResponseMessage.selectedDisplayText ||
      deepFindMessageText(messageData.buttonsResponseMessage) ||
      ""
    );
  }
  if (typeMsg === "templateButtonReplyMessage" || typeMsg === "templateButtonsReplyMessage") {
    const tpl = messageData.templateButtonReplyMessage || messageData.templateButtonsReplyMessage || {};
    return (
      tpl.selectedId ||
      tpl.selectedButtonId ||
      tpl.selectedDisplayText ||
      tpl.buttonText ||
      deepFindMessageText(tpl) ||
      ""
    );
  }
  if (typeMsg === "listResponseMessage" && messageData.listResponseMessage) {
    return (
      messageData.listResponseMessage.singleSelectReply?.selectedRowId ||
      messageData.listResponseMessage.title ||
      messageData.listResponseMessage.description ||
      ""
    );
  }
  if (typeMsg === "pollUpdateMessage" && messageData.pollMessageData?.votes) {
    const votes = messageData.pollMessageData.votes as Array<{ optionName: string; optionVoters?: string[] }>;
    const senderClean = (rawSender || "").replace(/@.*$/, "");
    const picked =
      votes.find(v =>
        Array.isArray(v.optionVoters) &&
        v.optionVoters.some(voter => voter === rawSender || voter.replace(/@.*$/, "") === senderClean)
      ) ||
      votes.find(v => Array.isArray(v.optionVoters) && v.optionVoters.length > 0);
    if (picked?.optionName) return picked.optionName;
  }
  if (typeMsg === "imageMessage" || typeMsg === "documentMessage") {
    const caption = messageData.fileMessageData?.caption || messageData.caption || "";
    return caption.trim() ? `${caption.trim()} [Comprobante Adjunto]` : "[Comprobante / Imagen adjunta]";
  }
  if (typeMsg === "videoMessage") {
    const caption = messageData.fileMessageData?.caption || messageData.caption || "";
    return caption.trim() ? caption.trim() : "Hola";
  }
  if (typeMsg === "audioMessage" || typeMsg === "pttMessage" || typeMsg === "stickerMessage" || typeMsg === "locationMessage" || typeMsg === "contactMessage" || typeMsg === "contactsArrayMessage") {
    return "Hola";
  }
  if (typeof messageData.textMessage === "string" && messageData.textMessage.trim()) {
    return messageData.textMessage.trim();
  }
  const deepFound = deepFindMessageText(messageData);
  if (deepFound) return deepFound;
  // For any valid incoming customer message type (e.g. ephemeralMessage / viewOnceMessage) ensure bot still responds
  return typeMsg ? "Hola" : "";
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

    const isIncomingCustomerMsg = typeWebhook === "incomingMessageReceived" || (!typeWebhook && !!body.messageData);
    if (isIncomingCustomerMsg) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const rawSender = resolveGreenApiSender(senderData);
      const isGroupOrStatus = isIgnorableGreenApiChat(rawSender);
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Cliente WhatsApp";

      if (!isGroupOrStatus && senderPhone && !markAndCheckDuplicateGreenMessage(body.idMessage)) {
        const textMessage = extractGreenApiMessageText(messageData, rawSender);

        addGreenApiLog({
          type: 'incoming_webhook',
          phone: senderPhone,
          sender: senderName,
          text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
          status: textMessage ? '📥 Mensaje Recibido (Auto-Receiver)' : 'ℹ️ Mensaje Multimedia',
          details: body
        });

        if (textMessage) {
          console.log(`[Auto-Receiver Processing] De: ${senderName} (${rawSender}): "${textMessage}"`);
          await processDemoMessage(senderPhone, senderName, textMessage, rawSender);
        }
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
let lastSalesPollErrorLogAt = 0;
async function fetchAndProcessSalesNotification(): Promise<boolean> {
  const id = (salesGreenApiConfig.idInstance || "").trim();
  const token = (salesGreenApiConfig.apiTokenInstance || "").trim();
  if (!id || !token) return false;

  const baseUrl = getGreenApiBaseUrl(id, salesGreenApiConfig.apiUrl);
  const receiveUrl = `${baseUrl}/waInstance${id}/receiveNotification/${token}`;

  try {
    const res = await fetch(receiveUrl, { method: "GET" });
    if (!res.ok) {
      if (Date.now() - lastSalesPollErrorLogAt > 60000) {
        lastSalesPollErrorLogAt = Date.now();
        addGreenApiLog({
          type: 'error',
          status: `🔴 Polling HTTP ${res.status} en Línea 929 327 654 (verifica token o plan Green-API)`
        }, 'sales');
      }
      return false;
    }

    const data: any = await res.json().catch(() => null);
    if (!data || !data.receiptId) return false;

    const receiptId = data.receiptId;
    const body = data.body || {};
    const typeWebhook = body.typeWebhook || "";

    const isIncomingSalesMsg = typeWebhook === "incomingMessageReceived" || (!typeWebhook && !!body.messageData);
    if (isIncomingSalesMsg) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const { primaryChatId: rawSender, altChatId } = resolveGreenApiCandidates(senderData);
      const isGroupOrStatus = isIgnorableGreenApiChat(rawSender);
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Prospecto WhatsApp";

      if (!isGroupOrStatus && senderPhone && !markAndCheckDuplicateGreenMessage(body.idMessage)) {
        const textMessage = extractGreenApiMessageText(messageData, rawSender);

        addGreenApiLog({
          type: 'incoming_webhook',
          phone: rawSender.endsWith("@lid") ? `${senderPhone} (LID)` : senderPhone,
          sender: senderName,
          text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
          status: textMessage ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : 'ℹ️ Mensaje sin respuesta requerida',
          details: body
        }, 'sales');

        if (textMessage) {
          console.log(`[Sales Line Auto-Receiver] De: ${senderName} (${rawSender}): "${textMessage}"`);
          await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId);
        }
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
  replyChatId?: string;
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
  replyChatId?: string;
  altChatId?: string;
  phone: string;
  name: string;
  serviceInterest: string;
  businessType?: string;
  history: Array<{ sender: 'user' | 'bot'; text: string; timestamp: string }>;
  lastActivity: string;
}

const salesSessions = new Map<string, SalesSessionState>();

interface SalesButtonOption {
  buttonId: string;
  buttonText: string;
}

const DIGITAL_MYK_PAYMENT_DETAILS = `👤 *Titular:* Maycol Castañeda

🟣 *Yape:* 929327654
🔵 *Plin:* 921034349

🏛️ *Banco de la Nación*
• N° Cuenta: 04765342509
• CCI: 018-765-004765342509-81

🔴 *Scotiabank (Cuenta Ahorro Soles)*
• N° Cuenta: 8330613655
• CCI: 00972420833061365561`;

const DIGITAL_MYK_SOCIAL_CATALOG = `CATALOGO OFICIAL CRECIMIENTO REDES SOCIALES (Pedidos desde S/ 10 por transaccion; los tramos economicos de S/ 5 o S/ 6 se combinan entre si en el mismo enlace o distintos para alcanzar el minimo de S/ 10):

1. TIKTOK (desde S/ 10):
- Seguidores: 500 S/ 12 | 1K S/ 22 | 3K S/ 60 | 5K S/ 95
- Espectadores En Vivo: 30 min S/ 35 | 1 hora S/ 65 | 1h 30m S/ 95
- Likes (combinables desde S/ 10): 1K S/ 10 | 3K S/ 22 | 5K S/ 35 (Opcional combinar: 500 likes S/ 6)
- Vistas (combinables desde S/ 10): 2K S/ 10 | 5K S/ 18 | 10K S/ 32 (Opcional combinar: 1K vistas S/ 6)
- Comentarios personalizados: 100 S/ 10 | 300 S/ 22 | 500 S/ 35 | 1K S/ 65

2. INSTAGRAM (desde S/ 10):
- Seguidores: 500 S/ 12 | 1K S/ 22 | 3K S/ 60 | 5K S/ 95
- Visualizaciones En Vivo: 500 S/ 10 | 1K S/ 16 | 3K S/ 40 | 5K S/ 65
- Likes (combinables desde S/ 10): 2K S/ 10 | 5K S/ 22 | 10K S/ 40 (Opcional combinar: 1K likes S/ 6)
- Vistas (combinables desde S/ 10): 2K S/ 10 | 5K S/ 18 | 10K S/ 32 (Opcional combinar: 1K vistas S/ 6)
- Comentarios personalizados: 500 S/ 18 | 1K S/ 30 | 3K S/ 80

3. FACEBOOK (desde S/ 10):
- Seguidores: 500 S/ 12 | 1K S/ 22 | 3K S/ 60 | 5K S/ 95
- Transmision En Vivo: 60 min S/ 45 | 10 horas S/ 95
- Likes (combinables desde S/ 10): 1K S/ 10 | 3K S/ 25 | 5K S/ 40 (Opcional combinar: 500 likes S/ 6)
- Comentarios personalizados: 100 S/ 10 | 300 S/ 22 | 500 S/ 35
- Vistas (combinables desde S/ 10): 2K S/ 10 | 5K S/ 18 | 10K S/ 32 (Opcional combinar: 1K vistas S/ 6)

4. YOUTUBE (desde S/ 10):
- Suscriptores / Seguidores: 100 S/ 10 | 500 S/ 35 | 1K S/ 65
- Comentarios aleatorios (combinables desde S/ 10): 100 S/ 10 | 500 S/ 25 | 1K S/ 45
- Likes (combinables desde S/ 10): 300 S/ 10 | 500 S/ 14 | 1K S/ 25 (Opcional combinar: 100 likes S/ 5)
- Visualizaciones En Vivo: 1K S/ 12 | 5K S/ 40 | 10K S/ 85
- Vistas (combinables desde S/ 10): 300 S/ 10 | 500 S/ 14 | 1K S/ 22 (Opcional combinar: 100 vistas S/ 5)`;

function isSocialMediaService(service: string): boolean {
  return (
    service.includes("TikTok") ||
    service.includes("Instagram") ||
    service.includes("Facebook") ||
    service.includes("YouTube") ||
    service.includes("Redes Sociales")
  );
}

function detectDigitalMykServiceIntent(lowerText: string): string {
  if (lowerText === "btn_tiktok" || lowerText.includes("tiktok") || lowerText.includes("tik tok")) {
    return "Crecimiento TikTok";
  }
  if (lowerText === "btn_instagram" || lowerText.includes("instagram") || lowerText.includes("insta") || lowerText.includes("ig ")) {
    return "Crecimiento Instagram";
  }
  if (lowerText === "btn_facebook" || lowerText.includes("facebook") || lowerText.includes("fb ")) {
    return "Crecimiento Facebook";
  }
  if (lowerText === "btn_youtube" || lowerText.includes("youtube") || lowerText.includes("suscriptor") || lowerText.includes("yt ")) {
    return "Crecimiento YouTube";
  }
  if (
    lowerText === "btn_social" ||
    lowerText === "btn_fb_yt" ||
    lowerText === "btn_social_combo" ||
    lowerText.includes("seguidor") ||
    lowerText.includes("like") ||
    lowerText.includes("vista") ||
    lowerText.includes("reproduccion") ||
    lowerText.includes("reproducción") ||
    lowerText.includes("espectador") ||
    lowerText.includes("en vivo") ||
    lowerText.includes("comentario") ||
    lowerText.includes("redes") ||
    lowerText.includes("pack inicio")
  ) {
    return "Redes Sociales (S/ 10+)";
  }
  if (
    lowerText === "btn_combo" ||
    lowerText.includes("gratis") ||
    lowerText.includes("oferta") ||
    lowerText.includes("combo") ||
    lowerText.includes("promo") ||
    lowerText.includes("pack") ||
    lowerText.includes("ia + web")
  ) {
    return "Combo Asistente IA + Web Gratis";
  }
  if (
    lowerText === "btn_app" ||
    lowerText.includes("app") ||
    lowerText.includes("aplicacion") ||
    lowerText.includes("aplicación") ||
    lowerText.includes("movil") ||
    lowerText.includes("móvil") ||
    lowerText.includes("android") ||
    lowerText.includes("ios") ||
    lowerText.includes("sistema")
  ) {
    return "App a la Medida";
  }
  if (
    lowerText === "btn_chatbot" ||
    lowerText.includes("chatbot") ||
    lowerText.includes("bot") ||
    lowerText.includes("asistente") ||
    lowerText.includes("automatiz")
  ) {
    return "Chatbot IA 24/7";
  }
  if (
    lowerText === "btn_web" ||
    lowerText.includes("web") ||
    lowerText.includes("pagina") ||
    lowerText.includes("página") ||
    lowerText.includes("sitio") ||
    lowerText.includes("landing") ||
    lowerText.includes("seo") ||
    lowerText.includes("digitalmyklab") ||
    lowerText.includes("render")
  ) {
    return "Web Profesional PRO";
  }
  return "Información General de Servicios";
}

function getDefaultEstimatedValue(service: string): number {
  if (service === "App a la Medida") return 2800;
  if (service === "Combo Asistente IA + Web Gratis") return 1490;
  if (service === "Chatbot IA 24/7") return 1200;
  if (service === "Web Profesional PRO") return 950;
  if (isSocialMediaService(service)) return 22;
  return 1200;
}

function detectSalesButtonAction(cleanText: string): string | null {
  const lower = cleanText.toLowerCase().trim();

  if (lower === "btn_voucher" || lower.includes("ya realicé el pago") || lower.includes("ya realice el pago") || lower.includes("ya pague") || lower.includes("ya pagué") || lower.includes("comprobante") || lower.includes("voucher") || lower.includes("constancia")) {
    return "btn_voucher";
  }
  if (lower === "btn_pay" || lower === "btn_start" || lower === "5" || lower.includes("medios de pago") || lower.includes("ver cuentas") || lower.includes("cuentas / yape") || lower.includes("ver yape") || lower.includes("pagar con yape") || lower.includes("yape") || lower.includes("plin") || lower.includes("scotiabank") || lower.includes("nacion") || lower.includes("nación") || lower.includes("cci") || lower.includes("deposito") || lower.includes("depósito") || lower.includes("transferencia") || lower.includes("pagar") || lower.includes("cuenta bancaria") || lower.includes("iniciar proyecto") || lower.includes("contratar plan") || lower.includes("cotizar mi app") || lower.includes("solicitar web")) {
    return "btn_pay";
  }
  if (lower === "btn_advisor" || lower.includes("asesor directo") || lower.includes("hablar con maycol") || lower.includes("consultar asesor") || lower.includes("coordinar inicio") || lower.includes("enviar mi link") || lower.includes("humano")) {
    return "btn_advisor";
  }
  if (lower === "btn_social_combo" || lower.includes("armar combo") || lower.includes("pack / combo") || lower.includes("pack inicio")) {
    return "btn_social_combo";
  }
  if (lower === "btn_fb_yt" || lower.includes("fb y") || lower.includes("facebook y youtube")) {
    return "btn_fb_yt";
  }
  if (lower === "btn_tiktok" || lower === "tiktok" || lower === "tik tok" || lower.includes("tiktok (desde")) {
    return "btn_tiktok";
  }
  if (lower === "btn_instagram" || lower === "instagram" || lower.includes("instagram (s/10")) {
    return "btn_instagram";
  }
  if (lower === "btn_facebook" || lower === "facebook" || lower.includes("facebook (s/10")) {
    return "btn_facebook";
  }
  if (lower === "btn_youtube" || lower === "youtube" || lower.includes("youtube (s/10")) {
    return "btn_youtube";
  }
  if (lower === "btn_social" || lower.includes("redes sociales") || lower.includes("ver otras redes") || lower.includes("catálogo redes") || lower.includes("catalogo redes") || lower === "redes" || lower === "seguidores" || lower === "likes" || lower === "vistas" || lower === "comentarios") {
    return "btn_social";
  }
  if (lower === "btn_tech" || lower.includes("ia, webs y apps") || lower.includes("soluciones ia")) {
    return "btn_tech";
  }
  if (lower === "btn_services" || lower.includes("ver servicios") || lower.includes("todos servicios") || lower.includes("portafolio")) {
    return "btn_services";
  }
  if (lower === "btn_combo" || lower === "4" || lower.includes("ia + web gratis") || lower.includes("ver plan ia + web") || lower.includes("oferta ia + web") || lower.includes("plan ia + web")) {
    return "btn_combo";
  }
  if (lower === "btn_chatbot" || lower === "1" || lower.includes("chatbots ia 24/7")) {
    return "btn_chatbot";
  }
  if (lower === "btn_app" || lower === "2" || lower.includes("app a la medida")) {
    return "btn_app";
  }
  if (lower === "btn_web" || lower === "3" || lower.includes("web profesional pro")) {
    return "btn_web";
  }
  return null;
}

function buildProButtonResponse(action: string | null, cleanText: string, senderName: string, detectedService: string): {
  reply: string;
  buttons: SalesButtonOption[];
  stageOverride?: '🔥 Nuevo Lead' | '💬 En Asesoría' | '📄 Cotizado' | '💳 Pago / Cierre' | '✅ Cerrado';
  paymentStatusOverride?: 'Pendiente' | 'Por Verificar' | 'Confirmado';
  paymentMethodOverride?: string;
} {
  const greetingName = (senderName && senderName !== "Prospecto WhatsApp" && senderName !== "Cliente") ? ` ${senderName}` : "";

  if (action === "btn_voucher") {
    const lower = cleanText.toLowerCase();
    let method = "Por confirmar";
    if (lower.includes("yape")) method = "Yape (929327654)";
    else if (lower.includes("plin")) method = "Plin (921034349)";
    else if (lower.includes("scotiabank")) method = "Scotiabank";
    else if (lower.includes("nacion") || lower.includes("nación")) method = "Banco de la Nación";

    return {
      reply: `¡Muchas gracias${greetingName}! ✅ Hemos registrado tu notificación de abono en nuestro sistema comercial.\n\nEl equipo de proyectos de *Digital MYK Lab* (a cargo de *Maycol Castañeda*) verificará el comprobante de inmediato y te escribirá por esta misma línea para iniciar el levantamiento de requerimientos y cronograma de entrega.`,
      buttons: [
        { buttonId: "btn_advisor", buttonText: "📅 Coordinar Inicio" },
        { buttonId: "btn_services", buttonText: "💼 Ver Servicios" },
        { buttonId: "btn_pay", buttonText: "💳 Ver Cuentas" }
      ],
      stageOverride: "💳 Pago / Cierre",
      paymentStatusOverride: "Por Verificar",
      paymentMethodOverride: method !== "Por confirmar" ? method : undefined
    };
  }

  if (action === "btn_pay") {
    return {
      reply: `Para iniciar tu proyecto o realizar tu depósito con total respaldo, te compartimos nuestras cuentas oficiales de *Digital MYK Lab*:\n\n${DIGITAL_MYK_PAYMENT_DETAILS}\n\n📲 Una vez realizado el depósito, envíanos la captura del comprobante por aquí o presiona *✅ Ya realicé el pago*.`,
      buttons: [
        { buttonId: "btn_voucher", buttonText: "✅ Ya realicé el pago" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Hablar con Maycol" },
        { buttonId: "btn_services", buttonText: "💼 Ver Servicios" }
      ],
      stageOverride: "💳 Pago / Cierre"
    };
  }

  if (action === "btn_advisor") {
    return {
      reply: `Perfecto${greetingName} ✅ Tu requerimiento ha sido asignado directamente a *Maycol Castañeda — Dirección de Proyectos en Digital MYK Lab*.\n\nEn breve nos pondremos en contacto contigo por esta línea para brindarte asesoría ejecutiva y cerrar los detalles técnicos de tu implementación.\n\n🌐 Web Corporativa: https://digitalmyklab.onrender.com/\n✉️ Correo: compumasster@gmail.com`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
        { buttonId: "btn_services", buttonText: "💼 Portafolio" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_services") {
    return {
      reply: `Nuestro portafolio oficial en *Digital MYK Lab* (_Seguridad y Garantía_) abarca dos grandes líneas para hacer crecer tu marca:\n\n🤖 *Soluciones Tecnológicas:* Chatbots IA 24/7, Apps a la Medida, Webs Profesionales PRO y Plan IA + Web Gratis.\n📈 *Crecimiento en Redes Sociales (desde S/ 10):* Seguidores, Likes, Vistas, Comentarios y Espectadores En Vivo para TikTok, Instagram, Facebook y YouTube.\n\nElige qué área deseas explorar:`,
      buttons: [
        { buttonId: "btn_tech", buttonText: "🤖 IA, Webs y Apps" },
        { buttonId: "btn_social", buttonText: "📈 Redes Sociales S/10" },
        { buttonId: "btn_combo", buttonText: "🎁 Plan IA + Web Gratis" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_tech") {
    return {
      reply: `🤖 *Soluciones Tecnológicas Empresariales — Digital MYK Lab*\n\nAutomatizamos tus ventas y presencia digital con infraestructura cloud de alto rendimiento:\n\n1️⃣ *Chatbots IA 24/7* (WhatsApp + CRM)\n2️⃣ *Aplicaciones Móviles y Web a la Medida*\n3️⃣ *Páginas Web Profesionales PRO* (SSL + SEO)\n4️⃣ *Plan Estrella:* Asistente IA 24/7 + Web Gratis\n\nSelecciona una solución para ver detalles:`,
      buttons: [
        { buttonId: "btn_chatbot", buttonText: "🤖 Chatbots IA 24/7" },
        { buttonId: "btn_app", buttonText: "📱 App a la Medida" },
        { buttonId: "btn_web", buttonText: "🌐 Web Profesional PRO" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_social") {
    return {
      reply: `📈 *Impulso & Crecimiento en Redes Sociales — Desde S/ 10* 🚀\n\nTrabajamos con paquetes claros desde *S/ 10* por transacción para *TikTok, Instagram, Facebook y YouTube*.\n\n💡 *Tip:* Con pedidos desde *S/ 10* puedes *armar un combo* (por ejemplo, vistas + likes en el mismo video o enlaces distintos) para lograr interacción completa.\n\nSelecciona tu red social para ver todos los paquetes:`,
      buttons: [
        { buttonId: "btn_tiktok", buttonText: "🎵 TikTok (desde S/10)" },
        { buttonId: "btn_instagram", buttonText: "📸 Instagram (S/10+)" },
        { buttonId: "btn_fb_yt", buttonText: "📘 FB y 🔴 YouTube" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_fb_yt") {
    return {
      reply: `📘 *Facebook* & 🔴 *YouTube* — Paquetes desde *S/ 10*\n\nElige la plataforma que deseas potenciar o arma tu combo personalizado desde S/ 10:`,
      buttons: [
        { buttonId: "btn_facebook", buttonText: "📘 Facebook (S/10+)" },
        { buttonId: "btn_youtube", buttonText: "🔴 YouTube (S/10+)" },
        { buttonId: "btn_social_combo", buttonText: "🔥 Armar Combo S/10" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_tiktok") {
    return {
      reply: `📱 *1. TikTok — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:*\n• 500 — *S/ 12*  |  1K — *S/ 22*\n• 3K — *S/ 60*   |  5K — *S/ 95*\n\n📺 *Espectadores En Vivo:*\n• 30 min — *S/ 35*  |  1 hora — *S/ 65*  |  1h 30m — *S/ 95*\n\n❤️ *Likes* _(combinables desde S/ 10)_:\n• 1K — *S/ 10*  |  3K — *S/ 22*  |  5K — *S/ 35*\n• _Para combinar: 500 likes a S/ 6_\n\n👁️ *Vistas* _(combinables desde S/ 10)_:\n• 2K — *S/ 10*  |  5K — *S/ 18*  |  10K — *S/ 32*\n• _Para combinar: 1K vistas a S/ 6_\n\n💬 *Comentarios personalizados:*\n• 100 — *S/ 10* | 300 — *S/ 22* | 500 — *S/ 35* | 1K — *S/ 65*\n\n👇 Elige cómo continuar:`,
      buttons: [
        { buttonId: "btn_social_combo", buttonText: "🔥 Pack / Combo S/10" },
        { buttonId: "btn_pay", buttonText: "💳 Pagar con Yape/Plin" },
        { buttonId: "btn_social", buttonText: "📲 Ver Otras Redes" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_instagram") {
    return {
      reply: `📸 *2. Instagram — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:*\n• 500 — *S/ 12*  |  1K — *S/ 22*\n• 3K — *S/ 60*   |  5K — *S/ 95*\n\n📺 *Visualizaciones En Vivo:*\n• 500 — *S/ 10* | 1K — *S/ 16* | 3K — *S/ 40* | 5K — *S/ 65*\n\n❤️ *Likes* _(combinables desde S/ 10)_:\n• 2K — *S/ 10*  |  5K — *S/ 22*  |  10K — *S/ 40*\n• _Para combinar: 1K likes a S/ 6_\n\n👁️ *Vistas* _(combinables desde S/ 10)_:\n• 2K — *S/ 10*  |  5K — *S/ 18*  |  10K — *S/ 32*\n• _Para combinar: 1K vistas a S/ 6_\n\n💬 *Comentarios personalizados:*\n• 500 — *S/ 18* | 1K — *S/ 30* | 3K — *S/ 80*\n\n👇 Elige cómo continuar:`,
      buttons: [
        { buttonId: "btn_social_combo", buttonText: "🔥 Pack / Combo S/10" },
        { buttonId: "btn_pay", buttonText: "💳 Pagar con Yape/Plin" },
        { buttonId: "btn_social", buttonText: "📲 Ver Otras Redes" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_facebook") {
    return {
      reply: `📘 *3. Facebook — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:*\n• 500 — *S/ 12*  |  1K — *S/ 22*\n• 3K — *S/ 60*   |  5K — *S/ 95*\n\n📺 *Transmisión En Vivo:*\n• 60 minutos — *S/ 45*  |  10 horas — *S/ 95*\n\n👍 *Likes* _(combinables desde S/ 10)_:\n• 1K — *S/ 10*  |  3K — *S/ 25*  |  5K — *S/ 40*\n• _Para combinar: 500 likes a S/ 6_\n\n👁️ *Vistas* _(combinables desde S/ 10)_:\n• 2K — *S/ 10*  |  5K — *S/ 18*  |  10K — *S/ 32*\n• _Para combinar: 1K vistas a S/ 6_\n\n💬 *Comentarios personalizados:*\n• 100 — *S/ 10* | 300 — *S/ 22* | 500 — *S/ 35*\n\n👇 Elige cómo continuar:`,
      buttons: [
        { buttonId: "btn_social_combo", buttonText: "🔥 Pack / Combo S/10" },
        { buttonId: "btn_pay", buttonText: "💳 Pagar con Yape/Plin" },
        { buttonId: "btn_social", buttonText: "📲 Ver Otras Redes" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_youtube") {
    return {
      reply: `🔴 *4. YouTube — Catálogo Oficial (desde S/ 10)*\n\n🔔 *Suscriptores / Seguidores:*\n• 100 — *S/ 10*  |  500 — *S/ 35*  |  1K — *S/ 65*\n\n💬 *Comentarios aleatorios* _(combinables desde S/ 10)_:\n• 100 — *S/ 10*  |  500 — *S/ 25*  |  1K — *S/ 45*\n\n👍 *Likes* _(combinables desde S/ 10)_:\n• 300 — *S/ 10* | 500 — *S/ 14* | 1K — *S/ 25*\n• _Para combinar: 100 likes a S/ 5_\n\n📺 *Visualizaciones En Vivo:*\n• 1K — *S/ 12*  |  5K — *S/ 40*  |  10K — *S/ 85*\n\n👁️ *Vistas* _(combinables desde S/ 10)_:\n• 300 — *S/ 10* | 500 — *S/ 14* | 1K — *S/ 22*\n• _Para combinar: 100 vistas a S/ 5_\n\n👇 Elige cómo continuar:`,
      buttons: [
        { buttonId: "btn_social_combo", buttonText: "🔥 Pack / Combo S/10" },
        { buttonId: "btn_pay", buttonText: "💳 Pagar con Yape/Plin" },
        { buttonId: "btn_social", buttonText: "📲 Ver Otras Redes" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_social_combo") {
    return {
      reply: `🔥 *Armar Combo / Pack Inicio (desde S/ 10)*\n\nCon pedidos desde *S/ 10* puedes combinar dos o más servicios (en el mismo enlace o distintos) para que tu publicación tenga interacción completa:\n\n✨ *Ejemplos de Combos Listos:*\n• *YouTube Pack S/ 10:* 100 Likes (S/ 5) + 100 Vistas (S/ 5) = *S/ 10*\n• *TikTok / IG / FB Mix S/ 12:* 500 Likes (S/ 6) + 1K Vistas (S/ 6) = *S/ 12*\n• *Cualquier Paquete Directo:* desde *S/ 10* en adelante.\n\n📲 Escríbenos el *paquete que deseas + el enlace (link)* de tu perfil o video, o presiona *Ver Yape / Cuentas* para activarlo hoy mismo:`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Ver Yape / Cuentas" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Enviar Mi Link" },
        { buttonId: "btn_social", buttonText: "📲 Ver Catálogo Redes" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_combo" || detectedService === "Combo Asistente IA + Web Gratis") {
    return {
      reply: `🎁 *Plan Integral: Asistente IA 24/7 + Sitio Web Profesional*${greetingName}\n\nAl implementar tu *Asistente Virtual con Inteligencia Artificial 24/7* en *Digital MYK Lab*, incluimos tu *Sitio Web Profesional TOTALMENTE GRATIS* _(consultar condiciones para dominio/hosting externos)_.\n\n✅ *Asistente IA 24/7:* Atención en menos de 1 minuto, calificación de clientes y registro automático en CRM / Agenda.\n✅ *Web Profesional PRO:* Diseño corporativo, Certificado SSL incluido, SEO para Google y enlace directo a WhatsApp.\n✅ *Garantía Real:* Infraestructura con 99.9% Uptime y soporte continuo 24/7/365.\n\nPresiona un botón para continuar:`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Cuentas / Yape" },
        { buttonId: "btn_start", buttonText: "🚀 Contratar Plan" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_chatbot" || detectedService === "Chatbot IA 24/7") {
    return {
      reply: `🤖 *Chatbots & Automatización IA 24/7 — Digital MYK Lab*\n\nImplementamos asistentes inteligentes en tu WhatsApp y redes sociales para que no pierdas ni un solo cliente:\n\n✅ *Atención Inmediata 24/7:* Respuesta en menos de 1 minuto todos los días del año.\n✅ *Calificación & CRM Automático:* Registra nombre, teléfono, requerimiento y etapa comercial en tiempo real.\n✅ *Agendamiento & Pagos:* Guía al cliente con botones hasta la reserva o depósito.\n\n🎁 *Beneficio Vigente:* Al contratar tu Asistente IA 24/7, te llevas tu *Sitio Web Profesional GRATIS* _(consultar dominio/hosting)_.\n\nElige cómo continuar:`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Cuentas / Yape" },
        { buttonId: "btn_start", buttonText: "🚀 Iniciar Proyecto" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_app" || detectedService === "App a la Medida") {
    return {
      reply: `📱 *Desarrollo de Aplicaciones a la Medida — Digital MYK Lab*\n\nConstruimos la aplicación web o móvil que tu empresa necesita para tener el control operativo total:\n\n✅ *Panel de Ventas y Reportes en Tiempo Real*\n✅ *Gestión de Pedidos, Inventario, Catálogo y Clientes*\n✅ *Arquitectura Segura, Rápida y Escalable* con notificaciones automáticas\n✅ *Asesoría Gratuita, Entrega Puntual y Soporte Continuo*\n\nSelecciona una opción:`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_start", buttonText: "🚀 Cotizar Mi App" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_web" || detectedService === "Web Profesional PRO") {
    return {
      reply: `🌐 *Páginas Web Profesionales de Alto Rendimiento — Digital MYK Lab*\n\nDiseñamos sitios corporativos orientados a conversión y posicionamiento en buscadores:\n\n✅ *Velocidad Ultrarrápida:* Código moderno alojado en infraestructura cloud de alto rendimiento.\n✅ *Máxima Seguridad:* Certificado SSL incluido 🔒.\n✅ *SEO Estratégico:* Optimización técnica para destacar en Google 📈.\n✅ *Conversión Directa:* Botones conectados directamente a tu WhatsApp.\n\n🔗 Web oficial: https://digitalmyklab.onrender.com/\n\nSelecciona una opción:`,
      buttons: [
        { buttonId: "btn_combo", buttonText: "🎁 Ver Plan IA + Web" },
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "💬 En Asesoría"
    };
  }

  // Default welcome / immediate reply to ANY word
  return {
    reply: `Hola${greetingName}, bienvenido a *Digital MYK Lab* — _Seguridad y Garantía_ 🛡️\n\nImpulsamos tu marca con soluciones digitales completas:\n\n🤖 *Chatbots IA 24/7, Apps a la Medida & Webs PRO*\n🎁 *Plan Integral: Asistente IA 24/7 + Web Profesional GRATIS*\n📈 *Crecimiento Redes Sociales (desde S/ 10):* Seguidores, Likes, Vistas, Comentarios y En Vivo (TikTok, Instagram, Facebook y YouTube)\n\nPresiona un botón para responder de forma rápida 👇:`,
    buttons: [
      { buttonId: "btn_tech", buttonText: "🤖 IA, Webs y Apps" },
      { buttonId: "btn_social", buttonText: "📈 Redes Sociales S/10" },
      { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" }
    ]
  };
}

async function sendSalesToSingleChatId(
  targetChatId: string,
  header: string,
  body: string,
  footer: string,
  cleanButtons: SalesButtonOption[]
): Promise<{ status: string; httpStatus?: number; data: any; mode: 'poll_and_text' | 'buttons' | 'text_fallback'; errorDetail?: string; usedChatId: string }> {
  const cleanHeader = (header || "").trim().slice(0, 60);
  const cleanFooter = (footer || "").trim().slice(0, 60);
  const replyMode = salesGreenApiConfig.replyMode || 'poll_and_text';
  const headerPrefix = cleanHeader ? `*${cleanHeader}*\n\n` : "";

  const textUrl = getGreenApiUrl(
    salesGreenApiConfig.idInstance,
    salesGreenApiConfig.apiTokenInstance,
    "sendMessage",
    salesGreenApiConfig.apiUrl
  );

  // Mode 1 (Default): Guaranteed sendMessage + native WhatsApp sendPoll (100% delivery on brand-new numbers & @lid)
  if (replyMode === 'poll_and_text') {
    const sendRes = await fetch(textUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: targetChatId, message: `${headerPrefix}${body}` })
    });
    const sendJson: any = await sendRes.json().catch(() => ({}));

    if (sendRes.status === 466) {
      return {
        status: "error_466",
        httpStatus: 466,
        data: sendJson,
        mode: 'poll_and_text',
        errorDetail: sendJson?.message || "Límite mensual de chats del plan Developer excedido",
        usedChatId: targetChatId
      };
    }

    if (!sendRes.ok || !sendJson?.idMessage || sendJson?.error) {
      return {
        status: `error_${sendRes.status}`,
        httpStatus: sendRes.status,
        data: sendJson,
        mode: 'poll_and_text',
        errorDetail: sendJson?.message || sendJson?.error || `HTTP ${sendRes.status}`,
        usedChatId: targetChatId
      };
    }

    if (cleanButtons.length > 0) {
      try {
        const pollUrl = getGreenApiUrl(
          salesGreenApiConfig.idInstance,
          salesGreenApiConfig.apiTokenInstance,
          "sendPoll",
          salesGreenApiConfig.apiUrl
        );
        const pollRes = await fetch(pollUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: targetChatId,
            message: "👇 Toca una opción rápida para responder:",
            options: cleanButtons.map(b => ({ optionName: b.buttonText })),
            multipleAnswers: false
          })
        });
        const pollJson: any = await pollRes.json().catch(() => ({}));
        if (pollRes.ok && pollJson?.idMessage && !pollJson?.error) {
          return {
            status: "sent_success",
            httpStatus: sendRes.status,
            data: { text: sendJson, poll: pollJson },
            mode: 'poll_and_text',
            usedChatId: targetChatId
          };
        }
        console.warn(`[Green-API Poll fallback for ${targetChatId}]:`, pollRes.status, pollJson);
        return {
          status: "sent_success",
          httpStatus: sendRes.status,
          data: { text: sendJson, pollWarning: pollJson },
          mode: 'text_fallback',
          usedChatId: targetChatId
        };
      } catch (pollErr: any) {
        console.warn(`[Green-API Poll network warning for ${targetChatId}]:`, pollErr.message);
        return {
          status: "sent_success",
          httpStatus: sendRes.status,
          data: { text: sendJson, pollWarning: pollErr.message },
          mode: 'text_fallback',
          usedChatId: targetChatId
        };
      }
    }

    return {
      status: "sent_success",
      httpStatus: sendRes.status,
      data: sendJson,
      mode: 'poll_and_text',
      usedChatId: targetChatId
    };
  }

  // Mode 2: Interactive buttons with text fallback
  if (replyMode === 'interactive' && cleanButtons.length > 0) {
    const buttonsUrl = getGreenApiUrl(
      salesGreenApiConfig.idInstance,
      salesGreenApiConfig.apiTokenInstance,
      "sendInteractiveButtonsReply",
      salesGreenApiConfig.apiUrl
    );
    try {
      const btnPayload: Record<string, any> = {
        chatId: targetChatId,
        body,
        buttons: cleanButtons
      };
      if (cleanHeader) btnPayload.header = cleanHeader;
      if (cleanFooter) btnPayload.footer = cleanFooter;

      const btnRes = await fetch(buttonsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(btnPayload)
      });
      const btnJson: any = await btnRes.json().catch(() => ({}));
      if (btnRes.ok && btnJson?.idMessage && !btnJson?.error) {
        return { status: "sent_success", httpStatus: btnRes.status, data: btnJson, mode: 'buttons', usedChatId: targetChatId };
      }
      if (btnRes.status === 466) {
        return {
          status: "error_466",
          httpStatus: 466,
          data: btnJson,
          mode: 'buttons',
          errorDetail: btnJson?.message || "Límite mensual de chats del plan Developer excedido",
          usedChatId: targetChatId
        };
      }
      console.warn(`[Green-API Interactive Buttons fallback for ${targetChatId}]:`, btnRes.status, btnJson);
    } catch (e: any) {
      console.warn(`[Green-API Interactive Buttons network fallback for ${targetChatId}]:`, e.message);
    }
  }

  // Mode 3 (text_only) or fallback to formatted text with numbered quick options
  const buttonsText = cleanButtons.length > 0
    ? `\n\n📌 *Opciones rápidas (responde con el texto o número):*\n${cleanButtons.map((b, i) => `${i + 1}️⃣ ${b.buttonText}`).join("\n")}`
    : "";
  const sendRes = await fetch(textUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: targetChatId, message: `${headerPrefix}${body}${buttonsText}` })
  });
  const sendJson: any = await sendRes.json().catch(() => ({}));
  return {
    status: sendRes.ok ? "sent_success" : `error_${sendRes.status}`,
    httpStatus: sendRes.status,
    data: sendJson,
    mode: 'text_fallback',
    errorDetail: !sendRes.ok ? (sendJson?.message || sendJson?.error || `HTTP ${sendRes.status}`) : undefined,
    usedChatId: targetChatId
  };
}

async function dispatchSalesInteractiveMessage(
  chatId: string,
  header: string,
  body: string,
  footer: string,
  buttons: SalesButtonOption[],
  altChatId?: string
): Promise<{ status: string; httpStatus?: number; data: any; mode: 'poll_and_text' | 'buttons' | 'text_fallback'; errorDetail?: string; usedChatId: string }> {
  const cleanButtons = (buttons || [])
    .slice(0, 3)
    .map((b, idx) => ({
      buttonId: String(b.buttonId || `btn_${idx + 1}`).slice(0, 50),
      buttonText: String(b.buttonText || `Opción ${idx + 1}`).slice(0, 25)
    }));

  const firstAttempt = await sendSalesToSingleChatId(chatId, header, body, footer, cleanButtons);
  if (
    firstAttempt.status !== "sent_success" &&
    firstAttempt.httpStatus !== 466 &&
    altChatId &&
    altChatId !== chatId
  ) {
    console.warn(`[Green-API Sales Retry] Primary ${chatId} failed (${firstAttempt.status}), retrying altChatId ${altChatId}`);
    const retryAttempt = await sendSalesToSingleChatId(altChatId, header, body, footer, cleanButtons);
    if (retryAttempt.status === "sent_success") {
      return retryAttempt;
    }
  }
  return firstAttempt;
}

// Core Engine for Line 2 (+51 929 327 654): Serious Corporate B2B Sales + Interactive Buttons
async function processDigitalMykSalesMessage(phone: string, senderName: string, text: string, rawChatId?: string, altChatId?: string) {
  const cleanText = (text || "").trim() || "Hola";
  const lowerText = cleanText.toLowerCase();

  const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`;
  const sessionKey = formattedPhone.replace(/[^0-9]/g, "");

  let session = salesSessions.get(sessionKey);
  const existingLeadCheck = salesLeads.find(l => l.whatsapp.replace(/[^0-9]/g, "") === sessionKey);
  const hasPriorBotReply =
    Boolean(session && session.history.some(h => h.sender === 'bot')) ||
    Boolean(existingLeadCheck && Array.isArray(existingLeadCheck.history) && existingLeadCheck.history.some((h: any) => h.sender === 'bot'));
  const isFirstMessage = !hasPriorBotReply;

  if (!session) {
    session = {
      chatId: sessionKey,
      replyChatId: rawChatId && rawChatId.includes("@") ? normalizeGreenChatId(rawChatId) : undefined,
      altChatId: altChatId && altChatId.includes("@") ? normalizeGreenChatId(altChatId) : undefined,
      phone: formattedPhone,
      name: senderName || "Prospecto WhatsApp",
      serviceInterest: "Información General de Servicios",
      history: [],
      lastActivity: new Date().toISOString()
    };
    salesSessions.set(sessionKey, session);
  } else {
    if (rawChatId && rawChatId.includes("@")) {
      session.replyChatId = normalizeGreenChatId(rawChatId);
    }
    if (altChatId && altChatId.includes("@")) {
      session.altChatId = normalizeGreenChatId(altChatId);
    }
  }

  if (senderName && senderName !== "Prospecto WhatsApp" && senderName !== "Cliente") {
    session.name = senderName;
  }

  const detectedService = detectDigitalMykServiceIntent(lowerText);
  if (detectedService !== "Información General de Servicios" || isFirstMessage) {
    session.serviceInterest = detectedService;
  }

  const buttonAction = detectSalesButtonAction(cleanText);
  const structuredResponse = buildProButtonResponse(buttonAction, cleanText, session.name, detectedService);

  let botReply = structuredResponse.reply;
  let replyButtons: SalesButtonOption[] = structuredResponse.buttons;
  let capturedLeadData: any = null;

  // Use Gemini for nuanced open-ended questions when NOT clicking a predefined button / short greeting
  const isSimpleTrigger =
    !!buttonAction ||
    ["hola", "info", "informacion", "información", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "menu", "menú", "1", "2", "3", "4", "5", "."].includes(lowerText) ||
    cleanText.length <= 8;

  if (!isSimpleTrigger) {
    const historyText = session.history
      .slice(-8)
      .map(h => `${h.sender === 'user' ? 'Cliente' : 'Asesor Digital MYK Lab'}: ${h.text}`)
      .join("\n");

    const salesPrompt = `Eres el Asesor Comercial Ejecutivo de "Digital MYK Lab" (Slogan: "Seguridad y Garantía | Innova. Automatiza. Convierte.").
Canal oficial WhatsApp: +51 929 327 654 | Web Oficial: https://digitalmyklab.onrender.com/ | Correo: compumasster@gmail.com

PORTAFOLIO OFICIAL (TONO 100% SERIO Y CORPORATIVO — NUNCA USES LA PALABRA "DEMO"):
A) SOLUCIONES TECNOLÓGICAS:
1. Chatbots & Automatización IA 24/7: Atención en < 1 minuto, calificación de leads, agendamiento automático y sincronización con CRM / Google Sheets.
2. Aplicaciones Móviles y Web a la Medida: Panel de ventas, catálogo, pedidos, clientes y reportes en tiempo real. Seguras, rápidas y escalables.
3. Páginas Web Profesionales PRO: Infraestructura cloud de alto rendimiento, SSL incluido, SEO para Google y enlace directo a WhatsApp.
4. Plan Integral: Asistente IA 24/7 + Sitio Web Profesional GRATIS (consultar dominio/hosting externos), 99.9% Uptime y soporte 24/7/365.

B) ${DIGITAL_MYK_SOCIAL_CATALOG}

CUENTAS OFICIALES PARA DEPÓSITOS (Titular: Maycol Castañeda):
- Yape: 929327654
- Plin: 921034349
- Banco de la Nación: Cuenta 04765342509 | CCI 018-765-004765342509-81
- Scotiabank (Cuenta Ahorro Soles): Cuenta 8330613655 | CCI 00972420833061365561

REGLAS ESTRICTAS:
1. Tono ejecutivo, serio, confiable y amable. Prohibido decir "demo" o hablar de márgenes internos del negocio.
2. ${isFirstMessage ? 'Es el primer mensaje del cliente: preséntate brevemente.' : 'Ya respondiste anteriormente en este chat: NO incluyas encabezado de bienvenida ni repitas "Hola, bienvenido a Digital MYK Lab"; ve directo al punto.'}
3. Para Redes Sociales: enfatiza el beneficio ("Con pedidos desde S/ 10 puedes armar tu Pack Inicio combinando vistas + likes en el mismo video o distintos enlaces para lograr interacción completa"). Si pide menos de S/ 10 (ej. solo 500 likes a S/ 6), ofrécele amablemente armar un "Pack Inicio de S/ 10+" combinando 2 servicios (sin sonar restrictivo) y solicita su enlace (link) del perfil o video.
4. Si pregunta por cuentas, Yape, Plin o bancos, entrega las cuentas oficiales completas a nombre de Maycol Castañeda.
5. Mantén la respuesta clara para WhatsApp (máximo 10 líneas) e indica que puede responder con los botones de abajo.
6. Agrega al final en línea oculta:
[SALES_LEAD: {"clientName":"${session.name}", "serviceInterest":"...", "businessType":"...", "estimatedValue":${getDefaultEstimatedValue(detectedService)}, "stage":"💬 En Asesoría" | "📄 Cotizado" | "💳 Pago / Cierre"}]

Historial reciente:
${historyText || "(Primera interacción)"}

Mensaje actual del cliente (${session.name} - ${formattedPhone}):
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
      replyButtons = isSocialMediaService(capturedLeadData?.serviceInterest || detectedService)
        ? [
            { buttonId: "btn_social_combo", buttonText: "🔥 Pack / Combo S/10" },
            { buttonId: "btn_pay", buttonText: "💳 Pagar con Yape/Plin" },
            { buttonId: "btn_social", buttonText: "📲 Ver Otras Redes" }
          ]
        : [
            { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
            { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
            { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
          ];
    }
  }

  // Push messages to session history first so full transcript is saved in CRM PRO
  const nowIso = new Date().toISOString();
  session.history.push({ sender: 'user', text: cleanText, timestamp: nowIso });
  session.history.push({ sender: 'bot', text: botReply, timestamp: nowIso });
  session.lastActivity = nowIso;

  // Upsert Lead in CRM PRO salesLeads store
  const leadIndex = salesLeads.findIndex(l => l.whatsapp.replace(/[^0-9]/g, "") === sessionKey);
  const existingLead = leadIndex >= 0 ? salesLeads[leadIndex] : null;

  const serviceToSave =
    capturedLeadData?.serviceInterest ||
    (session.serviceInterest && session.serviceInterest !== "Información General de Servicios" ? session.serviceInterest : null) ||
    existingLead?.serviceInterest ||
    detectedService;

  const businessToSave = capturedLeadData?.businessType || session.businessType || existingLead?.businessType || "Por calificar";
  const statusToSave =
    structuredResponse.stageOverride ||
    capturedLeadData?.stage ||
    (existingLead ? existingLead.status : "🔥 Nuevo Lead");

  const existingHistory = Array.isArray(existingLead?.history) ? existingLead.history : [];
  const updatedHistory = [
    ...existingHistory,
    { sender: 'user', text: cleanText, timestamp: nowIso },
    { sender: 'bot', text: botReply, timestamp: nowIso, buttons: replyButtons }
  ].slice(-30);

  const leadPayload = {
    id: existingLead ? existingLead.id : `lead_${Date.now()}`,
    registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    clientName: capturedLeadData?.clientName || session.name || existingLead?.clientName || "Prospecto WhatsApp",
    whatsapp: formattedPhone,
    serviceInterest: serviceToSave,
    businessType: businessToSave,
    lastMessage: cleanText.slice(0, 140),
    status: statusToSave,
    estimatedValue: Number(capturedLeadData?.estimatedValue) || existingLead?.estimatedValue || getDefaultEstimatedValue(serviceToSave),
    paymentMethod: structuredResponse.paymentMethodOverride || existingLead?.paymentMethod || "Por definir",
    paymentStatus: structuredResponse.paymentStatusOverride || existingLead?.paymentStatus || "Pendiente",
    priority: statusToSave === "💳 Pago / Cierre" || statusToSave === "📄 Cotizado" ? "Alta" : (existingLead?.priority || "Media"),
    notes: existingLead?.notes || "Atención comercial automatizada Digital MYK Lab (+51 929 327 654)",
    history: updatedHistory
  };

  if (leadIndex >= 0) {
    salesLeads[leadIndex] = { ...existingLead, ...leadPayload };
  } else {
    salesLeads.unshift(leadPayload);
  }
  saveStoredSalesLeads();

  // Send out via Line 2 Green-API using Interactive Buttons + automatic fallback
  // Show header ONLY on the 1st bot response; omit it completely from the 2nd response onward
  const messageHeader = isFirstMessage ? "Digital MYK Lab • Atención Comercial" : "";
  const messageFooter = isFirstMessage ? "Seguridad y Garantía • digitalmyklab.onrender.com" : "";

  let greenApiSendStatus = "not_sent";
  if (salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance && sessionKey.length >= 7) {
    const cleanPhone = formattedPhone.replace(/[^0-9]/g, "");
    const chatId =
      (rawChatId && rawChatId.includes("@"))
        ? normalizeGreenChatId(rawChatId)
        : (session.replyChatId && session.replyChatId.includes("@"))
          ? normalizeGreenChatId(session.replyChatId)
          : `${cleanPhone}@c.us`;
    const fallbackChatId =
      (altChatId && altChatId.includes("@"))
        ? normalizeGreenChatId(altChatId)
        : session.altChatId;
    try {
      const dispatch = await dispatchSalesInteractiveMessage(
        chatId,
        messageHeader,
        botReply,
        messageFooter,
        replyButtons,
        fallbackChatId
      );
      greenApiSendStatus = dispatch.status;
      const isQuota466 = dispatch.httpStatus === 466 || String(dispatch.errorDetail || "").toLowerCase().includes("quota");
      addGreenApiLog({
        type: dispatch.status === "sent_success" ? 'outgoing_send' : 'error',
        phone: dispatch.usedChatId.endsWith("@lid") ? `${formattedPhone} (LID)` : formattedPhone,
        sender: session.name,
        text: botReply.slice(0, 120) + (botReply.length > 120 ? "..." : ""),
        status: dispatch.status === "sent_success"
          ? (dispatch.mode === 'poll_and_text'
              ? '🟢 Texto + Encuesta Táctil Enviados (929 327 654)'
              : dispatch.mode === 'buttons'
                ? '🟢 Botones Interactivos Enviados (929 327 654)'
                : '🟢 Respuesta PRO Enviada (929 327 654)')
          : isQuota466
            ? '🔴 Límite Plan DEVELOPER (HTTP 466): Green-API bloqueó este número por cuota gratuita'
            : `🔴 Error Envío (${dispatch.status}): ${dispatch.errorDetail || 'Revisa consola'}`,
        details: { chatId: dispatch.usedChatId, ...dispatch.data }
      }, 'sales');
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
  } else if (!salesGreenApiConfig.apiTokenInstance) {
    addGreenApiLog({
      type: 'error',
      phone: formattedPhone,
      sender: session.name,
      status: '⚠️ Falta apiTokenInstance en Línea 929 327 654 (no se pudo responder por WhatsApp)'
    }, 'sales');
  }

  return {
    reply: botReply,
    header: messageHeader || undefined,
    buttons: replyButtons,
    lead: leadPayload,
    actionTriggered: "SALES_LEAD_UPSERT",
    greenApiSendStatus,
    session
  };
}

// Core Engine: Process incoming message for Demo 1 or Demo 2
async function processDemoMessage(phone: string, senderName: string, text: string, rawChatId?: string) {
  const cleanText = (text || "").trim();
  const lowerText = cleanText.toLowerCase();
  
  // Format phone number
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`;
  const sessionKey = formattedPhone.replace(/[^0-9]/g, "");

  let session = userSessions.get(sessionKey);
  if (!session) {
    session = {
      chatId: sessionKey,
      replyChatId: rawChatId && rawChatId.includes("@") ? rawChatId : undefined,
      phone: formattedPhone,
      name: senderName || "Cliente",
      currentDemo: 'menu',
      history: [],
      lastActivity: new Date().toISOString()
    };
    userSessions.set(sessionKey, session);
  } else if (rawChatId && rawChatId.includes("@")) {
    session.replyChatId = rawChatId;
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
    const chatId =
      (rawChatId && rawChatId.includes("@"))
        ? rawChatId
        : (session.replyChatId && session.replyChatId.includes("@"))
          ? session.replyChatId
          : `${cleanPhone}@c.us`;
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
  const { idInstance, apiTokenInstance, apiUrl, connectedPhone, pollingEnabled, autoRespondAll, replyMode } = req.body;
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
  if (replyMode === 'poll_and_text' || replyMode === 'interactive' || replyMode === 'text_only') {
    salesGreenApiConfig.replyMode = replyMode;
  }
  salesGreenApiConfig.lastPing = new Date().toISOString();
  salesGreenApiConfig.status = (salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) ? "connected" : "disconnected";

  saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);

  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Línea Ventas 929 327 654 Guardada (idInstance: ${salesGreenApiConfig.idInstance || 'pendiente'}, modo: ${salesGreenApiConfig.replyMode})`,
    details: { apiUrl: salesGreenApiConfig.apiUrl, hasToken: !!salesGreenApiConfig.apiTokenInstance, polling: salesGreenApiConfig.pollingEnabled, replyMode: salesGreenApiConfig.replyMode }
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
        outgoingMessageWebhook: "no",
        pollMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });

    const data = await apiRes.json().catch(() => ({}));
    if (apiRes.ok) {
      salesGreenApiConfig.idInstance = id;
      salesGreenApiConfig.apiTokenInstance = token;
      salesGreenApiConfig.apiUrl = baseUrl;
      salesGreenApiConfig.pollingEnabled = true;
      salesGreenApiConfig.status = "connected";
      salesGreenApiConfig.lastPing = new Date().toISOString();
      saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);
    }

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
      config: salesGreenApiConfig,
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
        outgoingMessageWebhook: "no",
        pollMessageWebhook: "yes",
        stateWebhook: "yes"
      })
    });
    const data = await apiRes.json().catch(() => ({}));
    if (apiRes.ok) {
      salesGreenApiConfig.idInstance = id;
      salesGreenApiConfig.apiTokenInstance = token;
      salesGreenApiConfig.apiUrl = baseUrl;
      salesGreenApiConfig.status = "connected";
      salesGreenApiConfig.lastPing = new Date().toISOString();
      saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);
    }
    addGreenApiLog({
      type: 'diagnostic',
      status: `🔗 Webhook Configurado en Línea Ventas: ${webhookUrl}`,
      details: data
    }, 'sales');
    res.json({ success: apiRes.ok, message: `¡Webhook configurado hacia ${webhookUrl}!`, config: salesGreenApiConfig, data });
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
    const warnings: string[] = [];
    if (settingsRes?.incomingWebhook === "no") {
      warnings.push("incomingWebhook está en 'no' en Green-API (pulsa 'Aplicar Webhook' o 'Modo Cola Directo' para activarlo).");
    }
    if (settingsRes?.tariff && String(settingsRes.tariff).toLowerCase().includes("developer")) {
      warnings.push("Instancia en Plan DEVELOPER gratuito: Green-API restringe las respuestas salientes a un máximo de 3 chats/números por mes (error HTTP 466 para números adicionales).");
    }
    addGreenApiLog({
      type: 'diagnostic',
      status: isAuthorized ? '🟢 Diagnóstico Ventas: WhatsApp AUTORIZADO' : `🟡 Estado Ventas: ${stateRes?.stateInstance || 'No Autorizada'}`,
      details: { stateInstance: stateRes, settings: settingsRes, baseUrl, warnings }
    }, 'sales');
    res.json({ success: true, baseUrl, stateInstance: stateRes, settings: settingsRes, isAuthorized, warnings });
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

    const isIncomingSalesMsg = typeWebhook === "incomingMessageReceived" || (!typeWebhook && !!body.messageData);
    if (isIncomingSalesMsg) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};
      const { primaryChatId: rawSender, altChatId } = resolveGreenApiCandidates(senderData);
      const isGroupOrStatus = isIgnorableGreenApiChat(rawSender);
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Prospecto WhatsApp";

      if (!isGroupOrStatus && senderPhone && !markAndCheckDuplicateGreenMessage(body.idMessage)) {
        const textMessage = extractGreenApiMessageText(messageData, rawSender);

        addGreenApiLog({
          type: 'incoming_webhook',
          phone: rawSender.endsWith("@lid") ? `${senderPhone} (LID)` : senderPhone,
          sender: senderName,
          text: textMessage || `[${messageData.typeMessage || 'Mensaje'}]`,
          status: textMessage ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : '⚠️ Mensaje sin respuesta requerida',
          details: body
        }, 'sales');

        if (textMessage) {
          const result = await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId);
          return res.json({ status: "processed", result });
        }
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

    // Check if it is an incoming customer message (ignore outgoingMessageReceived / outgoingAPIMessageReceived / groups)
    const isIncomingCustomerMsg = typeWebhook === "incomingMessageReceived" || (!typeWebhook && !!body.messageData);
    if (isIncomingCustomerMsg) {
      const senderData = body.senderData || {};
      const messageData = body.messageData || {};

      const { primaryChatId: rawSender, altChatId } = resolveGreenApiCandidates(senderData);
      const isGroupOrStatus = isIgnorableGreenApiChat(rawSender);
      const senderPhone = rawSender.replace(/@.*$/, "");
      const senderName = senderData.senderName || senderData.chatName || senderData.senderContactName || "Cliente WhatsApp";

      if (!isGroupOrStatus && senderPhone && !markAndCheckDuplicateGreenMessage(body.idMessage)) {
        const textMessage = extractGreenApiMessageText(messageData, rawSender);

        addGreenApiLog({
          type: 'incoming_webhook',
          phone: rawSender.endsWith("@lid") ? `${senderPhone} (LID)` : senderPhone,
          sender: senderName,
          text: textMessage || `[${messageData.typeMessage || 'Mensaje Multimedia'}]`,
          status: textMessage
            ? (isSalesInstance ? '📥 Mensaje Recibido (Línea Ventas 929 327 654)' : '📥 Mensaje Recibido de WhatsApp')
            : '⚠️ Mensaje sin texto reconocible',
          details: body
        }, isSalesInstance ? 'sales' : 'demos');

        if (textMessage) {
          console.log(`[Green-API Message Incoming] [${isSalesInstance ? 'SALES' : 'DEMOS'}] De: ${senderName} (${rawSender}): "${textMessage}"`);
          const result = isSalesInstance
            ? await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId)
            : await processDemoMessage(senderPhone, senderName, textMessage, rawSender);
          return res.json({ status: "processed", result });
        }
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

app.post("/api/sales/update-lead", (req, res) => {
  const { id, updates } = req.body;
  if (!id || !updates) {
    return res.status(400).json({ error: "id y updates son requeridos" });
  }
  salesLeads = salesLeads.map(l => l.id === id ? { ...l, ...updates } : l);
  saveStoredSalesLeads();
  res.json({ success: true, salesLeads });
});

app.post("/api/sales/add-lead", (req, res) => {
  const lead = req.body;
  if (!lead || !lead.clientName) {
    return res.status(400).json({ error: "Datos del prospecto requeridos" });
  }
  const serviceInterest = lead.serviceInterest || "Combo Asistente IA + Web Gratis";
  const newLead = {
    id: lead.id || `lead_${Date.now()}`,
    registrationDate: lead.registrationDate || new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    clientName: lead.clientName,
    whatsapp: lead.whatsapp || "+51 9",
    serviceInterest,
    businessType: lead.businessType || "Por calificar",
    lastMessage: lead.lastMessage || "Ingreso manual",
    status: lead.status || "🔥 Nuevo Lead",
    estimatedValue: lead.estimatedValue !== undefined ? Number(lead.estimatedValue) : getDefaultEstimatedValue(serviceInterest),
    paymentMethod: lead.paymentMethod || "Por definir",
    paymentStatus: lead.paymentStatus || "Pendiente",
    priority: lead.priority || "Alta",
    notes: lead.notes || "Registrado en CRM PRO Digital MYK Lab",
    history: lead.history || []
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
