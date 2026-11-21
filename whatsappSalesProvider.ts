import fs from "fs";
import path from "path";

export interface BaileysButtonOption {
  buttonId: string;
  buttonText: string;
}

export interface BaileysStatusSnapshot {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'pairing_ready' | 'connected' | 'error';
  qrDataUrl?: string;
  pairingCode?: string;
  connectedPhone?: string;
  connectedJid?: string;
  connectedName?: string;
  lastError?: string;
  hasSavedSession: boolean;
  updatedAt: string;
}

export interface BaileysIncomingPayload {
  phone: string;
  senderName: string;
  text: string;
  replyJid: string;
  messageId: string;
  rawType: string;
  mediaBase64?: string;
  mediaMimeType?: string;
}

type IncomingHandler = (payload: BaileysIncomingPayload) => Promise<void>;
type LogHandler = (entry: {
  type: 'incoming_webhook' | 'outgoing_send' | 'error' | 'diagnostic';
  phone?: string;
  sender?: string;
  text?: string;
  status: string;
  details?: any;
}) => void;

const AUTH_DIR = path.join(process.cwd(), "baileys_sales_auth");
const sentMessageStore = new Map<string, any>();

let activeSock: any = null;
let isStarting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let incomingHandler: IncomingHandler | null = null;
let logHandler: LogHandler | null = null;

let snapshot: BaileysStatusSnapshot = {
  status: "disconnected",
  hasSavedSession: false,
  updatedAt: new Date().toISOString()
};

function updateSnapshot(patch: Partial<BaileysStatusSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
    hasSavedSession: fs.existsSync(path.join(AUTH_DIR, "creds.json")),
    updatedAt: new Date().toISOString()
  };
}

function storeSentMessage(msg: any) {
  const id = msg?.key?.id;
  if (!id) return;
  sentMessageStore.set(id, msg);
  if (sentMessageStore.size > 500) {
    const oldestKey = sentMessageStore.keys().next().value;
    if (oldestKey) sentMessageStore.delete(oldestKey);
  }
}

export function restoreBaileysAuthFromEnv(): boolean {
  try {
    const credsFile = path.join(AUTH_DIR, "creds.json");
    if (fs.existsSync(credsFile)) return true;

    const rawB64 = (process.env.SALES_WA_AUTH_B64 || "").trim();
    if (!rawB64) return false;

    const decoded = Buffer.from(rawB64, "base64").toString("utf-8");
    const filesObj = JSON.parse(decoded) as Record<string, string>;
    if (!filesObj || typeof filesObj !== "object" || !filesObj["creds.json"]) {
      return false;
    }

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    for (const [name, content] of Object.entries(filesObj)) {
      const safeName = path.basename(name);
      if (safeName.endsWith(".json") && typeof content === "string") {
        fs.writeFileSync(path.join(AUTH_DIR, safeName), content, "utf-8");
      }
    }
    updateSnapshot({});
    return true;
  } catch (err: any) {
    console.warn("[Baileys Auth Env Restore Error]:", err?.message || err);
    return false;
  }
}

export function exportBaileysAuthBase64(): string | null {
  try {
    if (!fs.existsSync(path.join(AUTH_DIR, "creds.json"))) return null;
    const files = fs.readdirSync(AUTH_DIR).filter(f => f.endsWith(".json"));
    const bundle: Record<string, string> = {};
    for (const file of files) {
      bundle[file] = fs.readFileSync(path.join(AUTH_DIR, file), "utf-8");
    }
    return Buffer.from(JSON.stringify(bundle), "utf-8").toString("base64");
  } catch {
    return null;
  }
}

export function getBaileysStatusSnapshot(): BaileysStatusSnapshot {
  updateSnapshot({});
  return snapshot;
}

export function registerBaileysCallbacks(
  onIncoming: IncomingHandler,
  onLog: LogHandler
) {
  incomingHandler = onIncoming;
  logHandler = onLog;
}

function isIgnorableBaileysJid(jid: string | undefined | null): boolean {
  if (!jid) return true;
  const lower = jid.toLowerCase();
  return (
    lower.endsWith("@g.us") ||
    lower === "status@broadcast" ||
    lower.endsWith("@broadcast") ||
    lower.endsWith("@newsletter")
  );
}

function extractPhoneDigitsFromBaileysKey(key: any): string {
  const candidates = [
    key?.remoteJidAlt,
    key?.participantAlt,
    key?.senderPn,
    key?.participant,
    key?.remoteJid
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  for (const cand of candidates) {
    if (cand.includes("@s.whatsapp.net") || cand.includes("@c.us")) {
      const digits = cand.replace(/@.*$/, "").replace(/:.*$/, "").replace(/[^0-9]/g, "");
      if (digits.length >= 7) return digits;
    }
  }
  const fallback = String(key?.remoteJid || "").replace(/@.*$/, "").replace(/:.*$/, "").replace(/[^0-9]/g, "");
  return fallback;
}

export async function connectBaileysSales(options?: {
  pairingPhone?: string;
  forceResetAuth?: boolean;
}): Promise<BaileysStatusSnapshot> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (options?.forceResetAuth) {
    await disconnectBaileysSales(true);
  }

  if (isStarting) {
    return getBaileysStatusSnapshot();
  }

  if (activeSock && snapshot.status === "connected" && !options?.pairingPhone) {
    return getBaileysStatusSnapshot();
  }

  isStarting = true;
  try {
    if (activeSock) {
      try {
        activeSock.ev.removeAllListeners("connection.update");
        activeSock.ev.removeAllListeners("messages.upsert");
        activeSock.ev.removeAllListeners("creds.update");
        activeSock.end(undefined);
      } catch {}
      activeSock = null;
    }

    restoreBaileysAuthFromEnv();
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    updateSnapshot({
      status: "connecting",
      qrDataUrl: undefined,
      pairingCode: undefined,
      lastError: undefined
    });

    const baileysMod = await import("@whiskeysockets/baileys");
    const makeWASocket = baileysMod.makeWASocket || baileysMod.default;
    const {
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
      DisconnectReason,
      Browsers,
      extractMessageContent,
      getContentType,
      decryptPollVote,
      getAggregateVotesInPollMessage,
      downloadMediaMessage
    } = baileysMod;

    const QRCode = (await import("qrcode")).default;
    const pino = (await import("pino")).default;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let waVersion: [number, number, number] = [2, 3000, 1027934701];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (Array.isArray(latest?.version) && latest.version.length === 3) {
        waVersion = latest.version as [number, number, number];
      }
    } catch {}

    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      logger: pino({ level: "silent" }) as any,
      browser: Browsers.ubuntu("Digital MYK Lab"),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 45000,
      defaultQueryTimeoutMs: 45000,
      keepAliveIntervalMs: 25000,
      getMessage: async (key: any) => {
        const stored = key?.id ? sentMessageStore.get(key.id) : undefined;
        return stored?.message || undefined;
      }
    });

    activeSock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !options?.pairingPhone) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          updateSnapshot({
            status: "qr_ready",
            qrDataUrl,
            pairingCode: undefined,
            lastError: undefined
          });
        } catch (qrErr: any) {
          updateSnapshot({ status: "error", lastError: qrErr?.message || "Error generando QR" });
        }
      }

      if (connection === "open") {
        reconnectAttempts = 0;
        const rawUserId = sock.user?.id || "";
        const cleanDigits = rawUserId.replace(/@.*$/, "").replace(/:.*$/, "").replace(/[^0-9]/g, "");
        updateSnapshot({
          status: "connected",
          qrDataUrl: undefined,
          pairingCode: undefined,
          connectedJid: rawUserId,
          connectedPhone: cleanDigits ? `+${cleanDigits}` : snapshot.connectedPhone,
          connectedName: sock.user?.name || "Digital MYK Lab",
          lastError: undefined
        });

        logHandler?.({
          type: "diagnostic",
          phone: cleanDigits ? `+${cleanDigits}` : undefined,
          status: "🟢 Motor Directo WhatsApp CONECTADO (Sin límites de números nuevos)"
        });
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ??
          lastDisconnect?.error?.statusCode;
        const reasonMsg = lastDisconnect?.error?.message || `Desconectado (${statusCode || "desconocido"})`;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        if (isLoggedOut) {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          activeSock = null;
          updateSnapshot({
            status: "disconnected",
            qrDataUrl: undefined,
            pairingCode: undefined,
            connectedJid: undefined,
            lastError: "Sesión cerrada desde el teléfono. Vuelve a escanear el QR o generar un código."
          });
          logHandler?.({
            type: "error",
            status: "🔴 Sesión WhatsApp cerrada desde el celular. Vincula nuevamente."
          });
          return;
        }

        // Auto-reconnect on transient disconnect or restartRequired (515 after QR scan)
        if (activeSock === sock) {
          reconnectAttempts += 1;
          const delayMs = statusCode === DisconnectReason.restartRequired ? 800 : Math.min(15000, 2000 * reconnectAttempts);
          updateSnapshot({
            status: "connecting",
            lastError: reconnectAttempts > 2 ? reasonMsg : undefined
          });
          reconnectTimer = setTimeout(() => {
            connectBaileysSales().catch(() => {});
          }, delayMs);
        }
      }
    });

    // If user requested 8-digit pairing code (link by phone number instead of QR)
    const cleanPairDigits = (options?.pairingPhone || "").replace(/[^0-9]/g, "");
    if (cleanPairDigits.length >= 8 && !state.creds.registered) {
      setTimeout(async () => {
        try {
          if (activeSock === sock) {
            const rawCode = await sock.requestPairingCode(cleanPairDigits);
            const formattedCode = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
            updateSnapshot({
              status: "pairing_ready",
              pairingCode: formattedCode,
              qrDataUrl: undefined,
              lastError: undefined
            });
          }
        } catch (pairErr: any) {
          updateSnapshot({
            status: "error",
            lastError: pairErr?.message || "No se pudo solicitar el código de emparejamiento"
          });
        }
      }, 1500);
    }

    // Real-time incoming message listener (handles ALL new numbers, @lid, polls, buttons, audio, images)
    sock.ev.on("messages.upsert", async (upsert: any) => {
      try {
        if (upsert.type !== "notify" && upsert.type !== "append") return;
        const msgs = Array.isArray(upsert.messages) ? upsert.messages : [];

        for (const msg of msgs) {
          if (!msg?.key || msg.key.fromMe) continue;
          const replyJid = msg.key.remoteJid;
          if (isIgnorableBaileysJid(replyJid)) continue;

          // Skip old messages replayed on connect (> 2 minutes old on 'append')
          const msgTsSec = Number(msg.messageTimestamp || 0);
          if (upsert.type === "append" && msgTsSec > 0 && (Date.now() / 1000 - msgTsSec) > 120) {
            continue;
          }

          if (!msg.message) continue;
          const content = extractMessageContent(msg.message) || msg.message;
          const contentType = getContentType(content);
          if (!contentType) continue;

          // Ignore system/protocol/reaction/delete events
          if (
            contentType === "protocolMessage" ||
            contentType === "reactionMessage" ||
            contentType === "senderKeyDistributionMessage" ||
            contentType === "messageContextInfo"
          ) {
            continue;
          }

          let textMessage = "";

          if (contentType === "conversation") {
            textMessage = String(content.conversation || "").trim();
          } else if (contentType === "extendedTextMessage") {
            textMessage = String(content.extendedTextMessage?.text || "").trim();
          } else if (contentType === "buttonsResponseMessage") {
            textMessage =
              content.buttonsResponseMessage?.selectedButtonId ||
              content.buttonsResponseMessage?.selectedDisplayText ||
              "";
          } else if (contentType === "templateButtonReplyMessage") {
            textMessage =
              content.templateButtonReplyMessage?.selectedId ||
              content.templateButtonReplyMessage?.selectedDisplayText ||
              "";
          } else if (contentType === "listResponseMessage") {
            textMessage =
              content.listResponseMessage?.singleSelectReply?.selectedRowId ||
              content.listResponseMessage?.title ||
              "";
          } else if (contentType === "interactiveResponseMessage") {
            const native = content.interactiveResponseMessage?.nativeFlowResponseMessage;
            if (native?.paramsJson) {
              try {
                const parsed = JSON.parse(native.paramsJson);
                textMessage = parsed.id || parsed.selectedId || native.name || "";
              } catch {
                textMessage = content.interactiveResponseMessage?.body?.text || "";
              }
            } else {
              textMessage = content.interactiveResponseMessage?.body?.text || "";
            }
          } else if (contentType === "pollUpdateMessage") {
            try {
              const pollCreationKey = content.pollUpdateMessage?.pollCreationMessageKey;
              const creationMsg = pollCreationKey?.id ? sentMessageStore.get(pollCreationKey.id) : undefined;
              if (creationMsg?.message && content.pollUpdateMessage?.vote) {
                const creationContent = extractMessageContent(creationMsg.message) || creationMsg.message;
                const pollEncKey = creationMsg.message?.messageContextInfo?.messageSecret;
                if (pollEncKey) {
                  const decrypted = decryptPollVote(content.pollUpdateMessage.vote, {
                    pollCreatorJid: pollCreationKey.participant || sock.user?.id || "",
                    pollMsgId: pollCreationKey.id,
                    pollEncKey,
                    voterJid: replyJid
                  });
                  const selectedHashes = decrypted?.selectedOptions || [];
                  if (selectedHashes.length > 0 && typeof getAggregateVotesInPollMessage === "function") {
                    const agg = getAggregateVotesInPollMessage({
                      message: creationContent,
                      pollUpdates: [{ pollUpdateMessageKey: msg.key, vote: decrypted }]
                    });
                    const chosen = agg.find((a: any) => Array.isArray(a.voters) && a.voters.length > 0);
                    if (chosen?.name) textMessage = chosen.name;
                  }
                }
              }
            } catch (pollErr: any) {
              console.warn("[Baileys Poll Decrypt Note]:", pollErr?.message || pollErr);
            }
            if (!textMessage) textMessage = "Hola";
          } else if (contentType === "imageMessage" || contentType === "documentMessage") {
            const cap = content[contentType]?.caption || "";
            textMessage = cap.trim() ? `${cap.trim()} [Comprobante Adjunto]` : "[Comprobante / Imagen adjunta]";
          } else if (contentType === "videoMessage") {
            const cap = content.videoMessage?.caption || "";
            textMessage = cap.trim() || "Hola";
          } else {
            // Audio, sticker, location, contact, etc. -> immediate greeting reply
            textMessage = "Hola";
          }

          if (!textMessage) textMessage = "Hola";

          let mediaBase64: string | undefined;
          let mediaMimeType: string | undefined;
          if (contentType === "imageMessage" || contentType === "documentMessage") {
            try {
              const rawMime = String(content[contentType]?.mimetype || (contentType === "imageMessage" ? "image/jpeg" : "application/pdf"));
              if (rawMime.startsWith("image/") || rawMime === "application/pdf") {
                const buf = await downloadMediaMessage(
                  msg,
                  "buffer",
                  {},
                  {
                    logger: pino({ level: "silent" }) as any,
                    reuploadRequest: sock.updateMediaMessage
                  }
                );
                if (Buffer.isBuffer(buf) && buf.length > 0 && buf.length <= 6 * 1024 * 1024) {
                  mediaBase64 = buf.toString("base64");
                  mediaMimeType = rawMime;
                }
              }
            } catch (mediaErr: any) {
              console.warn("[Baileys Media Download Note]:", mediaErr?.message || mediaErr);
            }
          }

          const phoneDigits = extractPhoneDigitsFromBaileysKey(msg.key);
          if (!phoneDigits || phoneDigits.length < 7) continue;

          const senderName = msg.pushName || "Prospecto WhatsApp";
          await incomingHandler?.({
            phone: phoneDigits,
            senderName,
            text: textMessage,
            replyJid,
            messageId: msg.key.id || `bl_${Date.now()}_${phoneDigits}`,
            rawType: contentType,
            mediaBase64,
            mediaMimeType
          });
        }
      } catch (upsertErr: any) {
        console.warn("[Baileys messages.upsert error]:", upsertErr?.message || upsertErr);
      }
    });

    return getBaileysStatusSnapshot();
  } catch (err: any) {
    console.error("[Baileys Connect Error]:", err);
    updateSnapshot({
      status: "error",
      lastError: err?.message || "No se pudo iniciar el Motor Directo WhatsApp"
    });
    return getBaileysStatusSnapshot();
  } finally {
    isStarting = false;
  }
}

export async function disconnectBaileysSales(clearAuth = false): Promise<BaileysStatusSnapshot> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (activeSock) {
    try {
      if (clearAuth && typeof activeSock.logout === "function") {
        await activeSock.logout().catch(() => {});
      }
      activeSock.end(undefined);
    } catch {}
    activeSock = null;
  }
  if (clearAuth) {
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
  }
  updateSnapshot({
    status: "disconnected",
    qrDataUrl: undefined,
    pairingCode: undefined,
    lastError: undefined
  });
  return getBaileysStatusSnapshot();
}

export async function sendBaileysSalesReply(params: {
  targetJid?: string;
  phone: string;
  header: string;
  body: string;
  buttons: BaileysButtonOption[];
  replyMode: 'poll_and_text' | 'interactive' | 'text_only';
}): Promise<{
  status: string;
  mode: 'poll_and_text' | 'text_fallback';
  usedChatId: string;
  data?: any;
  errorDetail?: string;
}> {
  const cleanDigits = params.phone.replace(/[^0-9]/g, "");
  const targetJid =
    params.targetJid && params.targetJid.includes("@")
      ? params.targetJid
      : `${cleanDigits}@s.whatsapp.net`;

  if (!activeSock || snapshot.status !== "connected") {
    return {
      status: "error_disconnected",
      mode: "text_fallback",
      usedChatId: targetJid,
      errorDetail: "El Motor Directo WhatsApp aún no está conectado (escanea el QR o ingresa el código de 8 dígitos)."
    };
  }

  const cleanHeader = (params.header || "").trim().slice(0, 60);
  const headerPrefix = cleanHeader ? `*${cleanHeader}*\n\n` : "";
  const cleanButtons = (params.buttons || []).slice(0, 3);

  try {
    const alreadyHasNumberedMenu = params.body.includes("1️⃣");
    if (params.replyMode === "text_only" || cleanButtons.length === 0) {
      const buttonsText = (cleanButtons.length > 0 && !alreadyHasNumberedMenu)
        ? `\n\n📌 *Opciones rápidas (responde con el texto o número):*\n${cleanButtons.map((b, i) => `${i + 1}️⃣ ${b.buttonText}`).join("\n")}`
        : "";
      const sentText = await activeSock.sendMessage(targetJid, {
        text: `${headerPrefix}${params.body}${buttonsText}`
      });
      storeSentMessage(sentText);
      return {
        status: "sent_success",
        mode: "text_fallback",
        usedChatId: targetJid,
        data: { textId: sentText?.key?.id }
      };
    }

    // Send guaranteed clean formatted text first
    const sentText = await activeSock.sendMessage(targetJid, {
      text: `${headerPrefix}${params.body}`
    });
    storeSentMessage(sentText);

    // Send native clickable Poll immediately after (no third-party paywall!)
    try {
      const sentPoll = await activeSock.sendMessage(targetJid, {
        poll: {
          name: "👇 Toca una opción rápida para responder:",
          values: cleanButtons.map(b => b.buttonText),
          selectableCount: 1
        }
      });
      storeSentMessage(sentPoll);
      return {
        status: "sent_success",
        mode: "poll_and_text",
        usedChatId: targetJid,
        data: { textId: sentText?.key?.id, pollId: sentPoll?.key?.id }
      };
    } catch (pollErr: any) {
      console.warn("[Baileys Poll non-fatal warning]:", pollErr?.message || pollErr);
      return {
        status: "sent_success",
        mode: "text_fallback",
        usedChatId: targetJid,
        data: { textId: sentText?.key?.id, pollWarning: pollErr?.message }
      };
    }
  } catch (sendErr: any) {
    return {
      status: "error_baileys_send",
      mode: "text_fallback",
      usedChatId: targetJid,
      errorDetail: sendErr?.message || "Error al enviar mensaje vía Motor Directo WhatsApp"
    };
  }
}
