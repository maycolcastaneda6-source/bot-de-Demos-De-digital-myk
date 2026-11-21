import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  connectBaileysSales,
  disconnectBaileysSales,
  exportBaileysAuthBase64,
  getBaileysStatusSnapshot,
  registerBaileysCallbacks,
  restoreBaileysAuthFromEnv,
  sendBaileysSalesReply
} from "./whatsappSalesProvider.ts";

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

interface ParsedReceiptInfo {
  isReceipt: boolean;
  paymentMethod: string;
  amount?: number;
  operationCode?: string;
  payerOrRecipient?: string;
}

function detectPaymentMethodFromText(text: string): string | null {
  const lower = (text || "").toLowerCase();
  if (lower.includes("yape") || lower.includes("929327654")) return "Yape (929327654)";
  if (lower.includes("plin") || lower.includes("921034349")) return "Plin (921034349)";
  if (lower.includes("scotiabank") || lower.includes("scotia") || lower.includes("8330613655") || lower.includes("009724")) {
    return "Scotiabank (Cta. 8330613655)";
  }
  if (lower.includes("nacion") || lower.includes("nación") || lower.includes("04765342509") || lower.includes("018-765") || /\bbn\b/.test(lower)) {
    return "Banco de la Nación";
  }
  if (lower.includes("bcp")) return "Transferencia BCP";
  if (lower.includes("bbva")) return "Transferencia BBVA";
  if (lower.includes("interbank")) return "Transferencia Interbank";
  if (lower.includes("cci") || lower.includes("transferencia") || lower.includes("deposito") || lower.includes("depósito")) {
    return "Transferencia Bancaria";
  }
  return null;
}

async function analyzePaymentReceiptWithGemini(
  mediaBase64: string,
  mediaMimeType: string,
  caption?: string
): Promise<ParsedReceiptInfo | null> {
  const ai = getAiClient();
  if (!ai || !mediaBase64) return null;

  const prompt = `Analiza esta imagen o documento enviado por WhatsApp a Digital MYK Lab (Titular oficial: Maycol Castañeda; Yape 929327654, Plin 921034349, Banco de la Nación, Scotiabank).
Determina si es un comprobante / constancia / captura de pago o transferencia bancaria.
Texto adjunto del cliente: "${caption || ""}"

Devuelve EXCLUSIVAMENTE JSON válido con esta estructura:
{
  "isReceipt": true | false,
  "paymentMethod": "Yape (929327654)" | "Plin (921034349)" | "Banco de la Nación" | "Scotiabank" | "Transferencia BCP" | "Transferencia BBVA" | "Transferencia Interbank" | "Transferencia Bancaria" | "Por confirmar",
  "amount": number | null,
  "operationCode": string | null,
  "payerOrRecipient": string | null
}`;

  const modelsToTry = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: mediaBase64,
                mimeType: mediaMimeType
              }
            },
            { text: prompt }
          ]
        },
        config: { responseMimeType: "application/json" }
      });
      const raw = response.text?.trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      return {
        isReceipt: Boolean(parsed.isReceipt),
        paymentMethod: String(parsed.paymentMethod || "Por confirmar"),
        amount: typeof parsed.amount === "number" && parsed.amount > 0 ? parsed.amount : undefined,
        operationCode: parsed.operationCode ? String(parsed.operationCode) : undefined,
        payerOrRecipient: parsed.payerOrRecipient ? String(parsed.payerOrRecipient) : undefined
      };
    } catch (err: any) {
      console.warn(`[Gemini Receipt Vision ${modelName} note]:`, err?.message || err);
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

// In-memory demo states and WhatsApp configuration (Line 1: Demos + Line 2: Digital MYK Lab Ventas)
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
  provider?: 'baileys' | 'cloud_api' | 'green_api';
  cloudPhoneNumberId?: string;
  cloudAccessToken?: string;
  cloudVerifyToken?: string;
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
const resolvedCloudPhoneId = storedSalesConfig.cloudPhoneNumberId || process.env.SALES_CLOUD_PHONE_NUMBER_ID || "";
const resolvedCloudToken = storedSalesConfig.cloudAccessToken || process.env.SALES_CLOUD_ACCESS_TOKEN || "";
const resolvedSalesProvider: 'baileys' | 'cloud_api' | 'green_api' =
  storedSalesConfig.provider || (resolvedCloudPhoneId && resolvedCloudToken ? 'cloud_api' : 'baileys');

let salesGreenApiConfig: GreenApiConfigState = {
  idInstance: resolvedSalesId,
  apiTokenInstance: resolvedSalesToken,
  apiUrl: storedSalesConfig.apiUrl || process.env.SALES_GREEN_API_URL || "https://7107.api.greenapi.com",
  connectedPhone: storedSalesConfig.connectedPhone || "+51 929 327 654",
  status: resolvedSalesProvider === 'cloud_api'
    ? ((resolvedCloudPhoneId && resolvedCloudToken) ? "connected" : "disconnected")
    : resolvedSalesProvider === 'green_api'
      ? ((resolvedSalesId && resolvedSalesToken) ? "connected" : "disconnected")
      : "disconnected",
  lastPing: new Date().toISOString(),
  pollingEnabled: storedSalesConfig.pollingEnabled !== undefined ? storedSalesConfig.pollingEnabled : true,
  autoRespondAll: storedSalesConfig.autoRespondAll !== undefined ? storedSalesConfig.autoRespondAll : true,
  replyMode: storedSalesConfig.replyMode || 'poll_and_text',
  provider: resolvedSalesProvider,
  cloudPhoneNumberId: resolvedCloudPhoneId,
  cloudAccessToken: resolvedCloudToken,
  cloudVerifyToken: storedSalesConfig.cloudVerifyToken || process.env.SALES_CLOUD_VERIFY_TOKEN || "digitalmyklab_verify"
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

async function fetchGreenApiMediaPayload(
  messageData: any
): Promise<{ mediaBase64: string; mediaMimeType: string } | undefined> {
  const typeMsg = messageData?.typeMessage || "";
  if (typeMsg !== "imageMessage" && typeMsg !== "documentMessage") return undefined;
  const downloadUrl = messageData?.fileMessageData?.downloadUrl || messageData?.downloadUrl;
  if (!downloadUrl || typeof downloadUrl !== "string") return undefined;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(downloadUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const contentLength = Number(res.headers.get("content-length") || "0");
    if (contentLength > 6 * 1024 * 1024) return undefined;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 6 * 1024 * 1024) return undefined;
    const mimeType =
      messageData?.fileMessageData?.mimeType ||
      res.headers.get("content-type") ||
      (typeMsg === "documentMessage" ? "application/pdf" : "image/jpeg");
    return {
      mediaBase64: Buffer.from(arrayBuf).toString("base64"),
      mediaMimeType: mimeType.split(";")[0].trim()
    };
  } catch {
    return undefined;
  }
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
          const mediaPayload = await fetchGreenApiMediaPayload(messageData);
          await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId, mediaPayload);
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

// Background auto-polling worker for Line 2 (only when provider is legacy Green-API)
setInterval(() => {
  if (
    salesGreenApiConfig.provider === 'green_api' &&
    salesGreenApiConfig.pollingEnabled &&
    salesGreenApiConfig.idInstance &&
    salesGreenApiConfig.apiTokenInstance
  ) {
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
    estimatedValue: 390,
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
    estimatedValue: 750,
    notes: 'Solicitó presentación de panel de pedidos y reportes'
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
interface SalesButtonOption {
  buttonId: string;
  buttonText: string;
}

interface SalesSessionState {
  chatId: string;
  replyChatId?: string;
  altChatId?: string;
  phone: string;
  name: string;
  serviceInterest: string;
  businessType?: string;
  lastMenuButtons?: SalesButtonOption[];
  history: Array<{ sender: 'user' | 'bot'; text: string; timestamp: string }>;
  lastActivity: string;
}

const salesSessions = new Map<string, SalesSessionState>();

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
  if (service === "App a la Medida") return 750;
  if (service === "Combo Asistente IA + Web Gratis") return 390;
  if (service === "Chatbot IA 24/7") return 350;
  if (service === "Web Profesional PRO") return 290;
  if (isSocialMediaService(service)) return 22;
  return 390;
}

function detectSalesButtonAction(cleanText: string, lastMenuButtons?: SalesButtonOption[]): string | null {
  const lower = cleanText.toLowerCase().trim();

  // Context-aware numeric routing (1, 2, 3, 4, 1️⃣, opcion 1, etc.)
  const numMatch = lower.match(/^(?:opci[oó]n\s*|#)?([1-5])(?:️⃣|\.|°)?$/);
  if (numMatch) {
    const idx = Number(numMatch[1]) - 1;
    if (Array.isArray(lastMenuButtons) && lastMenuButtons[idx]?.buttonId) {
      return lastMenuButtons[idx].buttonId;
    }
    if (idx === 0) return "btn_tech";
    if (idx === 1) return "btn_social";
    if (idx === 2) return "btn_combo";
    if (idx === 3) return "btn_pay";
    if (idx === 4) return "btn_advisor";
  }

  if (
    lower === "btn_voucher" ||
    lower.includes("ya realicé el pago") ||
    lower.includes("ya realice el pago") ||
    lower.includes("ya pague") ||
    lower.includes("ya pagué") ||
    lower.includes("ya yape") ||
    lower.includes("ya plin") ||
    lower.includes("comprobante") ||
    lower.includes("voucher") ||
    lower.includes("constancia") ||
    lower.includes("te deposite") ||
    lower.includes("te deposité") ||
    lower.includes("te transferi") ||
    lower.includes("te transferí")
  ) {
    return "btn_voucher";
  }
  if (
    lower === "btn_pay" ||
    lower === "btn_start" ||
    lower.includes("medios de pago") ||
    lower.includes("ver cuentas") ||
    lower.includes("cuentas / yape") ||
    lower.includes("ver yape") ||
    lower.includes("pagar con yape") ||
    lower.includes("yape") ||
    lower.includes("plin") ||
    lower.includes("scotiabank") ||
    lower.includes("nacion") ||
    lower.includes("nación") ||
    lower.includes("cci") ||
    lower.includes("deposito") ||
    lower.includes("depósito") ||
    lower.includes("transferencia") ||
    lower.includes("pagar") ||
    lower.includes("cuenta bancaria") ||
    lower.includes("iniciar proyecto") ||
    lower.includes("contratar plan") ||
    lower.includes("cotizar mi app") ||
    lower.includes("solicitar web")
  ) {
    return "btn_pay";
  }
  if (
    lower === "btn_advisor" ||
    lower.includes("asesor directo") ||
    lower.includes("hablar con maycol") ||
    lower.includes("consultar asesor") ||
    lower.includes("coordinar inicio") ||
    lower.includes("enviar mi link") ||
    lower.includes("humano")
  ) {
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
  if (
    lower === "btn_social" ||
    lower.includes("redes sociales") ||
    lower.includes("ver otras redes") ||
    lower.includes("catálogo redes") ||
    lower.includes("catalogo redes") ||
    lower === "redes" ||
    lower === "seguidores" ||
    lower === "likes" ||
    lower === "vistas" ||
    lower === "comentarios"
  ) {
    return "btn_social";
  }
  if (lower === "btn_tech" || lower.includes("ia, webs y apps") || lower.includes("soluciones ia") || lower.includes("soluciones tecnol")) {
    return "btn_tech";
  }
  if (lower === "btn_services" || lower.includes("ver servicios") || lower.includes("todos servicios") || lower.includes("portafolio") || lower === "menu" || lower === "menú") {
    return "btn_services";
  }
  if (lower === "btn_combo" || lower.includes("ia + web") || lower.includes("ver plan ia + web") || lower.includes("oferta ia + web") || lower.includes("oferta estrella")) {
    return "btn_combo";
  }
  if (lower === "btn_chatbot" || lower.includes("chatbots ia") || lower === "chatbot" || lower === "chatbots") {
    return "btn_chatbot";
  }
  if (lower === "btn_app" || lower.includes("app a la medida") || lower === "app") {
    return "btn_app";
  }
  if (lower === "btn_web" || lower.includes("web profesional") || lower === "web" || lower === "pagina web" || lower === "página web") {
    return "btn_web";
  }
  return null;
}

function buildProButtonResponse(
  action: string | null,
  cleanText: string,
  senderName: string,
  detectedService: string,
  receiptInfo?: ParsedReceiptInfo | null
): {
  reply: string;
  buttons: SalesButtonOption[];
  numberMap?: SalesButtonOption[];
  stageOverride?: '🔥 Nuevo Lead' | '💬 En Asesoría' | '📄 Cotizado' | '💳 Pago / Cierre' | '✅ Cerrado';
  paymentStatusOverride?: 'Pendiente' | 'Por Verificar' | 'Confirmado';
  paymentMethodOverride?: string;
  estimatedValueOverride?: number;
} {
  const greetingName = (senderName && senderName !== "Prospecto WhatsApp" && senderName !== "Cliente") ? ` ${senderName}` : "";

  if (action === "btn_voucher") {
    const textMethod = detectPaymentMethodFromText(cleanText);
    const recognizedMethod =
      (receiptInfo?.paymentMethod && receiptInfo.paymentMethod !== "Por confirmar")
        ? receiptInfo.paymentMethod
        : (textMethod || "Comprobante recibido (por confirmar banco)");

    const amountLine = receiptInfo?.amount ? `\n💵 *Monto detectado:* S/ ${receiptInfo.amount.toFixed(2)}` : "";
    const opLine = receiptInfo?.operationCode ? `\n🔢 *N° Operación:* ${receiptInfo.operationCode}` : "";

    return {
      reply: `✅ *¡Comprobante recibido con éxito${greetingName}!*\n\n🏦 *Método de pago reconocido:* ${recognizedMethod}${amountLine}${opLine}\n📌 *Estado en sistema:* Por Verificar\n\nNuestro director de proyectos (*Maycol Castañeda*) validará el abono en minutos.\n\n🚀 *Paso final para activar hoy mismo:* escríbenos por aquí:\n• Si es *Chatbot / Web / App*: el *nombre de tu negocio y rubro*.\n• Si es *Redes Sociales*: el *link (enlace)* de tu perfil o video.\n\n👇 *O elige una opción rápida:*\n1️⃣ Hablar con Asesor (Maycol)\n2️⃣ Ver Más Servicios\n3️⃣ Ver Cuentas Oficiales`,
      buttons: [
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Hablar con Maycol" },
        { buttonId: "btn_services", buttonText: "💼 Ver Servicios" },
        { buttonId: "btn_pay", buttonText: "💳 Ver Cuentas" }
      ],
      stageOverride: "💳 Pago / Cierre",
      paymentStatusOverride: "Por Verificar",
      paymentMethodOverride: recognizedMethod,
      estimatedValueOverride: receiptInfo?.amount
    };
  }

  if (action === "btn_pay") {
    return {
      reply: `💳 *Medios de Pago Oficiales — Digital MYK Lab*\n\n${DIGITAL_MYK_PAYMENT_DETAILS}\n\n📸 *Paso siguiente:* Al realizar tu depósito, *envía la captura o foto del comprobante por este chat* (reconocemos automáticamente si pagaste por Yape, Plin, BN o Scotiabank).\n\n👇 *Responde con el número o toca un botón:*\n1️⃣ Ya realicé el pago (Confirmar)\n2️⃣ Hablar con Asesor Directo\n3️⃣ Volver al Menú de Servicios`,
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
      reply: `👨‍💻 *Atención Directa Asignada*${greetingName} ✅\n\nTu requerimiento ya está registrado para atención prioritaria con *Maycol Castañeda — Digital MYK Lab*.\n\nCuéntanos en un mensaje breve:\n• Qué servicio te interesa y qué deseas lograr (o envía tu enlace si es Redes Sociales).\n\n🌐 Web Oficial: https://digitalmyklab.onrender.com/\n✉️ Correo: compumasster@gmail.com\n\n👇 *O elige con botón / número:*\n1️⃣ Ver Cuentas / Yape y Plin\n2️⃣ Ver Oferta IA + Web (S/ 390)\n3️⃣ Ver Todos los Servicios`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
        { buttonId: "btn_services", buttonText: "💼 Portafolio" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_services") {
    const numberMap: SalesButtonOption[] = [
      { buttonId: "btn_tech", buttonText: "🤖 IA, Webs y Apps" },
      { buttonId: "btn_social", buttonText: "📈 Redes Sociales S/10" },
      { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
      { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" }
    ];
    return {
      reply: `💼 *Portafolio Completo — Digital MYK Lab* (_Seguridad y Garantía_) 🛡️\n\n1️⃣ *Chatbots IA, Webs PRO y Apps a la Medida* _(desde S/ 290 • despliegue GitHub + Render)_\n2️⃣ *Crecimiento Redes Sociales* _(desde S/ 10 • TikTok, IG, FB, YouTube)_\n3️⃣ *Oferta Estrella:* Asistente IA 24/7 + Web Profesional GRATIS _(*S/ 390*)_\n4️⃣ *Medios de Pago Oficiales* _(Yape, Plin, BN, Scotiabank)_\n\n👇 *Toca un botón o responde con el número (1, 2, 3 o 4):*`,
      buttons: numberMap.slice(0, 3),
      numberMap,
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_tech") {
    const numberMap: SalesButtonOption[] = [
      { buttonId: "btn_chatbot", buttonText: "🤖 Chatbots IA (S/ 350)" },
      { buttonId: "btn_web", buttonText: "🌐 Web PRO (S/ 290)" },
      { buttonId: "btn_app", buttonText: "📱 App Medida (S/ 750)" },
      { buttonId: "btn_combo", buttonText: "🎁 IA + Web (S/ 390)" }
    ];
    return {
      reply: `🤖 *Soluciones Tecnológicas — Digital MYK Lab*\n_Despliegue rápido, seguro y escalable en infraestructura cloud (*GitHub + Render*) con Certificado SSL incluido:_\n\n1️⃣ *Chatbot IA 24/7* _(WhatsApp + Botones + CRM)_ — desde *S/ 350*\n2️⃣ *Web Profesional PRO* _(Ultrarrápida + SSL + SEO Google)_ — desde *S/ 290*\n3️⃣ *App a la Medida* _(Ventas, Pedidos, Clientes y Reportes)_ — desde *S/ 750*\n4️⃣ *Oferta Estrella:* Asistente IA 24/7 + Sitio Web GRATIS — *S/ 390*\n\n👇 *Responde con el número (1, 2, 3 o 4) o toca una opción:*`,
      buttons: [
        { buttonId: "btn_chatbot", buttonText: "🤖 Chatbots IA 24/7" },
        { buttonId: "btn_web", buttonText: "🌐 Web Profesional PRO" },
        { buttonId: "btn_app", buttonText: "📱 App a la Medida" }
      ],
      numberMap,
      stageOverride: "💬 En Asesoría"
    };
  }

  if (action === "btn_social") {
    return {
      reply: `📈 *Crecimiento en Redes Sociales — Desde S/ 10* 🚀\n\nImpulsa tus cuentas con entrega progresiva y paquetes desde *S/ 10* por pedido _(puedes combinar likes + vistas en el mismo link o distintos)_.\n\n1️⃣ *TikTok* _(Seguidores, En Vivo, Likes, Vistas, Comentarios — desde S/ 10)_\n2️⃣ *Instagram* _(Seguidores, En Vivo, Likes, Vistas, Comentarios — desde S/ 10)_\n3️⃣ *Facebook y YouTube* _(Seguidores, Suscriptores, Vistas, Likes — desde S/ 10)_\n\n👇 *Toca una opción o responde 1, 2 o 3:*`,
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
      reply: `📘 *Facebook* & 🔴 *YouTube* — Catálogo desde *S/ 10*\n\n👇 *Elige la plataforma o arma tu pack (toca un botón o escribe 1, 2 o 3):*\n1️⃣ Catálogo *Facebook* (desde S/ 10)\n2️⃣ Catálogo *YouTube* (desde S/ 10)\n3️⃣ *Armar Pack / Combo S/ 10+*`,
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
      reply: `📱 *1. TikTok — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:* 500 (*S/ 12*) | 1K (*S/ 22*) | 3K (*S/ 60*) | 5K (*S/ 95*)\n📺 *Espectadores En Vivo:* 30m (*S/ 35*) | 1h (*S/ 65*) | 1h30m (*S/ 95*)\n❤️ *Likes* _(combinables)_: 1K (*S/ 10*) | 3K (*S/ 22*) | 5K (*S/ 35*) | _500 a S/ 6_\n👁️ *Vistas* _(combinables)_: 2K (*S/ 10*) | 5K (*S/ 18*) | 10K (*S/ 32*) | _1K a S/ 6_\n💬 *Comentarios:* 100 (*S/ 10*) | 300 (*S/ 22*) | 500 (*S/ 35*) | 1K (*S/ 65*)\n\n👇 *Paso siguiente — toca un botón o escribe 1, 2 o 3:*\n1️⃣ Armar Pack / Combo S/ 10+\n2️⃣ Pagar con Yape / Plin\n3️⃣ Ver Otras Redes`,
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
      reply: `📸 *2. Instagram — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:* 500 (*S/ 12*) | 1K (*S/ 22*) | 3K (*S/ 60*) | 5K (*S/ 95*)\n📺 *En Vivo:* 500 (*S/ 10*) | 1K (*S/ 16*) | 3K (*S/ 40*) | 5K (*S/ 65*)\n❤️ *Likes* _(combinables)_: 2K (*S/ 10*) | 5K (*S/ 22*) | 10K (*S/ 40*) | _1K a S/ 6_\n👁️ *Vistas* _(combinables)_: 2K (*S/ 10*) | 5K (*S/ 18*) | 10K (*S/ 32*) | _1K a S/ 6_\n💬 *Comentarios:* 500 (*S/ 18*) | 1K (*S/ 30*) | 3K (*S/ 80*)\n\n👇 *Paso siguiente — toca un botón o escribe 1, 2 o 3:*\n1️⃣ Armar Pack / Combo S/ 10+\n2️⃣ Pagar con Yape / Plin\n3️⃣ Ver Otras Redes`,
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
      reply: `📘 *3. Facebook — Catálogo Oficial (desde S/ 10)*\n\n👥 *Seguidores:* 500 (*S/ 12*) | 1K (*S/ 22*) | 3K (*S/ 60*) | 5K (*S/ 95*)\n📺 *Transmisión En Vivo:* 60 min (*S/ 45*) | 10 horas (*S/ 95*)\n👍 *Likes* _(combinables)_: 1K (*S/ 10*) | 3K (*S/ 25*) | 5K (*S/ 40*) | _500 a S/ 6_\n👁️ *Vistas* _(combinables)_: 2K (*S/ 10*) | 5K (*S/ 18*) | 10K (*S/ 32*) | _1K a S/ 6_\n💬 *Comentarios:* 100 (*S/ 10*) | 300 (*S/ 22*) | 500 (*S/ 35*)\n\n👇 *Paso siguiente — toca un botón o escribe 1, 2 o 3:*\n1️⃣ Armar Pack / Combo S/ 10+\n2️⃣ Pagar con Yape / Plin\n3️⃣ Ver Otras Redes`,
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
      reply: `🔴 *4. YouTube — Catálogo Oficial (desde S/ 10)*\n\n🔔 *Suscriptores:* 100 (*S/ 10*) | 500 (*S/ 35*) | 1K (*S/ 65*)\n💬 *Comentarios:* 100 (*S/ 10*) | 500 (*S/ 25*) | 1K (*S/ 45*)\n👍 *Likes* _(combinables)_: 300 (*S/ 10*) | 500 (*S/ 14*) | 1K (*S/ 25*) | _100 a S/ 5_\n📺 *En Vivo:* 1K (*S/ 12*) | 5K (*S/ 40*) | 10K (*S/ 85*)\n👁️ *Vistas* _(combinables)_: 300 (*S/ 10*) | 500 (*S/ 14*) | 1K (*S/ 22*) | _100 a S/ 5_\n\n👇 *Paso siguiente — toca un botón o escribe 1, 2 o 3:*\n1️⃣ Armar Pack / Combo S/ 10+\n2️⃣ Pagar con Yape / Plin\n3️⃣ Ver Otras Redes`,
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
      reply: `🔥 *Armar Pack Inicio en Redes (desde S/ 10)*\n\nCombina dos o más servicios en el mismo enlace o distintos desde *S/ 10*:\n\n• *YouTube Pack S/ 10:* 100 Likes (S/ 5) + 100 Vistas (S/ 5) = *S/ 10*\n• *TikTok / IG / FB Mix S/ 12:* 500 Likes (S/ 6) + 1K Vistas (S/ 6) = *S/ 12*\n• *Paquete Directo:* cualquier servicio desde *S/ 10*.\n\n📲 Escríbenos el *paquete que deseas + el link* o elige:\n1️⃣ Ver Yape / Cuentas para Pagar\n2️⃣ Enviar Mi Link al Asesor\n3️⃣ Volver al Catálogo de Redes`,
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
      reply: `🎁 *Oferta Estrella: Asistente IA 24/7 + Sitio Web Profesional GRATIS*${greetingName}\n\nAl contratar tu *Asistente Virtual con IA 24/7* en *Digital MYK Lab*, te llevas tu *Sitio Web Profesional TOTALMENTE GRATIS* _(consultar condiciones para dominio/hosting externos)_:\n\n✅ *Asistente IA 24/7:* Respuesta en < 1 min, botones/números y registro en CRM\n✅ *Sitio Web PRO:* Despliegue moderno en *GitHub + Render*, SSL incluido y SEO Google\n✅ *Respaldo Total:* Infraestructura 99.9% Uptime y soporte 24/7/365\n\n💰 *Precio Promocional Todo Incluido:* *S/ 390* _(pago único de implementación)_\n\n👇 *Paso siguiente — toca un botón o escribe el número:*\n1️⃣ Contratar / Ver Cuentas de Pago\n2️⃣ Hablar con Asesor Directo\n3️⃣ Ver Todos los Servicios`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Cuentas / Yape" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" },
        { buttonId: "btn_services", buttonText: "💼 Ver Servicios" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_chatbot" || detectedService === "Chatbot IA 24/7") {
    return {
      reply: `🤖 *Chatbots & Automatización IA 24/7 — Digital MYK Lab*\n\nAutomatiza tu WhatsApp para atender y vender 24/7:\n\n✅ *Atención Inmediata (< 1 min):* Interactúa con botones y opciones por número\n✅ *Calificación & CRM Automático:* Registra clientes, servicio y etapa en tiempo real\n✅ *Agendamiento & Pagos:* Reconoce comprobantes (Yape, Plin, bancos) y coordina el cierre\n✅ *Despliegue en GitHub + Render* sin límites de chats\n\n💰 *Planes Accesibles (Pago único):*\n• *Plan Emprendedor IA 24/7:* *S/ 350*\n• *Plan Empresarial IA + CRM PRO:* *S/ 550*\n🎁 _Tip:_ Por *S/ 390* incluye también tu *Web Profesional GRATIS*.\n\n👇 *Paso siguiente — toca un botón o escribe el número:*\n1️⃣ Iniciar / Ver Medios de Pago\n2️⃣ Ver Oferta IA + Web (S/ 390)\n3️⃣ Consultar con Asesor Directo`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Cuentas / Yape" },
        { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_app" || detectedService === "App a la Medida") {
    return {
      reply: `📱 *Aplicaciones a la Medida — Digital MYK Lab*\n\nConstruimos la aplicación web o móvil que tu negocio necesita:\n\n✅ *Panel de Ventas y Reportes Diarios* en tiempo real\n✅ *Gestión de Productos, Pedidos, Catálogo, Inventario y Clientes*\n✅ *Arquitectura Segura, Rápida y Escalable* en *GitHub + Render*\n✅ *Asesoría Gratuita, Entrega Puntual y Soporte Continuo*\n\n💰 *Inversión Accesible:*\n• *App Gestión Comercial PRO:* *S/ 750*\n• *App Empresarial Multi-Usuario:* *S/ 1,250*\n\n👇 *Paso siguiente — toca un botón o escribe el número:*\n1️⃣ Iniciar / Ver Medios de Pago\n2️⃣ Ver Otros Servicios\n3️⃣ Hablar con Asesor Directo`,
      buttons: [
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_services", buttonText: "💼 Otros Servicios" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  if (action === "btn_web" || detectedService === "Web Profesional PRO") {
    return {
      reply: `🌐 *Web Profesional PRO — Digital MYK Lab*\n\nPáginas ultrarrápidas diseñadas para convertir visitas en clientes:\n\n✅ *Velocidad Cloud:* Despliegue moderno en *GitHub + Render*\n✅ *Máxima Seguridad:* Certificado SSL (candado 🔒) 100% incluido\n✅ *SEO de Alto Impacto:* Optimizada para posicionar en Google 📈\n✅ *Conversión Directa:* Conectada a tu WhatsApp + catálogo\n\n💰 *Precios Accesibles (Pago único):*\n• *Landing Page PRO:* *S/ 290*\n• *Web Corporativa / Catálogo PRO:* *S/ 450*\n_(Consultar adicional por dominio propio .com/.pe o hosting dedicado externo)_\n\n🔗 Oficial: https://digitalmyklab.onrender.com/\n\n👇 *Paso siguiente — toca un botón o escribe el número:*\n1️⃣ Ver Plan IA + Web GRATIS (S/ 390)\n2️⃣ Ver Cuentas / Pagar Ahora\n3️⃣ Hablar con Asesor Directo`,
      buttons: [
        { buttonId: "btn_combo", buttonText: "🎁 Plan IA + Web S/390" },
        { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" },
        { buttonId: "btn_advisor", buttonText: "👨‍💻 Asesor Directo" }
      ],
      stageOverride: "📄 Cotizado"
    };
  }

  // Default welcome / ordered step 1 for ANY incoming word
  const defaultNumberMap: SalesButtonOption[] = [
    { buttonId: "btn_tech", buttonText: "🤖 IA, Webs y Apps" },
    { buttonId: "btn_social", buttonText: "📈 Redes Sociales S/10" },
    { buttonId: "btn_combo", buttonText: "🎁 Oferta IA + Web" },
    { buttonId: "btn_pay", buttonText: "💳 Medios de Pago" }
  ];
  return {
    reply: `Hola${greetingName}, bienvenido a *Digital MYK Lab* — _Seguridad y Garantía_ 🛡️\n\nTe guiamos paso a paso para impulsar tu negocio:\n\n1️⃣ *Chatbots IA 24/7, Webs PRO y Apps* _(desde S/ 290 • GitHub + Render)_\n2️⃣ *Crecimiento Redes Sociales* _(desde S/ 10 • TikTok, IG, FB, YouTube)_\n3️⃣ *Oferta Estrella: Asistente IA + Web GRATIS* _(*S/ 390*)_\n4️⃣ *Medios de Pago Oficiales* _(Yape, Plin, BN, Scotiabank)_\n\n👇 *Toca un botón o responde con el número (1, 2, 3 o 4):*`,
    buttons: defaultNumberMap.slice(0, 3),
    numberMap: defaultNumberMap
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

// Core Engine for Line 2 (+51 929 327 654): Serious Corporate B2B Sales + Interactive Buttons/Numbers + Receipt OCR
async function processDigitalMykSalesMessage(
  phone: string,
  senderName: string,
  text: string,
  rawChatId?: string,
  altChatId?: string,
  mediaPayload?: { mediaBase64?: string; mediaMimeType?: string }
) {
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

  // Analyze incoming image/PDF payment receipt if attached (or text payment confirmation)
  let receiptInfo: ParsedReceiptInfo | null = null;
  if (mediaPayload?.mediaBase64 && mediaPayload?.mediaMimeType) {
    receiptInfo = await analyzePaymentReceiptWithGemini(mediaPayload.mediaBase64, mediaPayload.mediaMimeType, cleanText);
  }

  let buttonAction = detectSalesButtonAction(cleanText, session.lastMenuButtons);
  const hasAttachmentMarker = lowerText.includes("[comprobante") || lowerText.includes("imagen adjunta");
  const textPaymentMethod = detectPaymentMethodFromText(cleanText);
  if (
    receiptInfo?.isReceipt ||
    (hasAttachmentMarker && !receiptInfo && (textPaymentMethod !== null || existingLeadCheck?.status === "💳 Pago / Cierre" || existingLeadCheck?.status === "📄 Cotizado"))
  ) {
    buttonAction = "btn_voucher";
  }

  const structuredResponse = buildProButtonResponse(
    buttonAction,
    cleanText,
    session.name,
    detectedService,
    receiptInfo
  );

  let botReply = structuredResponse.reply;
  let replyButtons: SalesButtonOption[] = structuredResponse.buttons;
  let nextMenuButtons: SalesButtonOption[] = structuredResponse.numberMap || structuredResponse.buttons;
  let capturedLeadData: any = null;

  // Use Gemini for nuanced open-ended questions when NOT clicking a predefined button / short greeting
  const isNumericInput = /^(?:opci[oó]n\s*|#)?[1-5](?:️⃣|\.|°)?$/.test(lowerText);
  const isSimpleTrigger =
    !!buttonAction ||
    isNumericInput ||
    ["hola", "info", "informacion", "información", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "menu", "menú", "."].includes(lowerText) ||
    cleanText.length <= 8;

  if (!isSimpleTrigger) {
    const historyText = session.history
      .slice(-8)
      .map(h => `${h.sender === 'user' ? 'Cliente' : 'Asesor Digital MYK Lab'}: ${h.text}`)
      .join("\n");

    const salesPrompt = `Eres el Asesor Comercial Ejecutivo de "Digital MYK Lab" (Slogan: "Seguridad y Garantía | Innova. Automatiza. Convierte.").
Canal oficial WhatsApp: +51 929 327 654 | Web Oficial: https://digitalmyklab.onrender.com/ | Correo: compumasster@gmail.com
Desplegamos nuestros proyectos en infraestructura moderna *GitHub + Render* (con Certificado SSL incluido, alta velocidad y soporte continuo).

PORTAFOLIO OFICIAL Y PRECIOS ACCESIBLES (TONO 100% SERIO Y CORPORATIVO — NUNCA USES LA PALABRA "DEMO" NI MENCIONES MÁRGENES INTERNOS):
A) SOLUCIONES TECNOLÓGICAS (PAGO ÚNICO DE IMPLEMENTACIÓN EN SOLES):
1. Chatbots & Automatización IA 24/7:
   - Plan Emprendedor IA 24/7: *S/ 350* (atención < 1 min 24/7, botones/números interactivos, captura en CRM).
   - Plan Empresarial IA + CRM PRO: *S/ 550* (IA personalizada + agenda automática + tablero Kanban + lectura de comprobantes).
2. Páginas Web Profesionales PRO (GitHub + Render + SSL + SEO Google):
   - Landing Page PRO: *S/ 290*
   - Web Corporativa / Catálogo PRO: *S/ 450*
   _(Consultar adicional si desea dominio propio .com/.pe o servidor dedicado externo)_
3. Aplicaciones Web / Móviles a la Medida (Panel ventas, productos, pedidos, clientes y reportes):
   - App Gestión Comercial PRO: *S/ 750*
   - App Empresarial Multi-Usuario: *S/ 1,250*
4. Oferta Estrella — Asistente IA 24/7 + Sitio Web Profesional GRATIS: *S/ 390* _(al contratar tu Asistente IA te llevas tu Web Landing GRATIS; consultar dominio/hosting externos)_.

B) ${DIGITAL_MYK_SOCIAL_CATALOG}

CUENTAS OFICIALES PARA DEPÓSITOS (Titular: Maycol Castañeda):
- Yape: 929327654
- Plin: 921034349
- Banco de la Nación: Cuenta 04765342509 | CCI 018-765-004765342509-81
- Scotiabank (Cuenta Ahorro Soles): Cuenta 8330613655 | CCI 00972420833061365561

REGLAS ESTRICTAS:
1. Tono ejecutivo, serio, cercano y ordenado. Guía paso a paso (servicio -> precio claro -> cuenta de pago -> activación).
2. ${isFirstMessage ? 'Es el primer mensaje del cliente: preséntate brevemente.' : 'Ya respondiste anteriormente en este chat: NO incluyas encabezado de bienvenida ni repitas "Hola, bienvenido a Digital MYK Lab"; ve directo al punto.'}
3. Si preguntan precios de Chatbot, Web, App o IA+Web Gratis, da los precios exactos arriba indicados en Soles y resalta que incluye despliegue moderno en GitHub + Render con SSL.
4. Para Redes Sociales: enfatiza que desde S/ 10 pueden elegir paquete o armar un Pack Inicio combinando likes + vistas, y solicita el link del perfil o video.
5. Si indican que ya pagaron o mencionan Yape/Plin/BN/Scotiabank, confirma el método de pago detectado y pide su dato final para activar.
6. Al final de tu respuesta, incluye SIEMPRE estas 3 opciones numeradas exactas para que el cliente responda con botón o número:
   - Si trató sobre Redes Sociales:
     1️⃣ Armar Pack / Combo S/10
     2️⃣ Pagar con Yape / Plin
     3️⃣ Ver Otras Redes
   - Si trató sobre Chatbots, Web, Apps o Info general:
     1️⃣ Ver Medios de Pago (Yape / Plin / Bancos)
     2️⃣ Ver Oferta IA + Web Gratis (S/ 390)
     3️⃣ Hablar con Asesor Directo (Maycol)
7. Agrega al final en línea oculta:
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
      nextMenuButtons = replyButtons;
    }
  }

  // Save active menu options so numeric replies ("1", "2", "3", "4") match this exact step coherently
  session.lastMenuButtons = nextMenuButtons;

  // Push messages to session history first so full transcript is saved in CRM PRO
  const nowIso = new Date().toISOString();
  const userMessageSummary = receiptInfo?.isReceipt
    ? `${cleanText} [Método detectado: ${receiptInfo.paymentMethod}${receiptInfo.amount ? ` • S/ ${receiptInfo.amount}` : ""}]`
    : cleanText;

  session.history.push({ sender: 'user', text: userMessageSummary, timestamp: nowIso });
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
    { sender: 'user', text: userMessageSummary, timestamp: nowIso },
    { sender: 'bot', text: botReply, timestamp: nowIso, buttons: replyButtons }
  ].slice(-30);

  const leadPayload = {
    id: existingLead ? existingLead.id : `lead_${Date.now()}`,
    registrationDate: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    clientName: capturedLeadData?.clientName || session.name || existingLead?.clientName || "Prospecto WhatsApp",
    whatsapp: formattedPhone,
    serviceInterest: serviceToSave,
    businessType: businessToSave,
    lastMessage: userMessageSummary.slice(0, 140),
    status: statusToSave,
    estimatedValue:
      structuredResponse.estimatedValueOverride ||
      Number(capturedLeadData?.estimatedValue) ||
      existingLead?.estimatedValue ||
      getDefaultEstimatedValue(serviceToSave),
    paymentMethod:
      structuredResponse.paymentMethodOverride ||
      textPaymentMethod ||
      existingLead?.paymentMethod ||
      "Por definir",
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

  // Send out via Active Sales WhatsApp Provider (Default: Unlimited Baileys Engine, or Cloud API, or Green-API)
  // Show header ONLY on the 1st bot response; omit it completely from the 2nd response onward
  const messageHeader = isFirstMessage ? "Digital MYK Lab • Atención Comercial" : "";
  const messageFooter = isFirstMessage ? "Seguridad y Garantía • digitalmyklab.onrender.com" : "";

  const activeProvider = salesGreenApiConfig.provider || 'baileys';
  let greenApiSendStatus = "not_sent";

  if (activeProvider === 'baileys' && sessionKey.length >= 7) {
    const baileysSnap = getBaileysStatusSnapshot();
    if (baileysSnap.status === 'connected') {
      const targetJid =
        (rawChatId && rawChatId.includes("@") && !rawChatId.endsWith("@c.us"))
          ? rawChatId
          : (session.replyChatId && session.replyChatId.includes("@") && !session.replyChatId.endsWith("@c.us"))
            ? session.replyChatId
            : `${formattedPhone.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

      const dispatch = await sendBaileysSalesReply({
        targetJid,
        phone: formattedPhone,
        header: messageHeader,
        body: botReply,
        buttons: replyButtons,
        replyMode: salesGreenApiConfig.replyMode || 'poll_and_text'
      });
      greenApiSendStatus = dispatch.status;
      addGreenApiLog({
        type: dispatch.status === "sent_success" ? 'outgoing_send' : 'error',
        phone: dispatch.usedChatId.endsWith("@lid") ? `${formattedPhone} (LID)` : formattedPhone,
        sender: session.name,
        text: botReply.slice(0, 120) + (botReply.length > 120 ? "..." : ""),
        status: dispatch.status === "sent_success"
          ? (dispatch.mode === 'poll_and_text'
              ? '🟢 [Motor Directo] Texto + Encuesta Táctil Enviados (Sin Límites)'
              : '🟢 [Motor Directo] Respuesta Enviada (Sin Límites)')
          : `🔴 [Motor Directo] ${dispatch.errorDetail || dispatch.status}`,
        details: { chatId: dispatch.usedChatId, ...dispatch.data }
      }, 'sales');
    } else {
      addGreenApiLog({
        type: 'error',
        phone: formattedPhone,
        sender: session.name,
        status: '⚠️ Motor Directo WhatsApp desconectado: escanea el QR o vincula el código de 8 dígitos en CRM PRO'
      }, 'sales');
    }
  } else if (activeProvider === 'cloud_api' && sessionKey.length >= 7) {
    const phoneNumId = (salesGreenApiConfig.cloudPhoneNumberId || "").trim();
    const accessTok = (salesGreenApiConfig.cloudAccessToken || "").trim();
    if (phoneNumId && accessTok) {
      try {
        const cleanPhone = formattedPhone.replace(/[^0-9]/g, "");
        const headerPrefix = messageHeader ? `*${messageHeader}*\n\n` : "";
        const cloudButtons = replyButtons.slice(0, 3).map(b => ({
          type: "reply",
          reply: { id: b.buttonId.slice(0, 256), title: b.buttonText.slice(0, 20) }
        }));
        const useButtons = cloudButtons.length > 0 && salesGreenApiConfig.replyMode !== 'text_only';
        const cloudPayload = useButtons
          ? {
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "interactive",
              interactive: {
                type: "button",
                ...(messageHeader ? { header: { type: "text", text: messageHeader } } : {}),
                body: { text: botReply.slice(0, 1024) },
                ...(messageFooter ? { footer: { text: messageFooter.slice(0, 60) } } : {}),
                action: { buttons: cloudButtons }
              }
            }
          : {
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: `${headerPrefix}${botReply}` }
            };
        const cloudRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessTok}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(cloudPayload)
        });
        const cloudJson: any = await cloudRes.json().catch(() => ({}));
        greenApiSendStatus = cloudRes.ok ? "sent_success" : `error_${cloudRes.status}`;
        addGreenApiLog({
          type: cloudRes.ok ? 'outgoing_send' : 'error',
          phone: formattedPhone,
          sender: session.name,
          text: botReply.slice(0, 120) + (botReply.length > 120 ? "..." : ""),
          status: cloudRes.ok
            ? '🟢 [Meta Cloud API] Botones Oficiales Enviados'
            : `🔴 [Meta Cloud API] Error HTTP ${cloudRes.status}: ${cloudJson?.error?.message || 'Revisa credenciales'}`,
          details: cloudJson
        }, 'sales');
      } catch (cloudErr: any) {
        greenApiSendStatus = "network_error";
        addGreenApiLog({
          type: 'error',
          phone: formattedPhone,
          sender: session.name,
          status: '🔴 [Meta Cloud API] Error de Red',
          details: { message: cloudErr.message }
        }, 'sales');
      }
    } else {
      addGreenApiLog({
        type: 'error',
        phone: formattedPhone,
        sender: session.name,
        status: '⚠️ Falta Phone Number ID o Access Token de Meta Cloud API'
      }, 'sales');
    }
  } else if (activeProvider === 'green_api' && salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance && sessionKey.length >= 7) {
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
  } else if (activeProvider === 'green_api' && !salesGreenApiConfig.apiTokenInstance) {
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

// Endpoints: Sales WhatsApp Multi-Provider Config & Direct Unlimited Engine (Baileys + Cloud API + Green-API)
function getEffectiveSalesConfig(): GreenApiConfigState {
  const activeProvider = salesGreenApiConfig.provider || 'baileys';
  const baileysSnap = getBaileysStatusSnapshot();
  const computedStatus: 'connected' | 'disconnected' | 'testing' =
    activeProvider === 'baileys'
      ? (baileysSnap.status === 'connected' ? 'connected' : 'disconnected')
      : activeProvider === 'cloud_api'
        ? ((salesGreenApiConfig.cloudPhoneNumberId && salesGreenApiConfig.cloudAccessToken) ? 'connected' : 'disconnected')
        : ((salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) ? 'connected' : 'disconnected');
  return {
    ...salesGreenApiConfig,
    provider: activeProvider,
    status: computedStatus,
    connectedPhone: (activeProvider === 'baileys' && baileysSnap.connectedPhone)
      ? baileysSnap.connectedPhone
      : salesGreenApiConfig.connectedPhone
  };
}

app.get("/api/green-api/sales/config", (req, res) => {
  res.json(getEffectiveSalesConfig());
});

app.post("/api/green-api/sales/config", (req, res) => {
  const {
    idInstance,
    apiTokenInstance,
    apiUrl,
    connectedPhone,
    pollingEnabled,
    autoRespondAll,
    replyMode,
    provider,
    cloudPhoneNumberId,
    cloudAccessToken,
    cloudVerifyToken
  } = req.body;

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
  if (provider === 'baileys' || provider === 'cloud_api' || provider === 'green_api') {
    salesGreenApiConfig.provider = provider;
  }
  if (cloudPhoneNumberId !== undefined) {
    salesGreenApiConfig.cloudPhoneNumberId = String(cloudPhoneNumberId).trim();
  }
  if (cloudAccessToken !== undefined && String(cloudAccessToken).trim()) {
    salesGreenApiConfig.cloudAccessToken = String(cloudAccessToken).trim();
  }
  if (cloudVerifyToken !== undefined && String(cloudVerifyToken).trim()) {
    salesGreenApiConfig.cloudVerifyToken = String(cloudVerifyToken).trim();
  }

  salesGreenApiConfig.lastPing = new Date().toISOString();
  const effective = getEffectiveSalesConfig();
  salesGreenApiConfig.status = effective.status;

  saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);

  addGreenApiLog({
    type: 'diagnostic',
    status: `⚙️ Motor WhatsApp Guardado: ${salesGreenApiConfig.provider === 'baileys' ? 'Motor Directo Sin Límites' : salesGreenApiConfig.provider === 'cloud_api' ? 'Meta Cloud API Oficial' : 'Green-API'} (modo: ${salesGreenApiConfig.replyMode})`,
    details: { provider: salesGreenApiConfig.provider, replyMode: salesGreenApiConfig.replyMode }
  }, 'sales');

  if (salesGreenApiConfig.provider === 'green_api' && salesGreenApiConfig.idInstance && salesGreenApiConfig.apiTokenInstance) {
    runSalesGreenApiDrainBatch(10).catch(() => {});
  }

  res.json({ success: true, config: effective });
});

// Direct Unlimited Engine (Baileys) & Meta Cloud API Endpoints
app.get("/api/whatsapp/sales/status", (req, res) => {
  res.json({
    provider: salesGreenApiConfig.provider || 'baileys',
    baileys: getBaileysStatusSnapshot(),
    config: getEffectiveSalesConfig()
  });
});

app.post("/api/whatsapp/sales/connect", async (req, res) => {
  try {
    const { pairingPhone, forceReset } = req.body || {};
    salesGreenApiConfig.provider = 'baileys';
    saveStoredJsonConfig(SALES_GREEN_CONFIG_PATH, salesGreenApiConfig);

    const snap = await connectBaileysSales({
      pairingPhone: typeof pairingPhone === 'string' ? pairingPhone.trim() : undefined,
      forceResetAuth: !!forceReset
    });
    res.json({ success: true, baileys: snap, config: getEffectiveSalesConfig() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/whatsapp/sales/disconnect", async (req, res) => {
  try {
    const { clearAuth } = req.body || {};
    const snap = await disconnectBaileysSales(!!clearAuth);
    addGreenApiLog({
      type: 'diagnostic',
      status: clearAuth ? '🔌 Sesión WhatsApp eliminada para vincular otro número' : '⏸️ Motor Directo WhatsApp desconectado temporalmente'
    }, 'sales');
    res.json({ success: true, baileys: snap, config: getEffectiveSalesConfig() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/whatsapp/sales/export-auth", (req, res) => {
  const authBase64 = exportBaileysAuthBase64();
  if (!authBase64) {
    return res.status(404).json({ success: false, error: "Primero vincula tu WhatsApp escaneando el QR o con el código de 8 dígitos." });
  }
  res.json({ success: true, authBase64 });
});

app.post("/api/whatsapp/sales/send-message", async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || !message) {
      return res.status(400).json({ error: "phone y message son requeridos" });
    }
    const provider = salesGreenApiConfig.provider || 'baileys';
    if (provider === 'baileys') {
      const dispatch = await sendBaileysSalesReply({
        phone: `+${cleanPhone}`,
        header: "",
        body: String(message),
        buttons: [],
        replyMode: 'text_only'
      });
      const ok = dispatch.status === "sent_success";
      addGreenApiLog({
        type: ok ? 'outgoing_send' : 'error',
        phone: `+${cleanPhone}`,
        sender: 'Prueba Manual (Motor Directo)',
        text: String(message),
        status: ok ? '🟢 [Motor Directo] Prueba Enviada (Sin Límites)' : `🔴 ${dispatch.errorDetail || dispatch.status}`
      }, 'sales');
      return res.status(ok ? 200 : 400).json({ success: ok, ...dispatch });
    }
    if (provider === 'cloud_api') {
      const phoneNumId = (salesGreenApiConfig.cloudPhoneNumberId || "").trim();
      const accessTok = (salesGreenApiConfig.cloudAccessToken || "").trim();
      if (!phoneNumId || !accessTok) {
        return res.status(400).json({ error: "Configura primero Phone Number ID y Access Token de Meta Cloud API" });
      }
      const cloudRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessTok}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: String(message) }
        })
      });
      const data = await cloudRes.json().catch(() => ({}));
      addGreenApiLog({
        type: cloudRes.ok ? 'outgoing_send' : 'error',
        phone: `+${cleanPhone}`,
        sender: 'Prueba Manual (Meta Cloud API)',
        text: String(message),
        status: cloudRes.ok ? '🟢 [Meta Cloud API] Enviado' : `🔴 Error HTTP ${cloudRes.status}`,
        details: data
      }, 'sales');
      return res.status(cloudRes.ok ? 200 : cloudRes.status).json({ success: cloudRes.ok, data });
    }
    return res.status(400).json({ error: "Usa /api/green-api/sales/send-message para Green-API" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Meta WhatsApp Cloud API Verification & Webhook
app.get("/api/whatsapp/sales/cloud-webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = salesGreenApiConfig.cloudVerifyToken || "digitalmyklab_verify";
  if (mode === "subscribe" && token === expected) {
    return res.status(200).send(String(challenge || ""));
  }
  return res.sendStatus(403);
});

app.post("/api/whatsapp/sales/cloud-webhook", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    const contact = change?.contacts?.[0];
    if (msg && msg.from && !markAndCheckDuplicateGreenMessage(msg.id)) {
      const senderPhone = String(msg.from).replace(/[^0-9]/g, "");
      const senderName = contact?.profile?.name || "Prospecto WhatsApp";
      let textMessage = "";
      if (msg.type === "text") textMessage = msg.text?.body || "";
      else if (msg.type === "interactive") {
        textMessage = msg.interactive?.button_reply?.id || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.id || msg.interactive?.list_reply?.title || "";
      } else if (msg.type === "button") {
        textMessage = msg.button?.payload || msg.button?.text || "";
      } else {
        textMessage = "Hola";
      }
      if (!textMessage) textMessage = "Hola";
      addGreenApiLog({
        type: 'incoming_webhook',
        phone: `+${senderPhone}`,
        sender: senderName,
        text: textMessage,
        status: '📥 [Meta Cloud API] Mensaje Recibido'
      }, 'sales');
      await processDigitalMykSalesMessage(senderPhone, senderName, textMessage);
    }
    res.sendStatus(200);
  } catch (err: any) {
    console.warn("[Cloud API Webhook error]:", err?.message);
    res.sendStatus(200);
  }
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
  res.json({
    config: getEffectiveSalesConfig(),
    logs: salesGreenApiLogs,
    baileys: getBaileysStatusSnapshot()
  });
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
          const mediaPayload = await fetchGreenApiMediaPayload(messageData);
          const result = await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId, mediaPayload);
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
          const mediaPayload = isSalesInstance ? await fetchGreenApiMediaPayload(messageData) : undefined;
          const result = isSalesInstance
            ? await processDigitalMykSalesMessage(senderPhone, senderName, textMessage, rawSender, altChatId, mediaPayload)
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
    const { phone = "+51 944 888 111", senderName = "Prospecto", message = "Hola", mediaBase64, mediaMimeType } = req.body;
    const result = await processDigitalMykSalesMessage(
      phone,
      senderName,
      message,
      undefined,
      undefined,
      (mediaBase64 && mediaMimeType) ? { mediaBase64, mediaMimeType } : undefined
    );
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
    salesGreenApiConfig: getEffectiveSalesConfig()
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
    registerBaileysCallbacks(
      async (payload) => {
        if (markAndCheckDuplicateGreenMessage(payload.messageId)) return;
        addGreenApiLog({
          type: 'incoming_webhook',
          phone: payload.replyJid.endsWith("@lid") ? `+${payload.phone} (LID)` : `+${payload.phone}`,
          sender: payload.senderName,
          text: payload.mediaBase64 ? `${payload.text} (Archivo adjunto)` : payload.text,
          status: '📥 [Motor Directo] Mensaje Recibido (Sin Límites)'
        }, 'sales');
        await processDigitalMykSalesMessage(
          payload.phone,
          payload.senderName,
          payload.text,
          payload.replyJid,
          undefined,
          (payload.mediaBase64 && payload.mediaMimeType)
            ? { mediaBase64: payload.mediaBase64, mediaMimeType: payload.mediaMimeType }
            : undefined
        );
      },
      (entry) => {
        addGreenApiLog(entry, 'sales');
      }
    );

    const restored = restoreBaileysAuthFromEnv();
    const snap = getBaileysStatusSnapshot();
    if ((restored || snap.hasSavedSession) && (salesGreenApiConfig.provider || 'baileys') === 'baileys') {
      console.log("[Baileys Sales Engine] Auto-resuming saved WhatsApp session...");
      connectBaileysSales().catch((e) => console.warn("[Baileys Auto-Resume Warning]:", e?.message));
    }
  });
}

startServer();
