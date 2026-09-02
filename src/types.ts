export type ChannelType = 
  | 'whatsapp' 
  | 'instagram' 
  | 'messenger' 
  | 'telegram' 
  | 'tiktok' 
  | 'webchat' 
  | 'email' 
  | 'sms';

export interface ChannelConfig {
  id: string;
  name: string;
  type: ChannelType;
  handleOrPhone: string;
  status: 'connected' | 'disconnected' | 'pending';
  botEnabled: boolean;
  messagesCount: number;
  lastActive: string;
  color: string;
  avatarBg: string;
  webhookUrl: string;
  accountName: string;
}

export type MessageSender = 'customer' | 'agent' | 'bot' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type SentimentType = 'positivo' | 'neutral' | 'negativo' | 'urgente';

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  status: MessageStatus;
  isPrivateNote?: boolean;
  authorName?: string;
  aiGenerated?: boolean;
  mediaType?: 'image' | 'audio' | 'document';
  mediaUrl?: string;
  mediaName?: string;
}

export type DealStage = 
  | 'Prospecto' 
  | 'Calificado' 
  | 'Propuesta' 
  | 'Negociación' 
  | 'Cerrado Ganado' 
  | 'Soporte';

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'snoozed';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface Conversation {
  id: string;
  channel: ChannelType;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  contactHandleOrPhone: string;
  contactEmail?: string;
  contactCompany?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: ConversationStatus;
  priority: PriorityLevel;
  assignedAgent: string;
  tags: string[];
  botActive: boolean;
  sentiment: SentimentType;
  leadScore: number;
  dealStage: DealStage;
  dealValue: number;
  summary?: string;
  notes?: string;
  messages: Message[];
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  handle: string;
  company: string;
  channel: ChannelType;
  tags: string[];
  stage: DealStage;
  dealValue: number;
  leadScore: number;
  notes: string;
  createdAt: string;
  lastInteraction: string;
  customFields?: Record<string, string>;
}

export interface AutomationRule {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  channel: ChannelType | 'all';
  trigger: 'keyword' | 'new_conversation' | 'offline_hours' | 'sentiment_negative' | 'vip_client';
  triggerValue?: string;
  action: 'send_template' | 'trigger_ai_bot' | 'assign_agent' | 'add_tag' | 'move_crm_stage' | 'webhook_zapier';
  actionPayload: string;
  executionsCount: number;
}

export interface BotSettings {
  enabled: boolean;
  botName: string;
  systemPrompt: string;
  knowledgeBase: string;
  handoffKeywords: string[];
  autoQualify: boolean;
  tone: string;
  responseDelaySeconds: number;
  autoAnalyzeLead: boolean;
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
}

export interface DentalAppointment {
  id: string;
  registrationDate: string;
  patientName: string;
  whatsapp: string;
  treatment: string;
  requestedDateTime: string;
  status: '🟢 Nueva Cita' | '🟡 Confirmado' | '🔵 Atendido';
  notes?: string;
}

export interface BeautyAppointment {
  id: string;
  date: string;
  clientName: string;
  whatsapp: string;
  service: string;
  amount: number;
  dateTimeRequested: string;
  status: 'Por Confirmar' | 'En Atención' | 'Finalizado / Pagado';
  stylist?: string;
  notes?: string;
}

export interface GreenApiConfig {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string;
  webhookUrl: string;
  connectedPhone: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastPing?: string;
}

export interface QuickLeadScenario {
  id: string;
  title: string;
  channel: ChannelType;
  senderName: string;
  senderPhone: string;
  avatar: string;
  message: string;
  category: string;
}

export type DemoType = 'none' | 'menu' | 'dental' | 'beauty';

export interface DemoSessionState {
  chatId: string;
  phone: string;
  name: string;
  currentDemo: DemoType;
  dentalStep?: 'treatment_select' | 'patient_info' | 'completed';
  selectedTreatment?: string;
  patientInfo?: {
    name?: string;
    dateTime?: string;
  };
  lastMessageTime: string;
}
